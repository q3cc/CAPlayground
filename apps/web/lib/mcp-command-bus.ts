export const MCP_NOT_HANDLED = Symbol("MCP_NOT_HANDLED")

export type McpCommandHandler = (
  command: string,
  args: Record<string, unknown>,
) => unknown | Promise<unknown> | typeof MCP_NOT_HANDLED

const handlers = new Set<McpCommandHandler>()

export function registerMcpCommandHandler(handler: McpCommandHandler) {
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
  }
}

export async function dispatchMcpCommand(command: string, args: Record<string, unknown>) {
  const ordered = Array.from(handlers).reverse()
  for (const handler of ordered) {
    const result = await handler(command, args)
    if (result !== MCP_NOT_HANDLED) return result
  }
  throw new Error(`Unsupported MCP command: ${command}`)
}
