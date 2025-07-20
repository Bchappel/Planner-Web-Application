"use client"

import { useState, useEffect } from "react"
import { format, startOfWeek, addDays, isSameDay, isBefore, startOfDay } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar, Dumbbell, Lock } from "lucide-react"
import WorkoutTracker from "@/components/workout/workout-tracker"
import { useToast } from "@/hooks/use-toast"
import { getExercisesForDay, getWorkout, getTestUserId } from "@/lib/actions/workout-actions"

export default function WorkoutsPage() {
  const { toast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [exercises, setExercises] = useState<any[]>([])
  const [existingWorkout, setExistingWorkout] = useState<any>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dataKey, setDataKey] = useState(0) // Add a key to force re-fetch
  const [workoutDays, setWorkoutDays] = useState<Set<number>>(new Set()) // Track which days have workouts

  // Check if the selected date is in the past (read-only mode)
  const isPastDate = isBefore(startOfDay(selectedDay), startOfDay(new Date()))

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

  // Fetch workout days for the current week
  useEffect(() => {
    const fetchWorkoutDays = async () => {
      const workoutDaysSet = new Set<number>()

      // Check each day of the week for exercises
      for (let i = 0; i < 7; i++) {
        try {
          const dayOfWeek = i
          const exercisesData = await getExercisesForDay(dayOfWeek)
          if (exercisesData && exercisesData.length > 0) {
            workoutDaysSet.add(dayOfWeek)
          }
        } catch (error) {
          console.error(`Error fetching exercises for day ${i}:`, error)
        }
      }

      setWorkoutDays(workoutDaysSet)
    }

    fetchWorkoutDays()
  }, [currentDate])

  // Fetch exercises and workout data when selected day changes
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return

      setIsLoading(true)
      try {
        // Get exercises for the selected day
        const dayOfWeek = selectedDay.getDay()
        const exercisesData = await getExercisesForDay(dayOfWeek)
        setExercises(exercisesData)

        // Get existing workout data if available
        const formattedDate = format(selectedDay, "yyyy-MM-dd")
        console.log("Fetching workout for date:", formattedDate)

        const workoutData = await getWorkout(userId, formattedDate)
        console.log("Fetched workout data:", workoutData)

        if (workoutData.success && workoutData.data) {
          setExistingWorkout(workoutData.data)
          console.log("Set existing workout:", workoutData.data)
        } else if (!workoutData.success) {
          console.error("Error fetching workout:", workoutData.message)
          toast({
            title: "Error",
            description: workoutData.message || "Failed to load workout data. Please try again.",
            variant: "destructive",
          })
          setExistingWorkout(null)
        } else {
          setExistingWorkout(null)
          console.log("No existing workout found")
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load workout data. Please try again.",
          variant: "destructive",
        })
        setExistingWorkout(null)
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

  // Handle workout save
  const handleWorkoutSaved = () => {
    // Force re-fetch data after save
    setDataKey((prev) => prev + 1)

    toast({
      title: "Workout saved",
      description: `Your workout for ${format(selectedDay, "EEEE, MMMM d")} has been saved.`,
    })
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Workout Tracker</h1>

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
          const dayOfWeek = day.getDay()
          const hasWorkout = workoutDays.has(dayOfWeek)

          return (
            <Button
              key={day.toISOString()}
              variant={isSelected ? "default" : isToday ? "secondary" : "outline"}
              className={`h-auto py-3 flex flex-col ${isSelected ? "ring-2 ring-primary" : ""} ${
                isToday && !isSelected ? "border-blue-400 dark:border-blue-500" : ""
              }`}
              onClick={() => selectDay(day)}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs">{format(day, "EEE")}</span>
                {hasWorkout && <Dumbbell className="h-3 w-3" />}
              </div>
              <span className="text-lg font-bold">{format(day, "d")}</span>
            </Button>
          )
        })}
      </div>

      {/* Read-only notice for past dates */}
      {isPastDate && (
        <div className="mb-4 p-3 bg-muted/50 border border-muted rounded-md">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>This workout is from a previous day and cannot be modified. Only today's workout can be edited.</span>
          </div>
        </div>
      )}

      {/* Selected Day Workout */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : userId ? (
            <WorkoutTracker
              key={`workout-${selectedDay.toISOString()}-${dataKey}`}
              exercises={exercises}
              date={selectedDay}
              userId={userId}
              existingWorkout={existingWorkout}
              onWorkoutSaved={handleWorkoutSaved}
              isPastDate={isPastDate}
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
