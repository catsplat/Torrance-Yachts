import { z } from "zod"

const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean())

export const alertPreferencesSchema = z.object({
  aiSummaryEnabled: checkbox,
  charterEnabled: checkbox,
  emailEnabled: checkbox,
  followUpEnabled: checkbox,
  inAppEnabled: checkbox,
  integrationFailureEnabled: checkbox,
  internalEmailEnabled: checkbox,
  newEnquiryEnabled: checkbox,
  notificationEmail: z.union([z.literal(""), z.email().max(320)]),
  paymentEnabled: checkbox,
  phone: z.string().trim().max(32),
  reason: z.string().trim().min(2).max(2000),
  taskEnabled: checkbox,
  telegramChatId: z.string().trim().max(64),
  telegramEnabled: checkbox,
  unknownEmailEnabled: checkbox,
}).superRefine((value, context) => {
  if (value.telegramEnabled && !value.telegramChatId) {
    context.addIssue({
      code: "custom",
      message: "Enter a Telegram chat ID before enabling Telegram alerts.",
      path: ["telegramChatId"],
    })
  }
  if (value.emailEnabled && !value.notificationEmail) {
    context.addIssue({
      code: "custom",
      message: "Enter an alert email before enabling email alerts.",
      path: ["notificationEmail"],
    })
  }
  if (!value.inAppEnabled && !value.telegramEnabled && !value.emailEnabled) {
    context.addIssue({
      code: "custom",
      message: "Keep at least one alert channel enabled.",
    })
  }
})

export const gmailOauthCredentialsSchema = z.object({
  accountEmail: z.email().max(320),
  clientId: z.string().trim().min(8).max(1000),
  clientSecret: z.string().trim().min(8).max(2000),
  reason: z.string().trim().min(2).max(2000),
  refreshToken: z.string().trim().min(8).max(5000),
  scopes: z.string().trim().max(5000),
})

export const gmailOauthDisconnectSchema = z.object({
  reason: z.string().trim().min(2).max(2000),
})

export const googleSpreadsheetSelectionSchema = z.object({
  spreadsheetId: z.string().trim().min(1).max(500),
  spreadsheetName: z.string().trim().min(1).max(500),
})

export const notificationReadSchema = z.object({
  notificationId: z.uuid(),
})
