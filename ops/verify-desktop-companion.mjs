import { readFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

const root = process.cwd()

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Desktop companion verification failed: ${message}`)
  }
}

const [packageJson, tauriConfig, cargoManifest, source, offlinePage] = await Promise.all([
  read("package.json").then(JSON.parse),
  read("src-tauri/tauri.conf.json").then(JSON.parse),
  read("src-tauri/Cargo.toml"),
  read("src-tauri/src/main.rs"),
  read("desktop-ui/index.html"),
])

assert(packageJson.scripts["desktop:dev"], "desktop:dev script is missing")
assert(packageJson.scripts["desktop:build"], "desktop:build script is missing")
assert(packageJson.scripts["desktop:check"], "desktop:check script is missing")
assert(tauriConfig.productName === "Torrance Yachts", "product name must be Torrance Yachts")
assert(tauriConfig.identifier === "com.torranceyachts.charteroperations", "bundle identifier changed")
assert(JSON.stringify(tauriConfig.bundle.targets) === JSON.stringify(["nsis"]), "only the NSIS bundle target is allowed")
assert(tauriConfig.bundle.windows.nsis.installMode === "currentUser", "installer must remain per-user")
assert(tauriConfig.bundle.windows.nsis.startMenuFolder === "Torrance Yachts", "Start Menu folder is missing")
assert(tauriConfig.bundle.updater === undefined, "auto-updater must not be configured")
assert(!("plugins" in tauriConfig), "desktop shell must not configure native plugins")
assert(cargoManifest.includes('tauri = { version = "2", features = [] }'), "Tauri must not enable native plugin features")
assert(!cargoManifest.match(/^(?!.*tauri-build).*tauri-plugin-/m), "desktop shell must not add Tauri plugins")
assert(source.includes('const LOCAL_APP_URL: &str = "http://127.0.0.1:3000"'), "loopback URL must remain fixed")
assert(source.includes('const HEALTH_PATH: &str = "/api/health/live"'), "health check endpoint must remain fixed")
assert(source.includes("fn is_allowed_navigation"), "navigation allow-list is missing")
assert(source.includes('.user_agent("TorranceYachtsDesktop/0.19.1")'), "desktop identity user agent is missing")
assert(!source.includes("ShellExt"), "shell execution must not be enabled")
assert(!source.includes("tauri_plugin"), "native plugins must not be enabled")
assert(offlinePage.includes('href="http://127.0.0.1:3000"'), "offline page must only link to the local workspace")
assert(!offlinePage.includes("https://"), "offline page must not link to remote content")

console.log("Desktop companion configuration is constrained to the local Tauri test shell.")
