"use client"

import { useState, useEffect } from "react"
import { format, startOfWeek, addDays, isSameDay } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getNutritionLog, getTestUserId } from "@/lib/actions/nutrition-actions"
import NutritionTracker from "@/components/nutrition/nutrition-tracker"

export default function NutritionPage() {
  const { toast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [nutritionLog, setNutritionLog] = useState<any>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dataKey, setDataKey] = useState(0) // Add a key to force re-fetch

  // Generate week days starting from Sunday
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 0 })
  const weekDays = [...Array(7)].map((_, i) => addDays(startOfCurrentWeek, i))

  // Fetch test user ID on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const id = await getTestUserId()
        if (id) {
          setUserId(id)
        } else {
          toast({
            title: "Error",
            description: "Could not find test user. Please check your database setup.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching user ID:", error)
      }
    }

    fetchUserId()
  }, [toast])

  // Fetch nutrition log when selected day changes
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return

      setIsLoading(true)
      try {
        // Get existing nutrition log if available
        const formattedDate = format(selectedDay, "yyyy-MM-dd")

        const logData = await getNutritionLog(userId, formattedDate)

        if (logData.success) {
          setNutritionLog(logData.data)
        } else {
          setNutritionLog(null)
          toast({
            title: "Error",
            description: logData.message || "Failed to load nutrition data",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load nutrition data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedDay, userId, toast, dataKey]) // Add dataKey to dependencies

  // Navigate to previous/next week
  const goToPreviousWeek = () => {
    const previousWeek = addDays(currentDate, -7)
    setCurrentDate(previousWeek)
    setSelectedDay(previousWeek)
  }

  const goToNextWeek = () => {
    const nextWeek = addDays(currentDate, 7)
    setCurrentDate(nextWeek)
    setSelectedDay(nextWeek)
  }

  // Jump to today
  const jumpToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDay(today)
  }

  // Handle day selection
  const selectDay = (day: Date) => {
    setSelectedDay(day)
  }

  // Handle nutrition log save
  const handleNutritionSaved = () => {
    // Force re-fetch data after save
    setDataKey((prev) => prev + 1)

    toast({
      title: "Nutrition log saved",
      description: `Your nutrition log for ${format(selectedDay, "EEEE, MMMM d")} has been saved.`,
    })
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Nutrition Tracker</h1>

      {/* Weekly Calendar Navigation */}
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous Week
            </Button>
            <Button variant="outline" size="sm" onClick={jumpToToday}>
              <Calendar className="h-4 w-4 mr-1" /> Today
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            Next Week <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="text-center">
          <h2 className="text-lg sm:text-xl font-semibold">Week of {format(startOfCurrentWeek, "MMMM d, yyyy")}</h2>
        </div>
      </div>

      {/* Weekly Calendar */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDay)
          const isToday = isSameDay(day, new Date())

          return (
            <Button
              key={day.toISOString()}
              variant={isSelected ? "default" : isToday ? "secondary" : "outline"}
              className={`h-auto py-3 flex flex-col ${isSelected ? "ring-2 ring-primary" : ""} ${
                isToday && !isSelected ? "border-blue-400 dark:border-blue-500" : ""
              }`}
              onClick={() => selectDay(day)}
            >
              <span className="text-xs">{format(day, "EEE")}</span>
              <span className="text-lg font-bold">{format(day, "d")}</span>
            </Button>
          )
        })}
      </div>

      {/* Selected Day Nutrition */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : userId ? (
            <NutritionTracker
              key={`nutrition-${selectedDay.toISOString()}-${dataKey}`}
              date={selectedDay}
              userId={userId}
              existingLog={nutritionLog}
              onNutritionSaved={handleNutritionSaved}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-lg text-muted-foreground">Loading user data...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
