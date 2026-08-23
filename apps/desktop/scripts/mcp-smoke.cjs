const { EventEmitter } = require("node:events")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawn } = require("node:child_process")

const { startMcpBridge } = require("../src/mcp-bridge.cjs")

async function waitForFile(file) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (fs.existsSync(file)) return
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error(`Timed out waiting for ${file}`)
}

async function main() {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), "caplayground-mcp-"))
  const ipcMain = new EventEmitter()
  const webContents = {
    send(channel, request) {
      if (channel !== "caplayground:mcp-request") return
      queueMicrotask(() => {
        ipcMain.emit("caplayground:mcp-response", { sender: webContents }, {
          id: request.id,
          result: request.command === "app.status"
            ? { connected: true, activeProjectId: "smoke-project" }
            : { command: request.command, args: request.args },
        })
      })
    },
  }
  const fakeWindow = { isDestroyed: () => false, webContents }
  const bridge = startMcpBridge({
    app: { getPath: () => testRoot, getVersion: () => "smoke" },
    ipcMain,
    getMainWindow: () => fakeWindow,
  })

  try {
    await waitForFile(bridge.bridgeFile)
    const child = spawn(process.execPath, [
      path.join(__dirname, "..", "src", "mcp-server.mjs"),
      `--bridge-file=${bridge.bridgeFile}`,
    ], { stdio: ["pipe", "pipe", "pipe"] })

    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => { stdout += chunk })
    child.stderr.on("data", (chunk) => { stderr += chunk })

    const requests = [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke", version: "1.0.0" } } },
      { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "app_status", arguments: {} } },
    ]
    child.stdin.end(`${requests.map((request) => JSON.stringify(request)).join("\n")}\n`)

    const exitCode = await new Promise((resolve, reject) => {
      child.once("error", reject)
      child.once("exit", resolve)
    })
    if (exitCode !== 0) throw new Error(`MCP process exited ${exitCode}: ${stderr}`)

    const messages = stdout.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
    const toolList = messages.find((message) => message.id === 2)?.result?.tools ?? []
    const status = messages.find((message) => message.id === 3)?.result?.structuredContent
    if (toolList.length !== 15) throw new Error(`Expected 15 tools, received ${toolList.length}`)
    if (!toolList.some((tool) => tool.name === "get_editor_capabilities")) throw new Error("Capabilities tool is missing")
    if (!status?.connected || status.activeProjectId !== "smoke-project") throw new Error("Bridge round-trip failed")
    process.stdout.write(`MCP smoke passed: ${toolList.length} tools and authenticated bridge round-trip.\n`)
  } finally {
    bridge.close()
    fs.rmSync(testRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
