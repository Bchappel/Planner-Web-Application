"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Save, Loader2, Edit, Play } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { saveWorkout } from "@/lib/actions/workout-actions"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import EditWorkoutDialog from "./edit-workout-dialog"
import ExerciseGifModal from "./exercise-gif-modal"

// Types for our workout data
interface Exercise {
  id: string | number
  name: string
  category: string
}

interface ExerciseWithTracking extends Exercise {
  id: string | number
  name: string
  category: string
  completed: boolean
  weight: string
  sets: string
  reps: string
}

interface WorkoutTrackerProps {
  exercises: Exercise[]
  date: Date
  userId: number
  existingWorkout?: {
    exercises: {
      exerciseId: string | number
      name: string
      category: string
      completed: boolean
      weight?: string
      sets?: string
      reps?: string
    }[]
  } | null
  onWorkoutSaved?: () => void
  isPastDate?: boolean
}

export default function WorkoutTracker({
  exercises,
  date,
  userId,
  existingWorkout,
  onWorkoutSaved,
  isPastDate = false,
}: WorkoutTrackerProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [exercisesWithTracking, setExercisesWithTracking] = useState<ExerciseWithTracking[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isGifModalOpen, setIsGifModalOpen] = useState(false)
  const [selectedExerciseName, setSelectedExerciseName] = useState("")

  // Initialize exercises with completion status and weight
  useEffect(() => {
    console.log("Initializing with existing workout:", existingWorkout)

    if (existingWorkout && existingWorkout.exercises && existingWorkout.exercises.length > 0) {
      // Create a map of completed exercises by name for easier lookup
      const completedExerciseMap = new Map()
      existingWorkout.exercises.forEach((e) => {
        completedExerciseMap.set(e.name, {
          completed: true,
          weight: e.weight || "",
          sets: e.sets || "",
          reps: e.reps || "",
        })
      })

      // Map exercises to include completion status and weight based on name matching
      const mappedExercises = exercises.map((exercise) => {
        const existingData = completedExerciseMap.get(exercise.name)
        return {
          ...exercise,
          completed: existingData ? existingData.completed : false,
          weight: existingData ? existingData.weight : "",
          sets: existingData ? existingData.sets : "",
          reps: existingData ? existingData.reps : "",
        }
      })

      setExercisesWithTracking(mappedExercises)
      console.log("Mapped exercises with tracking:", mappedExercises)
    } else {
      // Default initialization with all exercises uncompleted and no weight
      setExercisesWithTracking(
        exercises.map((exercise) => ({
          ...exercise,
          completed: false,
          weight: "",
          sets: "",
          reps: "",
        })),
      )
    }
  }, [exercises, existingWorkout])

  // Toggle exercise completion
  const toggleExerciseCompletion = (exerciseIndex: number, completed: boolean) => {
    if (isPastDate) {
      toast({
        title: "Cannot modify",
        description: "Past workouts cannot be modified.",
        variant: "destructive",
      })
      return
    }

    const updatedExercises = [...exercisesWithTracking]
    updatedExercises[exerciseIndex].completed = completed
    setExercisesWithTracking(updatedExercises)
  }

  // Update exercise weight
  const updateExerciseWeight = (exerciseIndex: number, weight: string) => {
    if (isPastDate) return // Prevent updates for past dates

    const updatedExercises = [...exercisesWithTracking]
    updatedExercises[exerciseIndex].weight = weight
    setExercisesWithTracking(updatedExercises)
  }

  // Update exercise sets
  const updateExerciseSets = (exerciseIndex: number, sets: string) => {
    if (isPastDate) return // Prevent updates for past dates

    const updatedExercises = [...exercisesWithTracking]
    updatedExercises[exerciseIndex].sets = sets
    setExercisesWithTracking(updatedExercises)
  }

  // Update exercise reps
  const updateExerciseReps = (exerciseIndex: number, reps: string) => {
    if (isPastDate) return // Prevent updates for past dates

    const updatedExercises = [...exercisesWithTracking]
    updatedExercises[exerciseIndex].reps = reps
    setExercisesWithTracking(updatedExercises)
  }

  // Show exercise demonstration
  const showExerciseDemo = (exerciseName: string) => {
    setSelectedExerciseName(exerciseName)
    setIsGifModalOpen(true)
  }

  // Save workout data
  const saveWorkoutData = async () => {
    if (isPastDate) {
      toast({
        title: "Cannot save",
        description: "Past workouts cannot be modified.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare data for database
      const workoutData = {
        userId: userId,
        date: format(date, "yyyy-MM-dd"),
        exercises: exercisesWithTracking,
      }

      console.log("Saving workout data:", workoutData)

      // Send data to the server action
      const result = await saveWorkout(workoutData)

      if (result.success) {
        if (onWorkoutSaved) {
          onWorkoutSaved()
        } else {
          toast({
            title: "Workout saved",
            description: `Your workout for ${format(date, "EEEE, MMMM d")} has been saved.`,
          })
        }
      } else {
        throw new Error(result.message || "Failed to save workout")
      }
    } catch (error) {
      console.error("Error saving workout:", error)
      toast({
        title: "Error",
        description: "Failed to save workout. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle updated exercises from the edit dialog
  const handleExercisesUpdated = (updatedExercises: Exercise[]) => {
    if (isPastDate) {
      toast({
        title: "Cannot modify",
        description: "Past workouts cannot be modified.",
        variant: "destructive",
      })
      return
    }

    // Map the updated exercises to include tracking info
    const updatedWithTracking = updatedExercises.map((exercise) => {
      // Try to find the exercise in the current list to preserve weight and completion
      const existingExercise = exercisesWithTracking.find((e) => e.id === exercise.id)
      return {
        ...exercise,
        completed: existingExercise ? existingExercise.completed : false,
        weight: existingExercise ? existingExercise.weight : "",
        sets: existingExercise ? existingExercise.sets : "",
        reps: existingExercise ? existingExercise.reps : "",
      }
    })

    setExercisesWithTracking(updatedWithTracking)
    setIsEditDialogOpen(false)

    toast({
      title: "Workout updated",
      description: "Your workout exercises have been updated. Don't forget to save your workout.",
    })
  }

  // Group exercises by category
  const exercisesByCategory = exercisesWithTracking.reduce(
    (acc, exercise, index) => {
      if (!acc[exercise.category]) {
        acc[exercise.category] = []
      }
      acc[exercise.category].push({ ...exercise, originalIndex: index })
      return acc
    },
    {} as Record<string, (ExerciseWithTracking & { originalIndex: number })[]>,
  )

  // Get all categories and limit to 5 for grid layout
  const categories = Object.keys(exercisesByCategory).slice(0, 5)

  // Calculate completion stats
  const completedCount = exercisesWithTracking.filter((ex) => ex.completed).length
  const totalCount = exercisesWithTracking.length
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header with Save Button */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
          <h2 className="text-lg sm:text-xl font-semibold text-center sm:text-left">
            {format(date, "EEEE, MMMM d")}
            {isPastDate && (
              <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md">Read Only</span>
            )}
          </h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(true)}
              className="flex items-center justify-center text-sm w-full sm:w-auto"
              size="sm"
              disabled={isPastDate}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Exercises
            </Button>
            <Button
              onClick={saveWorkoutData}
              disabled={isSubmitting || isPastDate}
              className="text-sm w-full sm:w-auto"
              size="sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Workout
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="w-full space-y-2">
          <div className="flex justify-between text-xs sm:text-sm">
            <span>
              {completedCount} of {totalCount} exercises completed
            </span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid Layout for Muscle Groups */}
      {categories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
          {categories.map((category) => (
            <div key={category} className="space-y-3 sm:space-y-4">
              {/* Muscle Group Header */}
              <div className="text-center">
                <h3 className="text-base sm:text-lg font-semibold text-primary border-b-2 border-primary pb-2">
                  {category}
                </h3>
              </div>

              {/* Exercises in this category */}
              <div className="space-y-2 sm:space-y-3">
                {exercisesByCategory[category].map((exercise) => {
                  const isCompleted = exercise.completed

                  return (
                    <div
                      key={exercise.id}
                      className={cn(
                        "border rounded-lg p-3 sm:p-4 transition-colors",
                        isCompleted ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" : "",
                      )}
                    >
                      {/* Exercise Name and Controls */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 mr-2">
                          <h4 className="text-xs sm:text-sm font-medium leading-tight truncate" title={exercise.name}>
                            {exercise.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => showExerciseDemo(exercise.name)}
                            className="h-6 w-6 p-0 flex items-center justify-center border border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-400 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 dark:hover:border-blue-700"
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                          <Checkbox
                            checked={isCompleted}
                            onCheckedChange={(checked) => toggleExerciseCompletion(exercise.originalIndex, !!checked)}
                            className={cn(
                              "h-4 w-4 sm:h-5 sm:w-5 transition-colors flex-shrink-0",
                              isCompleted
                                ? "bg-green-500 text-white border-green-500 hover:bg-green-600 hover:border-green-600"
                                : "",
                            )}
                            disabled={isPastDate}
                          />
                        </div>
                      </div>

                      {/* Input Fields */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground w-10 sm:w-12 flex-shrink-0">Weight:</span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder=""
                            className="h-6 sm:h-7 text-xs"
                            value={exercise.weight}
                            onChange={(e) => updateExerciseWeight(exercise.originalIndex, e.target.value)}
                            disabled={isPastDate}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground w-10 sm:w-12 flex-shrink-0">Sets:</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder=""
                            className="h-6 sm:h-7 text-xs"
                            value={exercise.sets}
                            onChange={(e) => updateExerciseSets(exercise.originalIndex, e.target.value)}
                            disabled={isPastDate}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground w-10 sm:w-12 flex-shrink-0">Reps:</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder=""
                            className="h-6 sm:h-7 text-xs"
                            value={exercise.reps}
                            onChange={(e) => updateExerciseReps(exercise.originalIndex, e.target.value)}
                            disabled={isPastDate}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm sm:text-lg text-muted-foreground">No exercises selected for this day.</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
            Click "Edit Exercises" to add exercises to your workout.
          </p>
        </div>
      )}

      {/* Edit Workout Dialog */}
      <EditWorkoutDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        currentExercises={exercisesWithTracking}
        date={date}
        onExercisesUpdated={handleExercisesUpdated}
      />

      {/* Exercise GIF Modal */}
      <ExerciseGifModal open={isGifModalOpen} onOpenChange={setIsGifModalOpen} exerciseName={selectedExerciseName} />
    </div>
  )
}
