"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Loader2, X } from "lucide-react"
import { getAllExercises, saveCustomWorkoutForDate } from "@/lib/actions/workout-actions"
import { useToast } from "@/hooks/use-toast"

interface Exercise {
  id: string | number
  name: string
  category: string
}

interface EditWorkoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentExercises: Exercise[]
  date: Date
  onExercisesUpdated: (exercises: Exercise[]) => void
}

export default function EditWorkoutDialog({
  open,
  onOpenChange,
  currentExercises,
  date,
  onExercisesUpdated,
}: EditWorkoutDialogProps) {
  const { toast } = useToast()
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize selected exercises from current exercises
  useEffect(() => {
    if (open) {
      setSelectedExerciseIds(currentExercises.map((e) => e.id.toString()))
      setIsLoading(true)

      // Fetch all available exercises
      getAllExercises()
        .then((result) => {
          if (result.success) {
            setAllExercises(result.data)
          } else {
            toast({
              title: "Error",
              description: "Failed to load exercises. Please try again.",
              variant: "destructive",
            })
          }
        })
        .catch((error) => {
          console.error("Error fetching exercises:", error)
          toast({
            title: "Error",
            description: "An unexpected error occurred while loading exercises.",
            variant: "destructive",
          })
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [open, currentExercises, toast])

  // Filter exercises based on search term
  const filteredExercises = allExercises.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exercise.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Group exercises by category
  const exercisesByCategory = filteredExercises.reduce(
    (acc, exercise) => {
      if (!acc[exercise.category]) {
        acc[exercise.category] = []
      }
      acc[exercise.category].push(exercise)
      return acc
    },
    {} as Record<string, Exercise[]>,
  )

  // Toggle exercise selection
  const toggleExercise = (exerciseId: string) => {
    setSelectedExerciseIds((prev) => {
      if (prev.includes(exerciseId)) {
        return prev.filter((id) => id !== exerciseId)
      } else {
        return [...prev, exerciseId]
      }
    })
  }

  // Clear all selected exercises
  const clearAllExercises = () => {
    setSelectedExerciseIds([])
  }

  // Save the updated workout
  const saveWorkout = async () => {
    setIsSaving(true)
    try {
      // Save the custom workout for this date
      const dayOfWeek = date.getDay()
      const formattedDate = format(date, "yyyy-MM-dd")

      const result = await saveCustomWorkoutForDate(dayOfWeek, selectedExerciseIds, formattedDate)

      if (result.success) {
        // Get the selected exercises as full objects
        const selectedExercises = allExercises.filter((exercise) =>
          selectedExerciseIds.includes(exercise.id.toString()),
        )

        // Update the parent component
        onExercisesUpdated(selectedExercises)
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
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Workout for {format(date, "EEEE, MMMM d")}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search exercises..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-muted-foreground">Selected: {selectedExerciseIds.length} exercises</div>
                <Button variant="outline" size="sm" onClick={clearAllExercises} className="h-8">
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear All
                </Button>
              </div>

              {Object.keys(exercisesByCategory).length > 0 ? (
                Object.entries(exercisesByCategory).map(([category, exercises]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="text-sm font-medium">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {exercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className={`flex items-center space-x-2 p-2 rounded border ${
                            selectedExerciseIds.includes(exercise.id.toString()) ? "bg-primary/10 border-primary" : ""
                          }`}
                        >
                          <Checkbox
                            id={`exercise-${exercise.id}`}
                            checked={selectedExerciseIds.includes(exercise.id.toString())}
                            onCheckedChange={() => toggleExercise(exercise.id.toString())}
                          />
                          <Label htmlFor={`exercise-${exercise.id}`} className="flex-1 cursor-pointer">
                            {exercise.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No exercises found. Try a different search term.
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={saveWorkout} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
