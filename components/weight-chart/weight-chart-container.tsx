"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { getTestUserId } from "@/lib/actions/weight-chart-actions"
import { getMonthlyWeightData } from "@/lib/actions/weight-chart-actions"
import MonthlyWeightChart from "./monthly-weight-chart"

export default function WeightChartContainer() {
  const [userId, setUserId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [weightData, setWeightData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch user ID on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const id = await getTestUserId()
        if (id) {
          setUserId(id)
        } else {
          setError("Could not find test user")
        }
      } catch (error) {
        console.error("Error fetching user ID:", error)
        setError("Error fetching user ID")
      }
    }

    fetchUserId()
  }, [])

  // Fetch weight data when user ID is available
  useEffect(() => {
    const fetchWeightData = async () => {
      if (!userId) return

      setIsLoading(true)
      try {
        const result = await getMonthlyWeightData(userId)
        if (result.success) {
          setWeightData(result.data)
          console.log("Weight data fetched successfully:", result.data)
        } else {
          setError(result.message || "Failed to fetch weight data")
        }
      } catch (error) {
        console.error("Error fetching weight data:", error)
        setError("Error fetching weight data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchWeightData()
  }, [userId])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-medium mb-2 text-red-500">Error</h3>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!weightData || weightData.exercises.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-medium mb-2">No Weight Data Available</h3>
          <p className="text-muted-foreground">
            Start tracking weights for your exercises to see your progress over time.
          </p>
        </CardContent>
      </Card>
    )
  }

  return <MonthlyWeightChart data={weightData} />
}
