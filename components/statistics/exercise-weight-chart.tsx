"use client"

import { useState } from "react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ExerciseWeightData } from "@/lib/actions/exercise-weight-actions"

type ProcessedData = {
  date: string
  [key: string]: string | number
}

export function ExerciseWeightChart({ data }: { data: ExerciseWeightData[] }) {
  // Get unique exercise names
  const exercises = Array.from(new Set(data.map((item) => item.exercise_name)))
  const [selectedExercise, setSelectedExercise] = useState<string>(exercises[0] || "")

  // Process data for the selected exercise
  const processedData = data
    .filter((item) => item.exercise_name === selectedExercise)
    .reduce((acc: ProcessedData[], item) => {
      // Check if we already have an entry for this date
      const existingEntry = acc.find((entry) => entry.date === item.date)

      if (existingEntry) {
        existingEntry[item.exercise_name] = item.weight
      } else {
        const newEntry: ProcessedData = { date: item.date }
        newEntry[item.exercise_name] = item.weight
        acc.push(newEntry)
      }

      return acc
    }, [])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Create chart config
  const chartConfig = {
    [selectedExercise]: {
      label: selectedExercise,
      color: "hsl(var(--chart-1))",
    },
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Exercise Weight Progress</CardTitle>
          <CardDescription>Weight used over the past 30 days</CardDescription>
        </div>
        <Select value={selectedExercise} onValueChange={setSelectedExercise}>
          <SelectTrigger className="w-[180px]">
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
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
              <YAxis label={{ value: "Weight", angle: -90, position: "insideLeft" }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey={selectedExercise}
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
