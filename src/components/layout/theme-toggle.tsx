"use client"

import { Moon, Sun } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"

export function ThemeToggle({ initialTheme }: { initialTheme: "dark" | "light" }) {
  const [theme, setTheme] = useState(initialTheme)
  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark"
    document.documentElement.classList.toggle("dark", nextTheme === "dark")
    document.cookie = `ty-theme=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax`
    setTheme(nextTheme)
  }
  return (
    <Button
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      onClick={toggleTheme}
      size="icon"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      type="button"
      variant="ghost"
    >
      {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  )
}
