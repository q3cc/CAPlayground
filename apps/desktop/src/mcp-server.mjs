import fs from "node:fs/promises"
import { McpServer } from "@modelcontextprotocol/server"
import { serveStdio } from "@modelcontextprotocol/server/stdio"
import * as z from "zod/v4"

const bridgeArg = process.argv.find((arg) => arg.startsWith("--bridge-file="))
const bridgeFile = process.env.CAPLAYGROUND_MCP_BRIDGE_FILE || bridgeArg?.slice("--bridge-file=".length)

if (!bridgeFile) {
  console.error("CAPlayground MCP: missing bridge file path. Start this server through CAPlayground --mcp.")
  process.exit(1)
}

async function callBridge(command, args = {}) {
  const config = JSON.parse(await fs.readFile(bridgeFile, "utf8"))
  const response = await fetch(`http://127.0.0.1:${config.port}/rpc`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ command, args }),
  })
  const payload = await response.json()
  if (!response.ok || payload.error) throw new Error(payload.error || `Bridge request failed (${response.status})`)
  return payload.result
}

function result(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value && typeof value === "object" ? value : { value },
  }
}

function createServer() {
  const server = new McpServer(
    { name: "caplayground", version: "1.0.0" },
    {
      instructions: "Call app_status first. Open a project before editor tools. Read the current document before mutations, prefer patch_editor_document for targeted changes, then call save_project. Internal state names and layer identifiers must remain stable.",
    },
  )

  const register = (name, description, inputSchema, command, annotations) => {
    server.registerTool(name, { description, inputSchema, annotations }, async (args) => {
      try {
        return result(await callBridge(command, args))
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: error?.message || String(error) }] }
      }
    })
  }

  register("app_status", "Get CAPlayground connection, route, locale, and active project status.", z.object({}), "app.status", { readOnlyHint: true })
  server.registerTool("get_editor_capabilities", {
    description: "Describe the complete editable document model, layer types, views, state names, and high-level action payloads.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  }, async () => result({
    views: ["background", "floating", "wallpaper"],
    layerTypes: ["basic", "image", "text", "shape", "video", "gradient", "emitter", "transform", "replicator", "liquidGlass"],
    states: ["Base State", "Locked", "Unlock", "Sleep", "Locked Light", "Unlock Light", "Sleep Light", "Locked Dark", "Unlock Dark", "Sleep Dark"],
    documentControl: {
      read: "get_editor_document",
      targetedMutation: "patch_editor_document with RFC 6901 paths and add/replace/remove operations",
      fullMutation: "replace_editor_document",
      persist: "save_project",
    },
    actionPayloads: {
      set_active_view: { view: "background | floating | wallpaper" },
      select_layer: { layerId: "string | null" },
      add_layer: { view: "optional view", parentId: "optional layer id", layer: "complete layer object" },
      update_layer: { layerId: "string", patch: "partial layer object" },
      delete_layer: { layerId: "string" },
      duplicate_layer: { layerId: "optional string" },
      move_layer: { sourceId: "string", beforeId: "string | null", position: "before | after | into" },
      set_active_state: { state: "state name" },
      set_state_override: { targetId: "string", keyPath: "editable CA key path", value: "number" },
      toggle_layer_visibility: { layerId: "string" },
    },
    note: "Animations, filters, emitter cells, video frames, parallax groups, appearance variants, and other advanced fields are controlled through document patches so unknown future fields are preserved.",
  }))
  register("list_projects", "List all projects stored in CAPlayground.", z.object({}), "project.list", { readOnlyHint: true })
  register("create_project", "Create a project and optionally open it in the editor.", z.object({
    name: z.string().min(1),
    width: z.number().int().positive().default(390),
    height: z.number().int().positive().default(844),
    gyroEnabled: z.boolean().default(false),
    open: z.boolean().default(true),
  }), "project.create")
  register("open_project", "Open a project in the editor by id.", z.object({ projectId: z.string().min(1) }), "project.open")
  register("delete_project", "Permanently delete a project and its stored assets.", z.object({ projectId: z.string().min(1) }), "project.delete", { destructiveHint: true })
  register("list_project_files", "List CAML, metadata, and asset files for a project.", z.object({ projectId: z.string().min(1), prefix: z.string().optional() }), "project.files", { readOnlyHint: true })
  register("read_project_file", "Read a project file as UTF-8 text or base64.", z.object({ projectId: z.string().min(1), path: z.string().min(1) }), "project.read_file", { readOnlyHint: true })
  register("write_project_file", "Write a text or base64 asset file inside a project.", z.object({
    projectId: z.string().min(1),
    path: z.string().min(1),
    encoding: z.enum(["utf8", "base64"]),
    data: z.string(),
  }), "project.write_file")
  register("delete_project_file", "Delete one stored project file.", z.object({ projectId: z.string().min(1), path: z.string().min(1) }), "project.delete_file", { destructiveHint: true })
  register("get_editor_document", "Read the complete live editor document, including every view, layer, state, override, animation, filter, and parallax setting.", z.object({}), "editor.get_document", { readOnlyHint: true })
  register("replace_editor_document", "Replace the complete live editor document. Use only after reading it and preserve unknown fields.", z.object({ document: z.unknown() }), "editor.replace_document", { destructiveHint: true })
  register("patch_editor_document", "Apply JSON Patch-style add, replace, or remove operations to the live editor document.", z.object({
    operations: z.array(z.object({
      op: z.enum(["add", "replace", "remove"]),
      path: z.string().startsWith("/"),
      value: z.unknown().optional(),
    })).min(1),
  }), "editor.patch_document")
  register("editor_action", "Execute a high-level editor action for layers, views, states, history, visibility, cleanup, or selection.", z.object({
    action: z.enum([
      "set_active_view", "select_layer", "add_layer", "update_layer", "delete_layer",
      "duplicate_layer", "move_layer", "set_active_state", "set_state_override",
      "toggle_layer_visibility", "undo", "redo", "cleanup_assets",
    ]),
    payload: z.record(z.string(), z.unknown()).default({}),
  }), "editor.action")
  register("save_project", "Persist the live editor document to CAML and project storage.", z.object({}), "editor.save")

  return server
}

void serveStdio(createServer)
console.error("CAPlayground MCP server is listening on stdio")
