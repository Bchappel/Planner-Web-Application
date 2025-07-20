"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Scale, TrendingUp, TrendingDown } from "lucide-react"

interface WeightStatsProps {
  data: {
    weightHistory: Array<{ date: string; weight: number }>
    weightChange: number
    weightChangePercent: number
    currentWeight: number
  }
  compact?: boolean
}

export default function WeightStats({ data, compact = false }: WeightStatsProps) {
  const { weightHistory, weightChange, weightChangePercent, currentWeight } = data

  // Determine if weight is trending up or down
  const isWeightDown = weightChange < 0
  const absWeightChange = Math.abs(weightChange)
  const absWeightChangePercent = Math.abs(weightChangePercent)

  // Stat cards for both compact and full view
  const StatCards = () => (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-primary/5 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <Scale className="h-5 w-5 mr-2 text-primary" />
          <h3 className="font-medium">Current Weight</h3>
        </div>
        <p className="text-2xl font-bold">{currentWeight} lbs</p>
        <p className="text-sm text-muted-foreground">Last recorded weight</p>
      </div>

      <div className="bg-primary/5 rounded-lg p-4">
        <div className="flex items-center mb-2">
          {isWeightDown ? (
            <TrendingDown className="h-5 w-5 mr-2 text-green-500" />
          ) : (
            <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
          )}
          <h3 className="font-medium">Weight Change</h3>
        </div>
        <p className={`text-2xl font-bold ${isWeightDown ? "text-green-500" : "text-blue-500"}`}>
          {isWeightDown ? "-" : "+"}
          {absWeightChange} lbs
        </p>
        <p className="text-sm text-muted-foreground">
          {isWeightDown ? "Lost" : "Gained"} {absWeightChangePercent}% overall
        </p>
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

      <h3 className="text-lg font-medium mb-4">Weight Trend</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={weightHistory} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" />
            <YAxis domain={["dataMin - 5", "dataMax + 5"]} tickCount={8} />
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

      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-medium">Insights</h3>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">
              {isWeightDown
                ? "You're making progress on your weight loss journey! Consistent nutrition and exercise are paying off."
                : "Your weight has been increasing. If this is intentional for muscle gain, great job! If not, consider adjusting your nutrition."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm">
              {weightHistory.length >= 4
                ? "Consistent weight tracking helps you stay accountable and make informed adjustments to your fitness plan."
                : "Try to weigh yourself more consistently (once a week is ideal) to better track your progress over time."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
