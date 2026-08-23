const fs = require("node:fs")
const path = require("node:path")

const CONFIG_NAME = "desktop-storage-origin.json"

function validOrigin(value) {
  if (value?.mode === "app") return { mode: "app" }
  const port = Number(value?.port)
  if (value?.mode === "http" && Number.isInteger(port) && port > 0 && port <= 65535) {
    return { mode: "http", port }
  }
  return null
}

function discoverLegacyStorageOrigin(userDataPath) {
  const indexedDbPath = path.join(userDataPath, "IndexedDB")
  let entries = []
  try { entries = fs.readdirSync(indexedDbPath, { withFileTypes: true }) } catch {}

  const candidates = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    let origin = null
    if (entry.name === "app_-_0.indexeddb.leveldb") origin = { mode: "app" }
    const match = entry.name.match(/^http_127\.0\.0\.1_(\d+)\.indexeddb\.leveldb$/)
    if (match) origin = validOrigin({ mode: "http", port: Number(match[1]) })
    if (!origin) continue
    let modifiedAt = 0
    const candidatePath = path.join(indexedDbPath, entry.name)
    try {
      modifiedAt = fs.statSync(candidatePath).mtimeMs
      for (const child of fs.readdirSync(candidatePath)) {
        try { modifiedAt = Math.max(modifiedAt, fs.statSync(path.join(candidatePath, child)).mtimeMs) } catch {}
      }
    } catch {}
    candidates.push({ origin, modifiedAt })
  }

  candidates.sort((left, right) => right.modifiedAt - left.modifiedAt)
  return candidates[0]?.origin ?? { mode: "app" }
}

function resolveStorageOrigin(userDataPath) {
  const configPath = path.join(userDataPath, CONFIG_NAME)
  try {
    const configured = validOrigin(JSON.parse(fs.readFileSync(configPath, "utf8")))
    if (configured) return { origin: configured, configPath, recovered: false }
  } catch {}
  return { origin: discoverLegacyStorageOrigin(userDataPath), configPath, recovered: true }
}

function saveStorageOrigin(configPath, origin) {
  const normalized = validOrigin(origin)
  if (!normalized) throw new Error("Invalid desktop storage origin.")
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify({
    ...normalized,
    version: 1,
    savedAt: new Date().toISOString(),
  }, null, 2), { mode: 0o600 })
  try { fs.chmodSync(configPath, 0o600) } catch {}
}

module.exports = {
  CONFIG_NAME,
  discoverLegacyStorageOrigin,
  resolveStorageOrigin,
  saveStorageOrigin,
  validOrigin,
}
