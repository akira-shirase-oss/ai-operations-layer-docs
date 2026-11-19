# Fresh suite boundary for the AI Operations Layer stack. Sourced by snippets.mjs between suites
# (the runner's cwd is the product checkout; BASE, AIOPS_DB and SNIPPET_HOME are exported).
# The suite that follows sees an empty database, a freshly migrated schema, a "docs" project, fresh
# credentials — and the reference host up on REFHOST_BASE with the collector's control adapter wired
# to it, so control-path examples exercise a real effect authority.
set -u
cd "$SNIPPET_HOME/ai-operations-layer"
export AIOPS_DATABASE_URL="$AIOPS_DB"
BIN="$SNIPPET_HOME/ai-operations-layer/target/release/aiops-server"
REFPORT=57401
export REFHOST_BASE="http://127.0.0.1:$REFPORT"

# Stop the running collector and the reference host, if any.
for pidfile in .srv.pid .refhost.pid; do
	if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
		kill "$(cat "$pidfile")" 2>/dev/null
		for _ in $(seq 1 100); do kill -0 "$(cat "$pidfile")" 2>/dev/null || break; sleep 0.1; done
	fi
	rm -f "$pidfile"
done

# Empty the database and migrate again — same thing the product's own test stack does.
if command -v psql >/dev/null 2>&1; then
	psql "${AIOPS_DB%/aiops}/postgres" -v ON_ERROR_STOP=1 -q -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
elif command -v docker >/dev/null 2>&1; then
	docker compose -f deploy/compose.yaml exec -T postgres psql -U aiops -d aiops -v ON_ERROR_STOP=1 -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
else
	echo "restart: need psql or docker on PATH to reset the database" >&2
	return 1
fi
"$BIN" migrate >/dev/null

# Fresh credentials for the suite: one ingest key, a read token, an operate token and an admin token.
"$BIN" admin create-project docs >/dev/null
export AIOPS_INGEST_KEY="$("$BIN" admin create-ingest-key --project docs --name suite)"
export AIOPS_TOKEN="$("$BIN" admin create-token --actor docs --project docs --scope read 2>/dev/null)"
export AIOPS_OPERATE_TOKEN="$("$BIN" admin create-token --actor docs-ops --project docs --scope read --scope operate 2>/dev/null)"
export AIOPS_ADMIN_TOKEN="$("$BIN" admin create-token --actor ops --project docs --scope admin 2>/dev/null)"

# The reference host: the project's control adapter + the effect's authority for control examples.
# Build once (cheap inside the warm workspace), then run it.
if [ ! -x target/release/reference-host ]; then
	cargo build --release --bin reference-host || echo "restart: reference-host build failed; control examples will see no adapter" >&2
fi
if [ -x target/release/reference-host ]; then
	REFHOST_LISTEN="127.0.0.1:$REFPORT" ./target/release/reference-host >refhost.log 2>&1 &
	echo $! >.refhost.pid
fi

# Restart the collector against the empty store, with the control adapter pointing at the host.
AIOPS_LISTEN="127.0.0.1:$(echo "$BASE" | sed 's/.*://')" \
	AIOPS_CONTROL_REFERENCE_HOST="docs=$REFHOST_BASE" \
	"$BIN" serve >srv.log 2>&1 &
echo $! >.srv.pid
for _ in $(seq 1 150); do
	if curl -sf "$BASE/readyz" >/dev/null 2>&1; then
		return 0
	fi
	sleep 0.2
done
echo "restart: collector did not become ready; log:" >&2
tail -20 srv.log >&2
return 1
