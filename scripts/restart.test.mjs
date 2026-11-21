// restart.sh's port guard: a test script may only stop processes it started. A foreign listener
// on the suite port — say a maintainer's own collector, which shares the product's default port —
// is refused with a named message and left alive; a stale serve proved suite-owned — its running
// executable is the checkout's binary, or argv[0] is — is freed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const RESTART = fileURLToPath(new URL('../snippets/restart.sh', import.meta.url));

/** A port nothing listens on. */
const freePort = () =>
	new Promise((resolve, reject) => {
		const probe = net.createServer();
		probe.once('error', reject);
		probe.listen(0, '127.0.0.1', () => {
			const { port } = probe.address();
			probe.close(() => resolve(port));
		});
	});

/** Wait until a spawned listener actually holds the port. */
const waitForListen = async (port, tries = 50) => {
	for (let i = 0; i < tries; i++) {
		const up = await new Promise((resolve) => {
			const socket = net.connect(port, '127.0.0.1');
			socket.once('connect', () => {
				socket.end();
				resolve(true);
			});
			socket.once('error', () => resolve(false));
		});
		if (up) return;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error(`nothing ever listened on ${port}`);
};

const alive = (pid) => {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
};

/** A scratch SNIPPET_HOME: the script's cwd is its ai-operations-layer dir, $BIN its release binary. */
function snippetHome() {
	// realpathSync: /var is a symlink to /private/var on macOS — the lsof-reported executable is
	// the resolved path, and $BIN must equal it.
	const home = realpathSync(mkdtempSync(join(tmpdir(), 'restart-')));
	const bin = join(home, 'ai-operations-layer', 'target', 'release', 'aiops-server');
	mkdirSync(dirname(bin), { recursive: true });
	return { home, bin };
}

/** Source restart.sh the way suite.sh does; the guard is the first thing that can refuse. */
const runRestart = (home, port) =>
	spawnSync('bash', ['-c', `source ${JSON.stringify(RESTART)}`], {
		env: { ...process.env, SNIPPET_HOME: home, BASE: `http://127.0.0.1:${port}`, AIOPS_DB: 'postgres://unused.invalid/aiops' },
		encoding: 'utf8',
		timeout: 60_000,
	});

/**
 * Source restart.sh and watch what the port guard does, without waiting out the suite's 30s
 * readyz poll — the guard's effect is visible the moment it acts: a suite-owned holder is freed,
 * a foreign one refused.
 */
const watchGuard = (home, port) => {
	const proc = spawn('bash', ['-c', `source ${JSON.stringify(RESTART)}`], {
		env: { ...process.env, SNIPPET_HOME: home, BASE: `http://127.0.0.1:${port}`, AIOPS_DB: 'postgres://unused.invalid/aiops' },
		stdio: ['ignore', 'ignore', 'pipe'],
	});
	let stderr = '';
	proc.stderr.on('data', (chunk) => (stderr += chunk));
	return { proc, stderr: () => stderr };
};

/** True once fn() holds or the budget runs out. */
const until = async (fn, tries = 100) => {
	for (let i = 0; i < tries; i++) {
		if (fn()) return true;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	return false;
};

test('a foreign listener on the port is refused, named, and left alive', async () => {
	const port = await freePort();
	const foreign = spawn('python3', ['-m', 'http.server', String(port)], { stdio: 'ignore' });
	try {
		await waitForListen(port);
		const { home } = snippetHome();
		const result = runRestart(home, port);
		assert.equal(result.status, 1, `restart should refuse: ${result.stderr.slice(0, 300)}`);
		assert.match(result.stderr, /port \d+ is held by \d+ .+, not started by this suite/, 'names the holder');
		assert.match(result.stderr, /set BASE to another port/, 'names the remedy');
		assert.ok(alive(foreign.pid), 'the foreign process must not be killed');
	} finally {
		foreign.kill();
	}
});

// The smallest listener a compiler can make: bind, listen, sleep — its executable is itself.
// A non-numeric argv[1] (`serve`, `migrate` — restart.sh runs $BIN later for those) exits, so no
// stray listener outlives the test.
const C_LISTENER = `#include <arpa/inet.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
int main(int argc, char **argv) {
	if (argc != 2 || !atoi(argv[1])) return 1;
	int fd = socket(AF_INET, SOCK_STREAM, 0);
	struct sockaddr_in a = { .sin_family = AF_INET, .sin_port = htons(atoi(argv[1])), .sin_addr = { .s_addr = htonl(INADDR_LOOPBACK) } };
	if (bind(fd, (struct sockaddr *)&a, sizeof a) || listen(fd, 4)) return 1;
	pause();
	return 0;
}`;

/** Whether a spawned shell can signal our children (sandboxes may EPERM non-child kills). */
const siblingCanSignal = (pid) => spawnSync('bash', ['-c', `kill -0 ${pid}`]).status === 0;

test('a suite-owned stale server (executable == $BIN) is still freed', async (t) => {
	const canary = spawn('sleep', ['30']);
	const canSignal = siblingCanSignal(canary.pid);
	canary.kill();
	if (!canSignal) {
		t.skip('this environment cannot signal a process from a spawned shell');
		return;
	}
	const { home, bin } = snippetHome();
	const source = join(home, 'listener.c');
	writeFileSync(source, C_LISTENER);
	const compiled = spawnSync('cc', [source, '-o', bin], { encoding: 'utf8' });
	if (compiled.status !== 0) {
		t.skip('no C compiler to build the owned-listener fixture');
		return;
	}
	const port = await freePort();
	const stale = spawn(bin, [String(port)], { stdio: 'ignore' });
	let proc;
	let stderr = () => '';
	try {
		// Bind first, then start the guard — a stale suite server is already listening when
		// restart.sh runs, and listeners() must see it.
		await waitForListen(port);
		({ proc, stderr } = watchGuard(home, port));
		const freed = await until(() => !alive(stale.pid));
		assert.ok(freed, `the suite-owned holder was not freed; guard said: ${stderr().slice(0, 300)}`);
		assert.doesNotMatch(stderr(), /not started by this suite/, 'the suite-owned holder is not refused');
	} finally {
		proc?.kill();
		stale.kill();
	}
});

test('a suite-owned stale server (argv[0] == $BIN) is still freed', async (t) => {
	// The argv check needs a spoofed argv[0] to reach `ps` — only Linux reads it back (proc
	// cmdline); elsewhere the executable check is the owned-proof, covered above.
	if (process.platform !== 'linux') {
		t.skip('a spoofed argv[0] only reaches ps on Linux');
		return;
	}
	const port = await freePort();
	const { home, bin } = snippetHome();
	// exec -a makes argv[0] the suite's binary while the real executable is python — the argv
	// check alone can call it owned.
	const stale = spawn('bash', ['-c', `exec -a ${JSON.stringify(bin)} python3 -m http.server ${port}`], { stdio: 'ignore' });
	let proc;
	let stderr = () => '';
	try {
		await waitForListen(port);
		({ proc, stderr } = watchGuard(home, port));
		const freed = await until(() => !alive(stale.pid));
		assert.ok(freed, 'the suite-owned holder was not freed');
		assert.doesNotMatch(stderr(), /not started by this suite/, 'the suite-owned holder is not refused');
	} finally {
		proc?.kill();
		stale.kill();
	}
});
