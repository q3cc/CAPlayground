const path = require("node:path")
const { pathToFileURL } = require("node:url")
const { app } = require("electron")
const { resolveUserDataPath } = require("./user-data-path.cjs")

const defaultUserDataPath = app.getPath("userData")
const stableUserDataPath = resolveUserDataPath({
  appDataPath: app.getPath("appData"),
  defaultUserDataPath,
  argv: process.argv,
})
app.setName("CAPlayground")
app.setPath("userData", stableUserDataPath)

if (process.argv.includes("--mcp")) {
  process.env.CAPLAYGROUND_MCP_BRIDGE_FILE = path.join(app.getPath("userData"), "mcp-bridge.json")
  import(pathToFileURL(path.join(__dirname, "mcp-server.mjs")).href).catch((error) => {
    console.error(error?.stack || error)
    process.exit(1)
  })
} else {
  require("./main.cjs")
}
