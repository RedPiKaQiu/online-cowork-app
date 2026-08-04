import { readFile, writeFile } from "node:fs/promises"

const path = new URL("../VERSION", import.meta.url)
const current = (await readFile(path, "utf8")).trim()
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current)
if (!match) throw new Error(`VERSION must use semantic versioning, received: ${current}`)

const next = `${match[1]}.${match[2]}.${Number(match[3]) + 1}`
await writeFile(path, `${next}\n`)
console.log(`Version ${current} -> ${next}`)
