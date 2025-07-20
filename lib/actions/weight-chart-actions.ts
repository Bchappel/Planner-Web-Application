"use server"

import { sql } from "@/lib/db"
import { format, subDays, subMonths, subYears } from "date-fns"

// Time range options
export type TimeRange = "week" | "month" | "6 months" | "year"

// Get weight data for a specific exercise for the selected time range
export async function getExerciseWeightData(userId: number, exerciseName: string, timeRange: TimeRange = "month") {
  try {
    const today = new Date()

    // Calculate start date based on time range
    let startDate: Date
    let dateFormat = "MMM d"

    switch (timeRange) {
      case "week":
        startDate = subDays(today, 7)
        dateFormat = "EEE" // Short day name (Mon, Tue, etc.)
        break
      case "month":
        startDate = subDays(today, 30)
        dateFormat = "MMM d"
        break
      case "6 months":
        startDate = subMonths(today, 6)
        dateFormat = "MMM d"
        break
      case "year":
        startDate = subYears(today, 1)
        dateFormat = "MMM yyyy"
        break
      default:
        startDate = subDays(today, 30)
        dateFormat = "MMM d"
    }

    const formattedToday = format(today, "yyyy-MM-dd")
    const formattedStartDate = format(startDate, "yyyy-MM-dd")

    // Get weight history for the specific exercise
    const weightHistoryResult = await sql`
      SELECT 
        w.date,
        we.weight
      FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      WHERE w.user_id = ${userId}
      AND we.exercise_name = ${exerciseName}
      AND w.date BETWEEN ${formattedStartDate}::date AND ${formattedToday}::date
      AND we.weight IS NOT NULL
      AND we.weight != ''
      ORDER BY w.date ASC
    `

    // Convert weight to number and format date
    const weightHistory = weightHistoryResult.map((row) => {
      // Parse weight (remove any non-numeric characters except decimal point)
      const weightStr = row.weight.toString().replace(/[^\d.]/g, "")
      const weight = Number.parseFloat(weightStr) || 0
      const date = new Date(row.date)

      return {
        date: format(date, dateFormat),
        fullDate: format(date, "MMM d, yyyy"),
        weight: weight,
      }
    })

    return {
      success: true,
      data: {
        exerciseName,
        weightHistory,
        dateRange: {
          start: format(startDate, "MMM d, yyyy"),
          end: format(today, "MMM d, yyyy"),
        },
      },
    }
  } catch (error) {
    console.error("Error fetching exercise weight data:", error)
    return { success: false, message: "Failed to fetch weight data" }
  }
}

// Get a test user ID (for demo purposes)
export async function getTestUserId() {
  try {
    const result = await sql`
      SELECT id FROM users WHERE email = 'test@example.com' LIMIT 1
    `

    if (result.length > 0) {
      return result[0].id
    }

    return null
  } catch (error) {
    console.error("Error getting test user:", error)
    return null
  }
}

// Get all available exercises with weight data
export async function getAvailableExercises(userId: number) {
  try {
    // Get all exercises that have weight data
    const exercisesResult = await sql`
      SELECT DISTINCT we.exercise_name
      FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      WHERE w.user_id = ${userId}
      AND we.weight IS NOT NULL
      AND we.weight != ''
      ORDER BY we.exercise_name
    `

    const exercises = exercisesResult.map((row) => row.exercise_name)

    return {
      success: true,
      exercises,
    }
  } catch (error) {
    console.error("Error fetching available exercises:", error)
    return { success: false, exercises: [] }
  }
}

//getMonthlyWeightData
export async function getMonthlyWeightData(userId: number) {
  try {
    const today = new Date()
    const oneMonthAgo = new Date(today)
    oneMonthAgo.setMonth(today.getMonth() - 1)

    const formattedToday = format(today, "yyyy-MM-dd")
    const formattedOneMonthAgo = format(oneMonthAgo, "yyyy-MM-dd")

    // Get all exercises that have weight data in the last month
    const exercisesWithWeightResult = await sql`
      SELECT DISTINCT we.exercise_name
      FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      WHERE w.user_id = ${userId}
      AND w.date BETWEEN ${formattedOneMonthAgo}::date AND ${formattedToday}::date
      AND we.weight IS NOT NULL
      AND we.weight != ''
      ORDER BY we.exercise_name
    `

    const exercises = exercisesWithWeightResult.map((row) => row.exercise_name)

    // Get weight history for each exercise
    const exerciseWeightHistory = {}

    for (const exercise of exercises) {
      const weightHistoryResult = await sql`
        SELECT 
          w.date,
          we.weight
        FROM workout_exercises we
        JOIN workouts w ON we.workout_id = w.id
        WHERE w.user_id = ${userId}
        AND we.exercise_name = ${exercise}
        AND w.date BETWEEN ${formattedOneMonthAgo}::date AND ${formattedToday}::date
        AND we.weight IS NOT NULL
        AND we.weight != ''
        ORDER BY w.date ASC
      `

      // Convert weight to number and format date
      const weightHistory = weightHistoryResult.map((row) => {
        // Parse weight (remove any non-numeric characters except decimal point)
        const weightStr = row.weight.toString().replace(/[^\d.]/g, "")
        const weight = Number.parseFloat(weightStr) || 0

        return {
          date: format(new Date(row.date), "MMM d"),
          fullDate: format(new Date(row.date), "MMM d, yyyy"),
          weight: weight,
        }
      })

      if (weightHistory.length > 0) {
        exerciseWeightHistory[exercise] = weightHistory
      }
    }

    return {
      success: true,
      data: {
        exerciseName: exercises[0],
        weightHistory: exerciseWeightHistory[exercises[0]],
        dateRange: {
          start: format(oneMonthAgo, "MMM d, yyyy"),
          end: format(today, "MMM d, yyyy"),
        },
      },
    }
  } catch (error) {
    console.error("Error fetching monthly exercise weight history:", error)
    return { success: false, message: "Failed to fetch monthly exercise weight history" }
  }
}
