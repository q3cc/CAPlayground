import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const root = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1").replace(/\/$/, "")
const scanRoots = [join(root, "app"), join(root, "components", "editor")]
const catalogSource = readFileSync(join(root, "lib", "i18n", "legacy-translations.ts"), "utf8")
const mapped = new Set([...catalogSource.matchAll(/^\s{2}"((?:[^"\\]|\\.)+)":/gm)].map((match) => JSON.parse(`"${match[1]}"`)))
const intentionallyUntranslated = new Set([
  "Times New Roman", "Copperplate", "Courier New", "Futura", "Georgia", "Papyrus", "Verdana",
  "iPhone", "iPad", "iPod touch", "100k+", "1.5k+",
  "google_drive_access_token", "google_drive_refresh_token", "google_drive_token_expiry",
  "support@enkei64.xyz", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "you@example.com",
  "Shift + Scroll", "Middle Click + Drag", "Shift + Drag", "Drag",
  "Shift + Drag or Middle Click", "Alt + Drag Handle", "Shift + Drag Handle",
  "CC BY 4.0", "CC BY-SA 4.0", "CC BY-NC 4.0", "15 fps", "30 fps", "60 fps",
])

function filesIn(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? filesIn(path) : path.endsWith(".tsx") ? [path] : []
  })
}

function normalize(value) {
  return value.replace(/\s+/g, " ").trim()
}

function isUserFacing(value) {
  if (!/[A-Za-z]/.test(value) || value.length < 2) return false
  if (/^(https?:|\/|#|[A-Za-z0-9_.-]+\.(tsx?|jsx?|css|json|png|svg|com))/.test(value)) return false
  if (/^[a-z][a-zA-Z]*(?:\.[a-zA-Z]+)+$/.test(value)) return false
  if (/^(use client|GET|POST|PUT|DELETE|PATCH|px|rem|auto|none|true|false)$/.test(value)) return false
  if (/^[A-Za-z]+(?:-[A-Za-z]+){1,}$/.test(value)) return false
  if (/(?:\bconst\b|\buseState\b|\bPromise\b|\breturn\b|=>|===|!==|\.map\(|\.replace\(|React\.|NonNullable|Awaited|rootDocument)/.test(value)) return false
  if (/^[(){}[\];,`]/.test(value)) return false
  if (/^(?:\\n|p\.match|void;|Math\.|status$|asset$|center$|=|0 &&)/.test(value)) return false
  return true
}

const findings = []
for (const file of scanRoots.flatMap(filesIn)) {
  const source = readFileSync(file, "utf8")
  const literals = new Set()
  for (const match of source.matchAll(/>([^<>{}]+)</g)) {
    const value = normalize(match[1])
    if (isUserFacing(value)) literals.add(value)
  }
  for (const match of source.matchAll(/(?:aria-label|placeholder|title|alt)=\{?"([^"]+)"\}?/g)) {
    const value = normalize(match[1])
    if (isUserFacing(value)) literals.add(value)
  }
  for (const value of literals) {
    if (!mapped.has(value) && !intentionallyUntranslated.has(value)) findings.push({ file: relative(root, file).replaceAll("\\", "/"), value })
  }
}

const byFile = Map.groupBy(findings, ({ file }) => file)
console.log(`Mapped legacy strings: ${mapped.size}`)
console.log(`Unmapped user-facing literal candidates: ${findings.length}`)
for (const [file, items] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${file} (${items.length})`)
  for (const { value } of items) console.log(`  - ${value}`)
}

if (process.argv.includes("--strict") && findings.length) process.exit(1)
