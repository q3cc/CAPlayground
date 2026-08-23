"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createProject, deleteFile, deleteProject, ensureUniqueProjectName, getFile, listFiles, listProjects, putBlobFile, putTextFile } from "@/lib/storage"
import { dispatchMcpCommand, MCP_NOT_HANDLED, registerMcpCommandHandler } from "@/lib/mcp-command-bus"

declare global {
  interface Window {
    caplaygroundDesktopMcp?: {
      onRequest: (listener: (request: { id: string; command: string; args?: Record<string, unknown> }) => void) => () => void
      respond: (response: { id: string; result?: unknown; error?: string }) => void
    }
  }
}

function safeProjectPath(value: unknown) {
  const path = String(value || "").replace(/\\/g, "/")
  if (!path || path.startsWith("/") || path.split("/").includes("..")) throw new Error("Project file path must be relative and cannot contain '..'.")
  return path
}

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ""
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  return btoa(binary)
}

export function McpBridge() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => registerMcpCommandHandler(async (command, args) => {
    const requireProject = async (projectId: string) => {
      const project = (await listProjects()).find((candidate) => candidate.id === projectId)
      if (!project) throw new Error(`Project not found: ${projectId}`)
      return project
    }
    switch (command) {
      case "app.status": {
        const match = pathname.match(/^\/editor\/([^/]+)/)
        return { connected: true, route: pathname, locale: document.documentElement.lang, activeProjectId: match ? decodeURIComponent(match[1]) : null, editorOpen: Boolean(match) }
      }
      case "project.list":
        return { projects: await listProjects() }
      case "project.create": {
        const name = await ensureUniqueProjectName(String(args.name || "New Wallpaper"))
        const id = crypto.randomUUID()
        const project = { id, name, createdAt: new Date().toISOString(), width: Number(args.width || 390), height: Number(args.height || 844), gyroEnabled: Boolean(args.gyroEnabled) }
        await createProject(project)
        if (args.open !== false) window.setTimeout(() => router.push(`/editor/${id}`), 50)
        return { project, opening: args.open !== false }
      }
      case "project.open": {
        const projectId = String(args.projectId || "")
        const exists = (await listProjects()).some((project) => project.id === projectId)
        if (!exists) throw new Error(`Project not found: ${projectId}`)
        window.setTimeout(() => router.push(`/editor/${encodeURIComponent(projectId)}`), 50)
        return { projectId, opening: true }
      }
      case "project.delete": {
        const projectId = String(args.projectId || "")
        await deleteProject(projectId)
        if (pathname === `/editor/${projectId}`) window.setTimeout(() => router.push("/projects"), 50)
        return { projectId, deleted: true }
      }
      case "project.files": {
        const projectId = String(args.projectId || "")
        await requireProject(projectId)
        const records = await listFiles(projectId, args.prefix ? String(args.prefix) : undefined)
        return { files: records.map((record) => ({ path: record.path, type: record.type, size: typeof record.data === "string" ? new Blob([record.data]).size : record.data instanceof Blob ? record.data.size : record.data.byteLength })) }
      }
      case "project.read_file": {
        const projectId = String(args.projectId || "")
        await requireProject(projectId)
        const path = safeProjectPath(args.path)
        const record = await getFile(projectId, path)
        if (!record) throw new Error(`Project file not found: ${path}`)
        if (record.type === "text") return { path, encoding: "utf8", data: String(record.data) }
        const blob = record.data instanceof Blob ? record.data : new Blob([record.data as ArrayBuffer])
        return { path, encoding: "base64", data: await blobToBase64(blob), size: blob.size }
      }
      case "project.write_file": {
        const projectId = String(args.projectId || "")
        await requireProject(projectId)
        const path = safeProjectPath(args.path)
        if (args.encoding === "utf8") await putTextFile(projectId, path, String(args.data ?? ""))
        else {
          const binary = atob(String(args.data || ""))
          const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
          await putBlobFile(projectId, path, bytes.buffer)
        }
        return { projectId, path, written: true }
      }
      case "project.delete_file": {
        const projectId = String(args.projectId || "")
        await requireProject(projectId)
        const path = safeProjectPath(args.path)
        await deleteFile(projectId, path)
        return { projectId, path, deleted: true }
      }
      default:
        return MCP_NOT_HANDLED
    }
  }), [pathname, router])

  useEffect(() => {
    const bridge = window.caplaygroundDesktopMcp
    if (!bridge) return
    return bridge.onRequest(async (request) => {
      try {
        bridge.respond({ id: request.id, result: await dispatchMcpCommand(request.command, request.args || {}) })
      } catch (error) {
        bridge.respond({ id: request.id, error: error instanceof Error ? error.message : String(error) })
      }
    })
  }, [])

  return null
}
