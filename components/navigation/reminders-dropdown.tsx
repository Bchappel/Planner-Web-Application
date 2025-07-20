"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { WeightReminder } from "@/components/reminders/weight-reminder"
import { getProfileData } from "@/lib/actions/profile-actions"
import { isFriday } from "date-fns"

interface RemindersDropdownProps {
  userId: number
}

export function RemindersDropdown({ userId }: RemindersDropdownProps) {
  const [currentWeight, setCurrentWeight] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const today = new Date()
  const isFridayToday = isFriday(today)

  // Fetch the user's current weight
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userId) return

      try {
        const result = await getProfileData(userId)

        if (result.success && result.data) {
          setCurrentWeight(result.data.weight || 0)
        }
      } catch (error) {
        console.error("Error fetching profile data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (open) {
      fetchProfileData()
    }
  }, [userId, open])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {isFridayToday && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="p-0">
        {isLoading ? (
          <div className="p-4 flex justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        ) : (
          <WeightReminder userId={userId} currentWeight={currentWeight} onClose={() => setOpen(false)} />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
