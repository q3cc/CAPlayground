const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { resolveUserDataPath } = require("../src/user-data-path.cjs")

const root = fs.mkdtempSync(path.join(os.tmpdir(), "caplayground-user-data-"))

try {
  const canonical = path.join(root, "CAPlayground")
  const packageDefault = path.join(root, "@caplayground", "desktop")
  fs.mkdirSync(path.join(packageDefault, "IndexedDB", "http_127.0.0.1_5325.indexeddb.leveldb"), { recursive: true })
  assert.equal(resolveUserDataPath({ appDataPath: root, defaultUserDataPath: packageDefault, argv: [] }), packageDefault)

  fs.rmSync(path.join(root, "CAPlayground-user-data.json"), { force: true })
  fs.mkdirSync(path.join(canonical, "IndexedDB", "app_-_0.indexeddb.leveldb"), { recursive: true })
  assert.equal(resolveUserDataPath({ appDataPath: root, defaultUserDataPath: packageDefault, argv: [] }), canonical)

  const explicit = path.join(root, "isolated-test-profile")
  assert.equal(resolveUserDataPath({ appDataPath: root, defaultUserDataPath: explicit, argv: [`--user-data-dir=${explicit}`] }), explicit)
  process.stdout.write("Stable user-data path smoke passed.\n")
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
