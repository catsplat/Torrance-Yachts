import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { connection } from "next/server";

import { getCurrentTheme } from "@/lib/preferences/data";
import { cn } from "@/lib/utils";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Operations | Torrance Yachts",
    template: "%s | Torrance Yachts",
  },
  description: "Private charter operations workspace for Torrance Yachts.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  const theme = await getCurrentTheme();
  return (
    <html
      lang="en"
      className={cn("font-sans", geist.variable, theme === "dark" && "dark")}
      suppressHydrationWarning
    >
      <body className="min-h-svh bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
