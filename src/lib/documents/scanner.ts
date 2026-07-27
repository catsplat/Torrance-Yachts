import "server-only"

import { Socket } from "node:net"

export type DocumentScanResult =
  | { status: "clean"; detail: string }
  | { status: "infected"; detail: string }
  | { status: "error"; detail: string }

const chunkSize = 64 * 1024

function scannerAddress() {
  return {
    host: process.env.CLAMAV_HOST ?? "127.0.0.1",
    port: Number.parseInt(process.env.CLAMAV_PORT ?? "3310", 10),
    timeoutMs: Number.parseInt(process.env.CLAMAV_TIMEOUT_MS ?? "12000", 10),
  }
}

/**
 * Send one untrusted file to ClamAV using its documented INSTREAM protocol.
 * The scanner is intentionally isolated behind this small contract so a
 * different production scanner can be substituted without changing workflows.
 */
export async function scanDocumentBuffer(buffer: Buffer): Promise<DocumentScanResult> {
  const { host, port, timeoutMs } = scannerAddress()
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { status: "error", detail: "Document scanner configuration is invalid." }
  }

  return new Promise((resolve) => {
    const socket = new Socket()
    let settled = false
    let response = ""
    const finish = (result: DocumentScanResult) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(result)
    }

    socket.setTimeout(timeoutMs)
    socket.once("error", () => {
      finish({ status: "error", detail: "Document scanner is unavailable; the file remains quarantined." })
    })
    socket.once("timeout", () => {
      finish({ status: "error", detail: "Document scanner timed out; the file remains quarantined." })
    })
    socket.on("data", (chunk: Buffer) => {
      response += chunk.toString("utf8")
      if (response.includes("\n") || response.includes("\0")) {
        if (/\bOK\b/.test(response)) {
          finish({ status: "clean", detail: "ClamAV reported no known malware." })
        } else if (/\bFOUND\b/.test(response)) {
          finish({ status: "infected", detail: "ClamAV detected malware; the quarantined file was blocked." })
        } else {
          finish({ status: "error", detail: "Document scanner returned an unrecognised response." })
        }
      }
    })
    socket.connect(port, host, () => {
      socket.write(Buffer.from("zINSTREAM\0"))
      for (let offset = 0; offset < buffer.length; offset += chunkSize) {
        const chunk = buffer.subarray(offset, Math.min(offset + chunkSize, buffer.length))
        const size = Buffer.alloc(4)
        size.writeUInt32BE(chunk.length)
        socket.write(size)
        socket.write(chunk)
      }
      socket.write(Buffer.alloc(4))
    })
  })
}
