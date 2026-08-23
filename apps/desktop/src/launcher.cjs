const path = require("node:path")
const { pathToFileURL } = require("node:url")
const { app } = require("electron")

if (process.argv.includes("--mcp")) {
  process.env.CAPLAYGROUND_MCP_BRIDGE_FILE = path.join(app.getPath("userData"), "mcp-bridge.json")
  import(pathToFileURL(path.join(__dirname, "mcp-server.mjs")).href).catch((error) => {
    console.error(error?.stack || error)
    process.exit(1)
  })
} else {
  require("./main.cjs")
}
