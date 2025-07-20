"use client"

import { useState, useEffect } from "react"
import { getMonthlyExerciseWeightHistory } from "@/lib/actions/statistics-actions"
import { getTestUserId } from "@/lib/actions/profile-actions"
import { ExerciseWeightChart } from "./exercise-weight-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function ExerciseWeightContainer() {
  const [userId, setUserId] = useState<number | null>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const id = await getTestUserId()
        setUserId(id)

        if (id) {
          const result = await getMonthlyExerciseWeightHistory(id)
          if (result.success) {
            setData(result.data)
            // Check if there's actual exercise data
            setHasData(result.data.exercises.length > 0 && Object.keys(result.data.exerciseWeightHistory).length > 0)
          } else {
            setError("Failed to fetch exercise weight history")
          }
        }
      } catch (err) {
        console.error("Error fetching exercise weight data:", err)
        setError("An error occurred while fetching data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Workout Data Available</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center space-y-6">
            <p className="text-muted-foreground">
              You haven't logged any workouts with weight data yet. Start tracking your workouts to see your progress
              over time.
            </p>
            <div className="pt-2">
              <Button asChild className="px-6">
                <Link href="/dashboard/workouts">Add Your First Workout</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return <ExerciseWeightChart data={data} />
}
