const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const {
  discoverLegacyStorageOrigin,
  resolveStorageOrigin,
  saveStorageOrigin,
} = require("../src/storage-origin.cjs")

const root = fs.mkdtempSync(path.join(os.tmpdir(), "caplayground-storage-origin-"))

try {
  const indexedDb = path.join(root, "IndexedDB")
  const appOrigin = path.join(indexedDb, "app_-_0.indexeddb.leveldb")
  const httpOrigin = path.join(indexedDb, "http_127.0.0.1_5325.indexeddb.leveldb")
  fs.mkdirSync(appOrigin, { recursive: true })
  fs.mkdirSync(httpOrigin, { recursive: true })
  fs.writeFileSync(path.join(appOrigin, "CURRENT"), "old")
  fs.writeFileSync(path.join(httpOrigin, "CURRENT"), "new")
  const older = new Date(Date.now() - 60_000)
  fs.utimesSync(appOrigin, older, older)
  fs.utimesSync(path.join(appOrigin, "CURRENT"), older, older)

  assert.deepEqual(discoverLegacyStorageOrigin(root), { mode: "http", port: 5325 })
  const discovered = resolveStorageOrigin(root)
  assert.equal(discovered.recovered, true)
  assert.deepEqual(discovered.origin, { mode: "http", port: 5325 })

  saveStorageOrigin(discovered.configPath, discovered.origin)
  fs.utimesSync(appOrigin, new Date(), new Date())
  const persisted = resolveStorageOrigin(root)
  assert.equal(persisted.recovered, false)
  assert.deepEqual(persisted.origin, { mode: "http", port: 5325 })
  process.stdout.write("Legacy storage-origin recovery smoke passed.\n")
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
