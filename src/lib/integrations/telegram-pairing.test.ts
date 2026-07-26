import { describe, expect, it } from "vitest"

import {
  createTelegramPairingUrl,
  extractTelegramPairingToken,
  hashTelegramPairingToken,
} from "./telegram-pairing"

describe("Telegram pairing helpers", () => {
  const token = "6G4W1YHct7tcLfdRZi8oRcnzjMe7TVslO9NIjfNKBmE"

  it("creates a constrained company-bot deep link", () => {
    expect(createTelegramPairingUrl("TorranceOperationsBot", token)).toBe(
      `https://t.me/TorranceOperationsBot?start=ty_${token}`,
    )
  })

  it("accepts only the expected private start command", () => {
    expect(extractTelegramPairingToken(`/start ty_${token}`)).toBe(token)
    expect(extractTelegramPairingToken(`/start ${token}`)).toBeNull()
    expect(extractTelegramPairingToken("hello")).toBeNull()
  })

  it("hashes the raw token before database storage", () => {
    expect(hashTelegramPairingToken(token)).toHaveLength(64)
    expect(hashTelegramPairingToken(token)).not.toContain(token)
  })
})
