"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Utensils, Droplets, BarChart3, Calendar } from "lucide-react"

interface NutritionStatsProps {
  data: {
    totalLogs: number
    recentLogs: number
    avgMacros: {
      protein: number
      carbs: number
      fat: number
      calories: number
    }
    mostCommonMeal: string
    avgWater: number
  }
  compact?: boolean
}

export default function NutritionStats({ data, compact = false }: NutritionStatsProps) {
  const { totalLogs, recentLogs, avgMacros, mostCommonMeal, avgWater } = data

  // Prepare data for pie chart
  const macroData = [
    { name: "Protein", value: avgMacros.protein * 4, color: "#ef4444" }, // Red
    { name: "Carbs", value: avgMacros.carbs * 4, color: "#f59e0b" }, // Amber
    { name: "Fat", value: avgMacros.fat * 9, color: "#8b5cf6" }, // Purple
  ]

  // Macro goals
  const MACRO_GOALS = {
    protein: 190,
    carbs: 280,
    fat: 80,
    calories: 2600,
    water: 3000,
  }

  // Calculate percentages of goals
  const proteinPercent = Math.round((avgMacros.protein / MACRO_GOALS.protein) * 100)
  const carbsPercent = Math.round((avgMacros.carbs / MACRO_GOALS.carbs) * 100)
  const fatPercent = Math.round((avgMacros.fat / MACRO_GOALS.fat) * 100)
  const waterPercent = Math.round((avgWater / MACRO_GOALS.water) * 100)

  // Stat cards for both compact and full view
  const StatCards = () => (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-primary/5 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <Calendar className="h-5 w-5 mr-2 text-primary" />
          <h3 className="font-medium">Nutrition Logs</h3>
        </div>
        <p className="text-2xl font-bold">{totalLogs}</p>
        <p className="text-sm text-muted-foreground">{recentLogs} in last 30 days</p>
      </div>

      <div className="bg-primary/5 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <Utensils className="h-5 w-5 mr-2 text-primary" />
          <h3 className="font-medium">Favorite Meal</h3>
        </div>
        <p className="text-xl font-bold truncate">{mostCommonMeal}</p>
        <p className="text-sm text-muted-foreground">Most frequently logged</p>
      </div>

      <div className="bg-primary/5 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <BarChart3 className="h-5 w-5 mr-2 text-primary" />
          <h3 className="font-medium">Daily Calories</h3>
        </div>
        <p className="text-2xl font-bold">{avgMacros.calories}</p>
        <p className="text-sm text-muted-foreground">Average daily intake</p>
      </div>

      <div className="bg-primary/5 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <Droplets className="h-5 w-5 mr-2 text-primary" />
          <h3 className="font-medium">Water Intake</h3>
        </div>
        <p className="text-2xl font-bold">{avgWater}ml</p>
        <p className="text-sm text-muted-foreground">{waterPercent}% of daily goal</p>
      </div>
    </div>
  )

  // If compact view, just show the stat cards
  if (compact) {
    return <StatCards />
  }

  return (
    <div>
      <StatCards />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Macro Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={macroData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {macroData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} calories`, "Calories"]}
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    border: "none",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">Macro Goals Progress</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Protein</span>
                <span className="text-muted-foreground">
                  {avgMacros.protein}g / {MACRO_GOALS.protein}g
                </span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
                <div
                  className="h-full rounded-full bg-red-500"
                  style={{ width: `${Math.min(100, proteinPercent)}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Carbs</span>
                <span className="text-muted-foreground">
                  {avgMacros.carbs}g / {MACRO_GOALS.carbs}g
                </span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${Math.min(100, carbsPercent)}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Fat</span>
                <span className="text-muted-foreground">
                  {avgMacros.fat}g / {MACRO_GOALS.fat}g
                </span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
                <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(100, fatPercent)}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Water</span>
                <span className="text-muted-foreground">
                  {avgWater}ml / {MACRO_GOALS.water}ml
                </span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, waterPercent)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-medium">Insights</h3>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">
              {proteinPercent >= 90
                ? "Great job hitting your protein goals! This will help with muscle recovery and growth."
                : "Try to increase your protein intake to support muscle recovery and growth."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm">
              {waterPercent >= 90
                ? "Excellent hydration! Staying well-hydrated improves overall health and workout performance."
                : "Increasing your water intake can improve workout performance and overall health."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
