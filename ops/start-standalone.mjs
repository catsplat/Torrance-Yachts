import { spawnSync } from "node:child_process"
import { cpSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const projectRoot = resolve(import.meta.dirname, "..")
const localEnvironment = resolve(projectRoot, ".env.local")
const standaloneRoot = resolve(projectRoot, ".next", "standalone")
const standaloneServer = resolve(standaloneRoot, "server.js")

if (existsSync(localEnvironment)) process.loadEnvFile(localEnvironment)
if (!existsSync(standaloneServer)) {
  throw new Error("The production build is missing. Run `npm run build` first.")
}

cpSync(resolve(projectRoot, ".next", "static"), resolve(standaloneRoot, ".next", "static"), {
  force: true,
  recursive: true,
})
const publicDirectory = resolve(projectRoot, "public")
if (existsSync(publicDirectory)) {
  cpSync(publicDirectory, resolve(standaloneRoot, "public"), {
    force: true,
    recursive: true,
  })
}

const result = spawnSync(process.execPath, [standaloneServer], {
  cwd: standaloneRoot,
  env: {
    ...process.env,
    HOSTNAME: process.env.HOSTNAME || "127.0.0.1",
    PORT: process.env.PORT || "3000",
  },
  stdio: "inherit",
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
