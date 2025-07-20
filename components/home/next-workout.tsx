"use client"

import { useState, useEffect } from "react"
import { format, addDays } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dumbbell, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { getExercisesForDay } from "@/lib/actions/workout-actions"

export default function NextWorkout() {
  const [exercises, setExercises] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Get the next workout day (tomorrow if today is a rest day, otherwise today)
  const today = new Date()
  const todayDayOfWeek = today.getDay()

  // Check if today is a rest day (Sunday or Saturday)
  const isTodayRestDay = todayDayOfWeek === 0 || todayDayOfWeek === 6

  // If today is a rest day, show tomorrow's workout, otherwise show today's
  const nextWorkoutDate = isTodayRestDay ? addDays(today, 1) : today
  const nextWorkoutDayOfWeek = nextWorkoutDate.getDay()

  // Get category for the day
  const getDayCategory = (dayOfWeek: number) => {
    const categories: Record<number, string> = {
      0: "Rest",
      1: "Chest",
      2: "Back",
      3: "Legs",
      4: "Shoulders",
      5: "Back",
      6: "Rest",
    }
    return categories[dayOfWeek] || ""
  }

  const workoutCategory = getDayCategory(nextWorkoutDayOfWeek)

  useEffect(() => {
    const fetchExercises = async () => {
      setIsLoading(true)
      try {
        // Get exercises for the next workout day
        const exercisesData = await getExercisesForDay(nextWorkoutDayOfWeek)

        // Check if exercisesData is an array (old format) or an object with exercises property (new format)
        if (Array.isArray(exercisesData)) {
          setExercises(exercisesData)
        } else if (exercisesData && typeof exercisesData === "object") {
          // Handle the new format where exercises are in the exercises property
          if (exercisesData.success && Array.isArray(exercisesData.exercises)) {
            setExercises(exercisesData.exercises)
          } else {
            // If we can't find exercises in the expected format, set an empty array
            console.error("Unexpected format for exercises data:", exercisesData)
            setExercises([])
          }
        } else {
          // Fallback to empty array if data format is unexpected
          console.error("Unexpected format for exercises data:", exercisesData)
          setExercises([])
        }
      } catch (error) {
        console.error("Error fetching exercises:", error)
        setExercises([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchExercises()
  }, [nextWorkoutDayOfWeek])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg sm:text-xl flex items-center">
          <Dumbbell className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          {isTodayRestDay ? "Tomorrow's Workout" : "Today's Workout"}
        </CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {format(nextWorkoutDate, "EEEE, MMMM d")} - {workoutCategory}
        </p>
      </CardHeader>
      <CardContent className="flex-1 px-4 sm:px-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : exercises.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm">It's a rest day! Time to recover and recharge.</p>
          </div>
        ) : exercises[0]?.name === "Rest Day" ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm">Rest day. Recover and prepare for your next workout!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-2">
              {exercises.slice(0, 4).map((exercise) => (
                <div key={exercise.id} className="flex items-center p-2 rounded-md border">
                  <div className="ml-2">
                    <p className="font-medium text-sm">{exercise.name}</p>
                    <p className="text-xs text-muted-foreground">{exercise.category}</p>
                  </div>
                </div>
              ))}
              {exercises.length > 4 && (
                <p className="text-xs sm:text-sm text-muted-foreground text-center">
                  +{exercises.length - 4} more exercises
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 px-4 sm:px-6">
        <Button asChild className="w-full text-sm">
          <Link href="/dashboard/workouts" className="flex items-center justify-center">
            <span className="flex-shrink-0">Go to Workout</span>
            <ChevronRight className="ml-2 h-4 w-4 flex-shrink-0" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
