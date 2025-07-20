import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { geist } from "./fonts"

export const metadata: Metadata = {
  title: "BC Tracker",
  description: "Personal fitness tracker",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={geist.className}>
      <body>{children}</body>
    </html>
  )
}
