"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getTestUserId } from "@/lib/actions/profile-actions"
import { getAvailableExercises, getExerciseWeightData, type TimeRange } from "@/lib/actions/weight-chart-actions"
import MonthlyWeightChart from "@/components/weight-chart/monthly-weight-chart"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { TrendingUp } from "lucide-react"

export default function StatisticsPage() {
  const { toast } = useToast()
  const [userId, setUserId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [monthlyWeightData, setMonthlyWeightData] = useState<any>(null)
  const [availableExercises, setAvailableExercises] = useState<string[]>([])
  const [selectedExercise, setSelectedExercise] = useState<string>("")
  const [timeRange, setTimeRange] = useState<TimeRange>("month")
  const [hasData, setHasData] = useState(false)

  // Fetch user ID on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const id = await getTestUserId()
        if (id) {
          setUserId(id)
        } else {
          toast({
            title: "Error",
            description: "Could not find test user. Please check your database setup.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching user ID:", error)
      }
    }

    fetchUserId()
  }, [toast])

  // Fetch available exercises once we have a user ID
  useEffect(() => {
    const fetchExercises = async () => {
      if (!userId) return

      try {
        const result = await getAvailableExercises(userId)
        if (result.success) {
          setHasData(result.exercises.length > 0)
          setAvailableExercises(result.exercises)
          if (result.exercises.length > 0) {
            setSelectedExercise(result.exercises[0]) // Select first exercise by default
          }
        }
      } catch (error) {
        console.error("Error fetching exercises:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchExercises()
  }, [userId])

  // Fetch weight data when selected exercise or time range changes
  useEffect(() => {
    const fetchWeightData = async () => {
      if (!userId || !selectedExercise) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const result = await getExerciseWeightData(userId, selectedExercise, timeRange)
        if (result.success) {
          setMonthlyWeightData(result.data)
        } else {
          toast({
            title: "Error",
            description: "Failed to load weight data. Please try again.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching weight data:", error)
        toast({
          title: "Error",
          description: "Failed to load weight data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchWeightData()
  }, [userId, selectedExercise, timeRange, toast])

  // Get time range label
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "week":
        return "Past Week"
      case "month":
        return "Past Month"
      case "6months":
        return "Past 6 Months"
      case "year":
        return "Past Year"
      default:
        return "Past Month"
    }
  }

  // If no workout data is available
  if (!isLoading && !hasData) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Exercise Weight Progression</h1>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
            <Link href="/dashboard/suggestions" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              View Suggestions
            </Link>
          </Button>
        </div>

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
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Exercise Weight Progression</h1>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
          <Link href="/dashboard/suggestions" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            View Suggestions
          </Link>
        </Button>
      </div>

      {/* Rest of the existing content remains the same */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        {availableExercises.length > 0 && (
          <div className="w-full md:w-auto">
            <Select value={selectedExercise} onValueChange={setSelectedExercise}>
              <SelectTrigger className="w-full md:w-[280px]">
                <SelectValue placeholder="Select an exercise" />
              </SelectTrigger>
              <SelectContent>
                {availableExercises.map((exercise) => (
                  <SelectItem key={exercise} value={exercise}>
                    {exercise}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="w-full md:w-auto">
          <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)} className="w-full">
            <TabsList className="grid grid-cols-4 w-full md:w-[400px]">
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="6months">6Months</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>
              {selectedExercise} Weight Progression - {getTimeRangeLabel()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyWeightData ? (
              monthlyWeightData.weightHistory && monthlyWeightData.weightHistory.length > 0 ? (
                <MonthlyWeightChart data={monthlyWeightData} />
              ) : (
                <div className="text-center p-6">
                  <p className="text-muted-foreground">
                    No weight data available for {selectedExercise} in the {getTimeRangeLabel().toLowerCase()}.
                  </p>
                </div>
              )
            ) : (
              <div className="text-center p-6">
                <p className="text-muted-foreground">Select an exercise to view weight progression.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
