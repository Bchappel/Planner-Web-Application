"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock } from "lucide-react"

export default function PasswordProtection() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check if already authenticated
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated")
    if (isAuthenticated === "true") {
      router.push("/dashboard")
    }
  }, [router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simple password check
    if (password === "bm200309") {
      localStorage.setItem("isAuthenticated", "true")
      setError(false)
      router.push("/dashboard")
    } else {
      setError(true)
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white/90 dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
      <div className="flex flex-col items-center mb-6">
        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Password Protected</h2>
        <p className="text-muted-foreground text-center mt-2">Please enter the password to access this site.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`focus:ring-0 focus:ring-offset-0 focus:border-gray-300 dark:focus:border-gray-600 ${error ? "border-red-500" : ""}`}
            autoFocus
          />
          {error && <p className="text-sm text-red-500">Incorrect password. Please try again.</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Checking..." : "Access Site"}
        </Button>
      </form>
    </div>
  )
}
