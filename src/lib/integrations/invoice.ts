import "server-only"

import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export type InvoicePdfInput = {
  amount: number
  currency: string
  invoiceNumber: string
  issueDate: string
  issuerAddress: string
  issuerName: string
  paymentInstructions: string
  recipientAddress: string
  recipientName: string
  serviceDescription: string
}

function wrapText(text: string, maximumCharacters = 82) {
  const lines: string[] = []
  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) {
      lines.push("")
      continue
    }
    let current = ""
    for (const word of paragraph.split(/\s+/)) {
      const next = current ? `${current} ${word}` : word
      if (next.length > maximumCharacters && current) {
        lines.push(current)
        current = word
      } else current = next
    }
    if (current) lines.push(current)
  }
  return lines
}

export async function generateInvoicePdf(input: InvoicePdfInput) {
  const document = await PDFDocument.create()
  const page = document.addPage([595.28, 841.89])
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const dark = rgb(0.08, 0.12, 0.18)
  const muted = rgb(0.35, 0.4, 0.48)
  let y = 790

  page.drawText("INVOICE", { color: dark, font: bold, size: 25, x: 50, y })
  page.drawText(input.invoiceNumber, { color: muted, font: regular, size: 10, x: 420, y: y + 8 })
  y -= 45

  for (const line of [input.issuerName, ...input.issuerAddress.split(/\r?\n/)]) {
    page.drawText(line, { color: dark, font: regular, size: 10, x: 50, y })
    y -= 15
  }
  y -= 15
  page.drawText(`Issue date: ${input.issueDate}`, { color: muted, font: regular, size: 10, x: 50, y })
  y -= 38

  page.drawText("BILL TO", { color: muted, font: bold, size: 9, x: 50, y })
  y -= 18
  for (const line of [input.recipientName, ...input.recipientAddress.split(/\r?\n/)]) {
    page.drawText(line, { color: dark, font: regular, size: 10, x: 50, y })
    y -= 15
  }
  y -= 32

  page.drawRectangle({ borderColor: rgb(0.83, 0.86, 0.9), borderWidth: 1, height: 34, width: 495, x: 50, y: y - 7 })
  page.drawText("Description", { color: muted, font: bold, size: 9, x: 62, y: y + 6 })
  page.drawText("Amount", { color: muted, font: bold, size: 9, x: 455, y: y + 6 })
  y -= 35
  for (const line of wrapText(input.serviceDescription, 65)) {
    page.drawText(line, { color: dark, font: regular, size: 10, x: 62, y })
    y -= 15
  }
  page.drawText(
    `${input.currency} ${input.amount.toFixed(2)}`,
    { color: dark, font: bold, size: 10, x: 440, y: y + 15 },
  )
  y -= 25
  page.drawLine({ color: rgb(0.83, 0.86, 0.9), end: { x: 545, y }, start: { x: 50, y }, thickness: 1 })
  y -= 28
  page.drawText("TOTAL", { color: muted, font: bold, size: 10, x: 390, y })
  page.drawText(
    `${input.currency} ${input.amount.toFixed(2)}`,
    { color: dark, font: bold, size: 13, x: 448, y: y - 2 },
  )
  y -= 60
  page.drawText("PAYMENT INSTRUCTIONS", { color: muted, font: bold, size: 9, x: 50, y })
  y -= 20
  for (const line of wrapText(input.paymentInstructions)) {
    page.drawText(line, { color: dark, font: regular, size: 9, x: 50, y })
    y -= 14
  }
  page.drawText(
    "Generated from human-approved contract data. Review before external use.",
    { color: muted, font: regular, size: 8, x: 50, y: 40 },
  )
  return document.save()
}
