const fs = require("node:fs")
const path = require("node:path")

const LOCATION_FILE = "CAPlayground-user-data.json"

function samePath(left, right) {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase()
}

function containsProjectStorage(userDataPath) {
  const indexedDbPath = path.join(userDataPath, "IndexedDB")
  try {
    return fs.readdirSync(indexedDbPath, { withFileTypes: true }).some((entry) => entry.isDirectory() && (
      entry.name === "app_-_0.indexeddb.leveldb"
      || /^http_127\.0\.0\.1_\d+\.indexeddb\.leveldb$/.test(entry.name)
    ))
  } catch {
    return false
  }
}

function resolveUserDataPath({ appDataPath, defaultUserDataPath, argv }) {
  if (argv.some((arg) => arg.startsWith("--user-data-dir="))) return defaultUserDataPath

  const canonicalPath = path.join(appDataPath, "CAPlayground")
  const locationPath = path.join(appDataPath, LOCATION_FILE)
  const allowedPaths = [canonicalPath, defaultUserDataPath]
  try {
    const configured = JSON.parse(fs.readFileSync(locationPath, "utf8"))?.path
    const allowed = allowedPaths.find((candidate) => typeof configured === "string" && samePath(candidate, configured))
    if (allowed) return allowed
  } catch {}

  const selected = containsProjectStorage(canonicalPath)
    ? canonicalPath
    : containsProjectStorage(defaultUserDataPath)
      ? defaultUserDataPath
      : canonicalPath

  fs.mkdirSync(appDataPath, { recursive: true })
  fs.writeFileSync(locationPath, JSON.stringify({
    path: selected,
    version: 1,
    savedAt: new Date().toISOString(),
  }, null, 2), { mode: 0o600 })
  try { fs.chmodSync(locationPath, 0o600) } catch {}
  return selected
}

module.exports = { containsProjectStorage, resolveUserDataPath, samePath }
