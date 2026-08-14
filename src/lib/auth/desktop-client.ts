export function isTauriDesktopUserAgent(userAgent: string | null) {
  return userAgent?.includes("TorranceYachtsDesktop/") ?? false
}
