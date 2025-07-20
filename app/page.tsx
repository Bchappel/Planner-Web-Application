"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import BackgroundPaths from "../components/ui/background-paths"
import PasswordProtection from "@/components/auth/password-protection"

export default function LandingPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const authStatus = localStorage.getItem("isAuthenticated") === "true"
    setIsAuthenticated(authStatus)
    setIsLoading(false)

    // If authenticated, redirect to dashboard
    if (authStatus) {
      router.push("/dashboard")
    }
  }, [router])

  const handleDiscoverClick = () => {
    router.push("/dashboard")
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If not authenticated, show password protection
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <BackgroundPaths title="BC Tracker" hideButton>
          <div className="mt-8">
            <PasswordProtection />
          </div>
        </BackgroundPaths>
      </div>
    )
  }

  // If authenticated, show the normal landing page
  return <BackgroundPaths title="BC Tracker" onButtonClick={handleDiscoverClick} />
}
