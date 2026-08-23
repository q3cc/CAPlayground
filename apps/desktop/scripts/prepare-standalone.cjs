const fs = require("node:fs")
const path = require("node:path")

const desktopRoot = path.resolve(__dirname, "..")
const webRoot = path.resolve(desktopRoot, "../web")
const standaloneRoot = path.join(webRoot, ".next", "standalone")
const outputRoot = path.join(desktopRoot, "build", "web")

if (!fs.existsSync(path.join(standaloneRoot, "server.js"))) {
  throw new Error(`Missing Next standalone build at ${standaloneRoot}. Run the web build first.`)
}

fs.rmSync(outputRoot, { recursive: true, force: true })
fs.mkdirSync(outputRoot, { recursive: true })
fs.cpSync(standaloneRoot, outputRoot, { recursive: true })
fs.cpSync(path.join(webRoot, ".next", "static"), path.join(outputRoot, ".next", "static"), { recursive: true })
fs.cpSync(path.join(webRoot, "public"), path.join(outputRoot, "public"), { recursive: true })

console.log(`Prepared standalone web app at ${outputRoot}`)
