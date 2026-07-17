import { Moon, Sun } from "lucide-react"

import { setThemeAction } from "@/app/actions/preferences"
import { buttonVariants } from "@/components/ui/button"

export function ThemeToggle({ initialTheme }: { initialTheme: "dark" | "light" }) {
  const nextTheme = initialTheme === "dark" ? "light" : "dark"

  return (
    <form action={setThemeAction}>
      <input name="theme" type="hidden" value={nextTheme} />
      <button
        aria-label={`Switch to ${nextTheme} mode`}
        className={buttonVariants({ size: "icon", variant: "ghost" })}
        title={`Switch to ${nextTheme} mode`}
        type="submit"
      >
        {initialTheme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      </button>
    </form>
  )
}
