import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { createLocalEmailSuggestion } from "./local-analysis"

import { OllamaProvider } from "./ollama-provider"

const originalFetch = global.fetch
const originalModel = process.env.OLLAMA_MODEL

afterEach(() => {
  global.fetch = originalFetch
  if (originalModel === undefined) delete process.env.OLLAMA_MODEL
  else process.env.OLLAMA_MODEL = originalModel
})

describe("Ollama provider", () => {
  it("sends a non-streaming structured email request to local Ollama", async () => {
    process.env.OLLAMA_MODEL = "qwen3.5:4b-q4_K_M"
    const expected = createLocalEmailSuggestion({
      body: "Please advise M/Y Asteria for 10 guests from 14 August 2026 to 21 August 2026.",
      receivedAt: "2026-07-26T09:00:00Z",
      senderEmail: "alex@example.test",
      senderName: "Alex Morgan",
      subject: "Synthetic charter enquiry",
      yachts: [],
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      eval_count: 91,
      message: { content: JSON.stringify(expected) },
      model: "qwen3.5:4b-q4_K_M",
      prompt_eval_count: 123,
    }), { status: 200 }))
    global.fetch = fetchMock

    const result = await new OllamaProvider().analyzeEmail({
      body: "Please advise M/Y Asteria for 10 guests from 14 August 2026 to 21 August 2026.",
      receivedAt: "2026-07-26T09:00:00Z",
      senderEmail: "alex@example.test",
      senderName: "Alex Morgan",
      subject: "Synthetic charter enquiry",
      yachts: [],
    }, "user_synthetic")

    expect(result.provider).toBe("ollama")
    expect(result.inputTokens).toBe(123)
    expect(result.outputTokens).toBe(91)
    expect(result.output.classification).toBe("new_enquiry")
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, request] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(url.toString()).toBe("http://127.0.0.1:11434/api/chat")
    expect(JSON.parse(String(request.body))).toMatchObject({
      model: "qwen3.5:4b-q4_K_M",
      stream: false,
      think: false,
    })
    const payload = JSON.parse(String(request.body)) as { format: string }
    expect(payload.format).toBe("json")
  })

  it("rejects malformed provider output before it can reach workflow logic", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: { content: "not-json" },
    }), { status: 200 }))

    await expect(new OllamaProvider().analyzeEmail({
      body: "Synthetic email",
      receivedAt: "2026-07-26T09:00:00Z",
      senderEmail: "alex@example.test",
      senderName: "Alex Morgan",
      subject: "Synthetic test",
      yachts: [],
    }, "user_synthetic")).rejects.toThrow("invalid JSON")
  })

  it("exposes an unavailable local provider as a failed request", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"))

    await expect(new OllamaProvider().analyzeEmail({
      body: "Synthetic email",
      receivedAt: "2026-07-26T09:00:00Z",
      senderEmail: "alex@example.test",
      senderName: "Alex Morgan",
      subject: "Synthetic test",
      yachts: [],
    }, "user_synthetic")).rejects.toThrow("fetch failed")
  })

  it("exposes a local provider timeout without producing a workflow suggestion", async () => {
    global.fetch = vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError"))

    await expect(new OllamaProvider().analyzeEmail({
      body: "Synthetic email",
      receivedAt: "2026-07-26T09:00:00Z",
      senderEmail: "alex@example.test",
      senderName: "Alex Morgan",
      subject: "Synthetic test",
      yachts: [],
    }, "user_synthetic")).rejects.toThrow("Timed out")
  })
})
