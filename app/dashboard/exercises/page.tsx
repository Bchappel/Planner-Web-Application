"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Search, Save, Loader2 } from "lucide-react"
import { getAllExercises, getCustomWorkouts, saveCustomWorkout } from "@/lib/actions/workout-actions"
import { toast } from "@/components/ui/use-toast"

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<any[]>([])
  const [customWorkouts, setCustomWorkouts] = useState<Record<string, string[]>>({})
  const [selectedExercises, setSelectedExercises] = useState<Record<string, string[]>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("0")

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  // Fetch exercises and custom workouts on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch all exercises
        const exercisesResult = await getAllExercises()
        if (exercisesResult.success) {
          setExercises(exercisesResult.data)
        } else {
          toast({
            title: "Error",
            description: exercisesResult.message || "Failed to fetch exercises",
            variant: "destructive",
          })
        }

        // Fetch custom workouts
        const customWorkoutsResult = await getCustomWorkouts()
        if (customWorkoutsResult.success) {
          setCustomWorkouts(customWorkoutsResult.data)
          setSelectedExercises(customWorkoutsResult.data)
        } else {
          toast({
            title: "Error",
            description: customWorkoutsResult.message || "Failed to fetch custom workouts",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter exercises based on search term
  const filteredExercises = exercises.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exercise.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Group exercises by category
  const exercisesByCategory: Record<string, any[]> = {}
  filteredExercises.forEach((exercise) => {
    if (!exercisesByCategory[exercise.category]) {
      exercisesByCategory[exercise.category] = []
    }
    exercisesByCategory[exercise.category].push(exercise)
  })

  // Handle exercise selection
  const toggleExercise = (dayIndex: string, exerciseId: string) => {
    setSelectedExercises((prev) => {
      const updatedExercises = { ...prev }

      if (!updatedExercises[dayIndex]) {
        updatedExercises[dayIndex] = []
      }

      if (updatedExercises[dayIndex].includes(exerciseId)) {
        updatedExercises[dayIndex] = updatedExercises[dayIndex].filter((id) => id !== exerciseId)
      } else {
        updatedExercises[dayIndex] = [...updatedExercises[dayIndex], exerciseId]
      }

      return updatedExercises
    })
  }

  // Save custom workout for the current day
  const saveWorkout = async () => {
    setIsSaving(true)
    try {
      const result = await saveCustomWorkout(Number.parseInt(activeTab), selectedExercises[activeTab] || [])

      if (result.success) {
        toast({
          title: "Success",
          description: `Workout for ${dayNames[Number.parseInt(activeTab)]} saved successfully`,
        })

        // Update the custom workouts state
        setCustomWorkouts((prev) => ({
          ...prev,
          [activeTab]: selectedExercises[activeTab] || [],
        }))
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to save workout",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving workout:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Exercise Manager</CardTitle>
          <CardDescription>
            Customize your workout routine by selecting exercises for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
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

          <Tabs defaultValue="0" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-7 mb-4">
              {dayNames.map((day, index) => (
                <TabsTrigger key={index} value={index.toString()}>
                  {day}
                </TabsTrigger>
              ))}
            </TabsList>

            {dayNames.map((day, dayIndex) => (
              <TabsContent key={dayIndex} value={dayIndex.toString()}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">{day}'s Workout</h3>
                  <Button onClick={saveWorkout} disabled={isSaving}>
                    {isSaving ? (
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

                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.keys(exercisesByCategory).length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No exercises found. Try a different search term.
                      </p>
                    ) : (
                      Object.entries(exercisesByCategory).map(([category, categoryExercises]) => (
                        <div key={category}>
                          <h4 className="font-medium mb-2">{category}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {categoryExercises.map((exercise) => (
                              <div
                                key={exercise.id}
                                className={`flex items-center space-x-2 p-2 rounded border ${
                                  selectedExercises[dayIndex.toString()]?.includes(exercise.id.toString())
                                    ? "bg-primary/10 border-primary"
                                    : ""
                                }`}
                              >
                                <Checkbox
                                  id={`exercise-${dayIndex}-${exercise.id}`}
                                  checked={selectedExercises[dayIndex.toString()]?.includes(exercise.id.toString())}
                                  onCheckedChange={() => toggleExercise(dayIndex.toString(), exercise.id.toString())}
                                />
                                <Label
                                  htmlFor={`exercise-${dayIndex}-${exercise.id}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  {exercise.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
