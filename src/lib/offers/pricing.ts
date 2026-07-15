const millisecondsPerDay = 24 * 60 * 60 * 1000

export function calculateCharterDays(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`)
  const days = (end - start) / millisecondsPerDay

  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new Error("Charter dates must define between 1 and 365 days.")
  }

  return days
}

export function calculateCharterFee(
  weeklyRate: number,
  charterDays: number,
  shortCharterDivisor: number,
) {
  if (!Number.isFinite(weeklyRate) || weeklyRate <= 0) {
    throw new Error("Weekly rate must be positive.")
  }
  if (!Number.isInteger(charterDays) || charterDays < 1 || charterDays > 365) {
    throw new Error("Charter days must be a whole number between 1 and 365.")
  }
  if (!Number.isFinite(shortCharterDivisor) || shortCharterDivisor <= 0) {
    throw new Error("Short-charter divisor must be positive.")
  }

  const rawFee = charterDays < 7
    ? weeklyRate / shortCharterDivisor * charterDays
    : weeklyRate / 7 * charterDays

  return Math.round((rawFee + Number.EPSILON) * 100) / 100
}

export function formatCommercialNumber(value: number) {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
