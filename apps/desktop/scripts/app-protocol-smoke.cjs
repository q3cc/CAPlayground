const assert = require("node:assert/strict")
const {
  APP_ORIGIN,
  installAppProtocol,
  isAppUrl,
  mapAppUrlToUpstream,
  registerAppScheme,
} = require("../src/app-protocol.cjs")

assert.equal(APP_ORIGIN, "app://-")
assert.equal(isAppUrl("app://-/projects"), true)
assert.equal(isAppUrl("http://127.0.0.1:49152/projects"), false)
assert.equal(
  mapAppUrlToUpstream("app://-/editor/project-1?mode=test", "http://127.0.0.1:49152"),
  "http://127.0.0.1:49152/editor/project-1?mode=test",
)
assert.throws(() => mapAppUrlToUpstream("https://example.com/", "http://127.0.0.1:49152"))

let schemes = null
registerAppScheme({ registerSchemesAsPrivileged(value) { schemes = value } })
assert.equal(schemes[0].scheme, "app")
assert.equal(schemes[0].privileges.standard, true)
assert.equal(schemes[0].privileges.secure, true)

let handler = null
const requests = []
installAppProtocol({
  protocol: { handle(_scheme, value) { handler = value } },
  net: {
    async fetch(url, init) {
      requests.push({ url, init })
      return new Response("ok")
    },
  },
  upstreamUrl: "http://127.0.0.1:49152",
})

async function main() {
  await handler(new Request("app://-/api/projects?limit=5", {
    headers: { origin: "app://-", referer: "app://-/projects" },
  }))
  assert.equal(requests[0].url, "http://127.0.0.1:49152/api/projects?limit=5")
  assert.equal(requests[0].init.headers.get("origin"), "http://127.0.0.1:49152")
  assert.equal(requests[0].init.headers.get("referer"), "http://127.0.0.1:49152/projects")
  process.stdout.write("Stable app origin smoke passed.\n")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
