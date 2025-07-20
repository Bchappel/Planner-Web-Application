"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Dumbbell, Award, LineChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface WorkoutStatsProps {
  data: {
    totalWorkouts: number
    recentWorkouts: number
    completionRate: number
    monthlyWorkouts: Array<{ month: string; count: number }>
  }
  compact?: boolean
}

export default function WorkoutStats({ data, compact = false }: WorkoutStatsProps) {
  const { totalWorkouts, recentWorkouts, completionRate, monthlyWorkouts } = data

  // Check if there's no workout data
  const hasNoData = totalWorkouts === 0 && monthlyWorkouts.length === 0

  // If there's no data and we're in compact mode, show a simplified message
  if (hasNoData && compact) {
    return (
      <Card className="bg-primary/5 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <Dumbbell className="h-5 w-5 mr-2 text-primary" />
          <h3 className="font-medium">Workouts</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">No workout data available yet</p>
        <Button asChild size="sm" className="w-full">
          <Link href="/dashboard/workouts">
            <Dumbbell className="mr-2 h-4 w-4" />
            Add Your First Workout
          </Link>
        </Button>
      </Card>
    )
  }

  // If there's no data and we're in full mode, show a more detailed message
  if (hasNoData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <LineChart className="h-12 w-12 mx-auto text-primary/60" />
            <h3 className="text-lg font-medium">No Workout Data Available</h3>
            <p className="text-muted-foreground">
              You haven't logged any workouts yet. Start tracking your workouts to see your statistics and progress over
              time.
            </p>
            <Button asChild>
              <Link href="/dashboard/workouts">
                <Dumbbell className="mr-2 h-4 w-4" />
                Add Your First Workout
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Stat cards for both compact and full view
  const StatCards = () => (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-primary/5 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <Dumbbell className="h-5 w-5 mr-2 text-primary" />
          <h3 className="font-medium">Total Workouts</h3>
        </div>
        <p className="text-2xl font-bold">{totalWorkouts}</p>
        <p className="text-sm text-muted-foreground">{recentWorkouts} in last 30 days</p>
      </div>

      <div className="bg-primary/5 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <Award className="h-5 w-5 mr-2 text-primary" />
          <h3 className="font-medium">Completion Rate</h3>
        </div>
        <p className="text-2xl font-bold">{completionRate}%</p>
        <p className="text-sm text-muted-foreground">Of planned exercises</p>
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

      <h3 className="text-lg font-medium mb-4">Monthly Workout Frequency</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyWorkouts} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                border: "none",
              }}
              formatter={(value) => [`${value} workouts`, "Count"]}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-medium">Insights</h3>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">
              {recentWorkouts > 10
                ? "Great job maintaining a consistent workout schedule! Keep up the momentum."
                : "Try to increase your workout frequency for better results. Aim for at least 3-4 workouts per week."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm">
              {completionRate >= 80
                ? "Excellent exercise completion rate! You're making the most of your workouts."
                : "Consider focusing on completing all planned exercises to maximize your workout effectiveness."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
