"use client"

import { useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dumbbell, TrendingUp, TrendingDown } from "lucide-react"

interface MonthlyWeightChartProps {
  data: {
    exercises: string[]
    exerciseWeightHistory: Record<string, Array<{ date: string; fullDate: string; weight: number }>>
    dateRange: {
      start: string
      end: string
    }
  }
}

export default function MonthlyWeightChart({ data }: MonthlyWeightChartProps) {
  const { exercises, exerciseWeightHistory, dateRange } = data
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

  // Find max weight (personal record)
  const maxWeight = weightHistory.length > 0 ? Math.max(...weightHistory.map((entry) => entry.weight)) : 0

  if (exercises.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Weight Progression</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Weight Data Available</h3>
          <p className="text-muted-foreground">
            No exercise weight data found for the past month. Start tracking weights for your exercises to see your
            progress.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Monthly Weight Progression</CardTitle>
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
      </CardHeader>
      <CardContent>
        {weightHistory.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-primary/5">
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Current Weight</h4>
                  <p className="text-2xl font-bold">{weightHistory[weightHistory.length - 1].weight} lbs</p>
                  <p className="text-xs text-muted-foreground mt-1">Last recorded for {selectedExercise}</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5">
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Monthly Change</h4>
                  <p
                    className={`text-2xl font-bold ${isProgressPositive ? "text-green-500" : progress.change < 0 ? "text-red-500" : ""}`}
                  >
                    {isProgressPositive ? "+" : ""}
                    {progress.change} lbs
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    {isProgressPositive ? (
                      <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    ) : progress.change < 0 ? (
                      <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                    ) : null}
                    <span>
                      {isProgressPositive
                        ? `Increased by ${progress.percent}%`
                        : progress.change < 0
                          ? `Decreased by ${Math.abs(progress.percent)}%`
                          : "No change"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5">
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Personal Record</h4>
                  <p className="text-2xl font-bold text-blue-500">{maxWeight} lbs</p>
                  <p className="text-xs text-muted-foreground mt-1">Highest weight this month</p>
                </CardContent>
              </Card>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightHistory} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickMargin={10} />
                  <YAxis domain={["auto", "auto"]} tickCount={6} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                      border: "none",
                    }}
                    formatter={(value) => [`${value} lbs`, "Weight"]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        return payload[0].payload.fullDate
                      }
                      return label
                    }}
                  />
                  <ReferenceLine
                    y={maxWeight}
                    stroke="#3b82f6"
                    strokeDasharray="3 3"
                    label={{
                      value: "PR",
                      position: "insideTopRight",
                      fill: "#3b82f6",
                      fontSize: 12,
                    }}
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

            <div className="text-xs text-muted-foreground text-center mt-2">
              Date range: {dateRange.start} - {dateRange.end}
            </div>
          </>
        ) : (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">No weight data available for this exercise in the past month.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
