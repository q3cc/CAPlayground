const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("caplaygroundDesktopMcp", {
  onRequest(listener) {
    if (typeof listener !== "function") throw new TypeError("listener must be a function")
    const wrapped = (_event, request) => listener(request)
    ipcRenderer.on("caplayground:mcp-request", wrapped)
    return () => ipcRenderer.removeListener("caplayground:mcp-request", wrapped)
  },
  respond(response) {
    ipcRenderer.send("caplayground:mcp-response", response)
  },
})
