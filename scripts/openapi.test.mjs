// The route-sync check's own tests: the parser must find the server's routes across merged
// sub-routers and ignore its test module, and the comparison must fail in both directions (a
// route the spec forgot, and a path the spec invented).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serverRoutes, specRoutes, productionSource } from './check-openapi.mjs';

const ROUTER = `
pub fn router(state: SharedState) -> Router {
	let ingest_routes = Router::new()
		.route("/v1/ingest", post(ingest::ingest))
		.layer(DefaultBodyLimit::max(body_limit));
	let query_routes = Router::new()
		.route("/v1/projects", get(query::projects))
		.route(
			"/v1/projects/{project}/operations",
			get(query::list_operations),
		)
		.route(
			"/v1/projects/{project}/operations/{operation_id}",
			get(query::timeline),
		)
		.route(
			"/v1/projects/{project}/releases/compare",
			get(query::compare_releases),
		)
		.route(
			"/v1/projects/{project}/operations/{operation_id}/authority",
			get(crate::authority::authority),
		)
		.route("/v1/collector/stats", get(query::stats));
	let mut app = Router::new()
		.route("/healthz", get(healthz))
		.route("/readyz", get(readyz))
		.merge(ingest_routes)
		.merge(query_routes);
	app
}

#[cfg(test)]
mod tests {
	fn fake() {
		Router::new().route("/fake", axum::routing::post(post));
	}
}
`;

test('the production route table parses, and the test module stays out', () => {
	const routes = serverRoutes(ROUTER);
	assert.equal(routes.length, 9);
	assert.deepEqual(
		routes.map(({ path }) => path).sort(),
		[
			'/healthz',
			'/readyz',
			'/v1/collector/stats',
			'/v1/ingest',
			'/v1/projects',
			'/v1/projects/{project}/operations',
			'/v1/projects/{project}/operations/{operation_id}',
			'/v1/projects/{project}/operations/{operation_id}/authority',
			'/v1/projects/{project}/releases/compare',
		],
	);
	assert.ok(!routes.some(({ path }) => path === '/fake'), 'the test router must not be counted');
});

test('a route table without a test module parses whole', () => {
	const routes = serverRoutes(productionSource('Router::new().route("/healthz", get(healthz));'));
	assert.equal(routes.length, 1);
});

test('spec routes parse with their methods', () => {
	const routes = specRoutes({ paths: { '/v1/ingest': { post: {}, parameters: {} }, '/healthz': { get: {} } } });
	assert.deepEqual(
		routes.sort((a, b) => a.path.localeCompare(b.path)),
		[
			{ path: '/healthz', methods: ['GET'] },
			{ path: '/v1/ingest', methods: ['POST'] },
		],
	);
});
