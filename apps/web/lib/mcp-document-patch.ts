export type DocumentPatchOperation = {
  op: "add" | "replace" | "remove"
  path: string
  value?: unknown
}

const forbiddenSegments = new Set(["__proto__", "prototype", "constructor"])

function pointerSegments(pointer: string) {
  if (!pointer.startsWith("/") || pointer === "/") throw new Error(`Invalid document path: ${pointer}`)
  return pointer.slice(1).split("/").map((segment) => {
    const decoded = segment.replace(/~1/g, "/").replace(/~0/g, "~")
    if (forbiddenSegments.has(decoded)) throw new Error(`Unsafe document path segment: ${decoded}`)
    return decoded
  })
}

export function applyDocumentPatch<T>(document: T, operations: DocumentPatchOperation[]): T {
  const next = structuredClone(document)
  for (const operation of operations) {
    const segments = pointerSegments(operation.path)
    const key = segments.pop() as string
    let parent: any = next
    for (const segment of segments) {
      if (parent === null || typeof parent !== "object" || !(segment in parent)) {
        throw new Error(`Document path does not exist: ${operation.path}`)
      }
      parent = parent[segment]
    }

    if (Array.isArray(parent)) {
      const index = key === "-" ? parent.length : Number(key)
      if (!Number.isInteger(index) || index < 0 || index > parent.length) throw new Error(`Invalid array index in path: ${operation.path}`)
      if (operation.op === "add") parent.splice(index, 0, structuredClone(operation.value))
      else if (operation.op === "remove") {
        if (index >= parent.length) throw new Error(`Document path does not exist: ${operation.path}`)
        parent.splice(index, 1)
      } else {
        if (index >= parent.length) throw new Error(`Document path does not exist: ${operation.path}`)
        parent[index] = structuredClone(operation.value)
      }
      continue
    }

    if (parent === null || typeof parent !== "object") throw new Error(`Document path is not an object: ${operation.path}`)
    if (operation.op === "remove") {
      if (!(key in parent)) throw new Error(`Document path does not exist: ${operation.path}`)
      delete parent[key]
    } else {
      if (operation.op === "replace" && !(key in parent)) throw new Error(`Document path does not exist: ${operation.path}`)
      parent[key] = structuredClone(operation.value)
    }
  }
  return next
}
