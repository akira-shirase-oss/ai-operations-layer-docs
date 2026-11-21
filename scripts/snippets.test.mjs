// The snippets engine's own tests — the same cases that guard the collector's promise: ids, keys,
// times and hashes normalise away, and a real difference still fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalise, matches, runnable, coverage, fences, shownBase, EXAMPLE_BASE } from './snippets.mjs';

test('the example domain becomes the stack under test', () => {
	assert.equal(runnable('curl -i $BASE/healthz'), 'curl -i $BASE/healthz');
	const code = runnable(`curl -i -H "Authorization: Bearer $AIOPS_TOKEN" ${EXAMPLE_BASE}/v1/projects`);
	assert.match(code, /https?:\/\/127\.0\.0\.1:\d+\/v1\/projects/);
});

test('local shown addresses become the band under test', () => {
	const code = runnable('curl -s http://127.0.0.1:57400/readyz');
	assert.equal(code, 'curl -s http://127.0.0.1:57400/readyz');
	const banded = runnable('AIOPS_LISTEN=127.0.0.1:57400 aiops-server serve', 'http://127.0.0.1:58540');
	assert.match(banded, /58540/);
	assert.doesNotMatch(banded, /57400/);
	// And the database URL a block shows maps to --db, untouched by the collector's remap.
	const withDb = runnable('export AIOPS_DATABASE_URL=postgres://aiops:aiops-dev@127.0.0.1:57432/aiops', 'http://127.0.0.1:58540', 'postgres://aiops:aiops-dev@127.0.0.1:58532/aiops');
	assert.match(withDb, /58532/);
	assert.doesNotMatch(withDb, /57432/);
	assert.doesNotMatch(withDb, /57400|58540/, 'the postgres port is not the collector\u2019s');
});

test('an event id, an ingest key and a timestamp all normalise', () => {
	const a = normalise('{"accepted":1,"event_id":"4bf92f3577b34da6a3ce929d0e0e4736","event_time":"2026-11-17T10:00:00.123456Z"}');
	const b = normalise('{"accepted":1,"event_id":"9f2c1a4b7e8d0a3b6c5d4e3f2a1b0c9d","event_time":"2026-11-17T10:00:01.000000Z"}');
	assert.equal(a, b, 'random ids and times normalise to the same shape');
	const c = normalise('{"accepted":2,"event_id":"4bf92f3577b34da6a3ce929d0e0e4736","event_time":"2026-11-17T10:00:00.123456Z"}');
	assert.notEqual(a, c, 'a real difference in accepted count still fails');
});

test('ingest keys and API tokens normalise', () => {
	assert.equal(normalise('aiops_ik_' + 'a'.repeat(43)), 'aiops_ik_<key>');
	assert.equal(normalise('aiops_tk_' + 'Z9_-'.repeat(11).slice(0, 43)), 'aiops_tk_<token>');
});

test('JSON bodies compare by value, not by formatting', () => {
	// The same body pretty-printed or on one line is the same body.
	assert.equal(normalise('{"a":{"x":[2,3]},"b":1}'), normalise('{\n  "a": {\n    "x": [2, 3]\n  },\n  "b": 1\n}'));
	// A real difference still fails.
	assert.notEqual(normalise('{"v":45}'), normalise('{"v":46}'));
});

test('curl -i heads compare with dates stripped', () => {
	const one = normalise('HTTP/1.1 200 OK\ndate: Mon, 17 Nov 2026 10:00:00 GMT\ncontent-length: 12\n\n{"ready":true}');
	const two = normalise('HTTP/1.1 200 OK\ndate: Tue, 18 Nov 2026 10:00:01 GMT\ncontent-length: 99\n\n{"ready":true}');
	assert.equal(one, two);
});

test('match=lines accepts a stream whose order differs', () => {
	const expect = { code: 'event one\nevent two', info: 'match=lines' };
	assert.ok(matches('event two\nevent one\nevent three', expect), 'shown lines all arrived, in any order');
	assert.ok(!matches('event one', expect), 'a shown line that never arrived still fails');
});

test('coverage counts every block kind and flags the unmarked', () => {
	const page = `\`\`\`sh run=quickstart\ncurl example\n\`\`\`\n\`\`\`json output=quickstart\n{}\n\`\`\`\n\`\`\`text not-run="a systemd unit"\n[Unit]\n\`\`\`\n\`\`\`python\nprint("oops")\n\`\`\``;
	// The unit test can't inject a page; instead prove the fence reader sees all four blocks and
	// their kinds via the exported fence iterator used by coverage().
	const kinds = fences(page).map((m) => (m[4].includes('not-run') ? 'not-run' : m[4].match(/(?:^|\s)run=/) ? 'run' : m[4].includes('output=') ? 'output' : 'unmarked'));
	assert.deepEqual(kinds, ['run', 'output', 'not-run', 'unmarked']);
});

test('a code fence inside indented markdown is still a block, not prose', () => {
	const page = `1. Step\n\n   \`\`\`sh run=cli\n   aiops-server migrate\n   \`\`\``;
	assert.equal(fences(page).length, 1);
});

test('shownBase picks the address a page pretends to use', () => {
	assert.equal(shownBase('src/content/docs/quick-start.mdx'), 'http://127.0.0.1:57400');
	assert.equal(shownBase('src/content/docs/self-hosting/configuration.mdx'), 'http://127.0.0.1:57400');
	assert.equal(shownBase('src/content/docs/api/index.mdx'), EXAMPLE_BASE);
});

test('a missing product checkout fails with a clear message on CI, not a clone behind the cache', () => {
	// CI checks the product out before rust-cache; if the dir is absent there, the step never
	// ran — say so. Locally the runner still clones. The spawn's timeout bounds a red run that
	// would otherwise try the network.
	const work = join(mkdtempSync(join(tmpdir(), 'snippets-')), 'work');
	const result = spawnSync(process.execPath, [fileURLToPath(new URL('./snippets.mjs', import.meta.url)), '--cwd', work], {
		env: { ...process.env, GITHUB_ACTIONS: 'true' },
		encoding: 'utf8',
		timeout: 20_000,
	});
	assert.equal(result.status, 1, `expected exit 1, got ${result.status}: ${result.stderr.slice(0, 200)}`);
	assert.match(result.stderr, /ai-operations-layer.*missing|missing.*ai-operations-layer/, 'names the missing checkout');
	assert.match(result.stderr, /check out|checkout/i, 'says what should have provided it');
});
