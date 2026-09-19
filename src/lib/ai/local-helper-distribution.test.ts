import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

describe("Torrance Local AI distribution", () => {
  it("publishes the reviewed helper without altering it", async () => {
    const [source, published] = await Promise.all([
      readFile(join(process.cwd(), "ops", "local-ai-helper.mjs"), "utf8"),
      readFile(join(process.cwd(), "public", "torrance-local-ai.mjs"), "utf8"),
    ])

    expect(published).toBe(source)
  })

  it("keeps the helper outbound-only and registers a per-user macOS agent", async () => {
    const helper = await readFile(join(process.cwd(), "ops", "local-ai-helper.mjs"), "utf8")

    expect(helper).toContain('fetch("http://127.0.0.1:11434/api/tags"')
    expect(helper).toContain('await run("launchctl", ["bootstrap"')
    expect(helper).toContain('if (process.platform !== "darwin")')
    expect(helper).not.toContain('0.0.0.0:11434')
    expect(helper).toContain('const token = pairingCode ? await pair() : await loadToken()')
    expect(helper).toContain('createHash("sha256").update(serverUrl.origin)')
    expect(helper).toContain('while (true)')
    expect(helper).not.toContain('setInterval(')
    expect(helper).toContain('AbortSignal.timeout(30_000)')
    expect(helper).toContain('redirect: "error"')
  })
})
