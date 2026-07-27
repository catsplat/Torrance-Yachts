import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
import { scanDocumentBuffer } from "./scanner"

const runLocalScannerTests = process.env.RUN_LOCAL_CLAMAV_TESTS === "true"

describe.skipIf(!runLocalScannerTests)("local ClamAV document scanner", () => {
  it("releases a benign synthetic PDF payload", async () => {
    await expect(scanDocumentBuffer(Buffer.from("%PDF-1.4\nSynthetic local test\n")))
      .resolves.toMatchObject({ status: "clean" })
  })

  it("blocks the standard EICAR antivirus test signature", async () => {
    const eicar = [
      "X5O!P%@AP[4\\PZX54(P^)7CC)7}$",
      "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*",
    ].join("")
    await expect(scanDocumentBuffer(Buffer.from(eicar)))
      .resolves.toMatchObject({ status: "infected" })
  })
})
