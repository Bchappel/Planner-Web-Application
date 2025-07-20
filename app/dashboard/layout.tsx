import type React from "react"
import Toolbar from "@/components/navigation/toolbar"
import AuthProtection from "@/components/auth/auth-protection"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProtection>
      <div className="min-h-screen flex flex-col">
        <Toolbar />
        <main className="flex-1">{children}</main>
      </div>
    </AuthProtection>
  )
}
