const crypto = require("node:crypto")
const fs = require("node:fs")
const http = require("node:http")
const path = require("node:path")

function startMcpBridge({ app, ipcMain, getMainWindow }) {
  const token = crypto.randomBytes(32).toString("hex")
  const bridgeFile = path.join(app.getPath("userData"), "mcp-bridge.json")
  const pending = new Map()
  let nextRequestId = 1

  const invokeRenderer = (command, args) => new Promise((resolve, reject) => {
    const window = getMainWindow()
    if (!window || window.isDestroyed()) {
      reject(new Error("CAPlayground window is not available."))
      return
    }

    const id = String(nextRequestId++)
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`Editor command timed out: ${command}`))
    }, 30_000)

    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      reject: (error) => {
        clearTimeout(timer)
        reject(error)
      },
    })
    window.webContents.send("caplayground:mcp-request", { id, command, args })
  })

  const onResponse = (event, response) => {
    const window = getMainWindow()
    if (!window || event.sender !== window.webContents) return
    const waiter = pending.get(String(response?.id ?? ""))
    if (!waiter) return
    pending.delete(String(response.id))
    if (response.error) waiter.reject(new Error(String(response.error)))
    else waiter.resolve(response.result)
  }
  ipcMain.on("caplayground:mcp-response", onResponse)

  const server = http.createServer((request, response) => {
    response.setHeader("Content-Type", "application/json; charset=utf-8")
    if (request.method !== "POST" || request.url !== "/rpc") {
      response.statusCode = 404
      response.end(JSON.stringify({ error: "Not found" }))
      return
    }
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.statusCode = 401
      response.end(JSON.stringify({ error: "Unauthorized" }))
      return
    }

    const chunks = []
    let length = 0
    request.on("data", (chunk) => {
      length += chunk.length
      if (length > 64 * 1024 * 1024) {
        request.destroy(new Error("Request is too large."))
        return
      }
      chunks.push(chunk)
    })
    request.on("end", async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"))
        if (!body || typeof body.command !== "string") throw new Error("A command is required.")
        const result = await invokeRenderer(body.command, body.args ?? {})
        response.statusCode = 200
        response.end(JSON.stringify({ result }))
      } catch (error) {
        response.statusCode = 400
        response.end(JSON.stringify({ error: error?.message || String(error) }))
      }
    })
  })

  server.listen(0, "127.0.0.1", () => {
    const address = server.address()
    const port = typeof address === "object" && address ? address.port : 0
    fs.mkdirSync(path.dirname(bridgeFile), { recursive: true })
    fs.writeFileSync(bridgeFile, JSON.stringify({
      port,
      token,
      pid: process.pid,
      version: app.getVersion(),
      updatedAt: new Date().toISOString(),
    }, null, 2), { mode: 0o600 })
    try { fs.chmodSync(bridgeFile, 0o600) } catch {}
  })

  return {
    bridgeFile,
    close() {
      ipcMain.removeListener("caplayground:mcp-response", onResponse)
      for (const waiter of pending.values()) waiter.reject(new Error("MCP bridge stopped."))
      pending.clear()
      server.close()
      try { fs.rmSync(bridgeFile, { force: true }) } catch {}
    },
  }
}

module.exports = { startMcpBridge }
