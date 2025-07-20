"use client"

import { useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dumbbell } from "lucide-react"

interface ExerciseWeightTrackerProps {
  data: {
    exercises: string[]
    exerciseWeightHistory: Record<string, Array<{ date: string; weight: number }>>
  }
}

export default function ExerciseWeightTracker({ data }: ExerciseWeightTrackerProps) {
  const { exercises, exerciseWeightHistory } = data
  const [selectedExercise, setSelectedExercise] = useState(exercises.length > 0 ? exercises[0] : "")

  // Get weight history for selected exercise
  const weightHistory = selectedExercise ? exerciseWeightHistory[selectedExercise] || [] : []

  // Calculate progress
  const calculateProgress = () => {
    if (weightHistory.length < 2) return { change: 0, percent: 0 }

    const firstWeight = weightHistory[0].weight
    const lastWeight = weightHistory[weightHistory.length - 1].weight
    const change = Number.parseFloat((lastWeight - firstWeight).toFixed(1))
    const percent = Number.parseFloat(((change / firstWeight) * 100).toFixed(1))

    return { change, percent }
  }

  const progress = calculateProgress()
  const isProgressPositive = progress.change > 0

  if (exercises.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Weight Data Available</h3>
          <p className="text-muted-foreground">
            Start tracking weights for your exercises to see your progress over time.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Exercise Weight Progression</h3>
        <Select value={selectedExercise} onValueChange={setSelectedExercise}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select exercise" />
          </SelectTrigger>
          <SelectContent>
            {exercises.map((exercise) => (
              <SelectItem key={exercise} value={exercise}>
                {exercise}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {weightHistory.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Card className="bg-primary/5">
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Current Weight</h4>
                <p className="text-2xl font-bold">{weightHistory[weightHistory.length - 1].weight} lbs</p>
                <p className="text-xs text-muted-foreground mt-1">Last recorded for {selectedExercise}</p>
              </CardContent>
            </Card>

            <Card className="bg-primary/5">
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Progress</h4>
                <p className={`text-2xl font-bold ${isProgressPositive ? "text-green-500" : "text-red-500"}`}>
                  {isProgressPositive ? "+" : ""}
                  {progress.change} lbs
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isProgressPositive ? "Increased" : "Decreased"} by {Math.abs(progress.percent)}% overall
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightHistory} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis domain={["dataMin - 5", "dataMax + 5"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    border: "none",
                  }}
                  formatter={(value) => [`${value} lbs`, "Weight"]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm">
                {isProgressPositive
                  ? `Great progress on ${selectedExercise}! You've increased the weight by ${progress.change} lbs (${progress.percent}%) since you started tracking.`
                  : progress.change === 0
                    ? `You've maintained consistent weight for ${selectedExercise}. Consider increasing the weight to continue progressing.`
                    : `You've decreased the weight for ${selectedExercise} by ${Math.abs(progress.change)} lbs. This might be due to form improvement or recovery.`}
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No weight data available for this exercise.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
