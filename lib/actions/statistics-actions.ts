"use server"

import { sql } from "@/lib/db"
import { format, subDays } from "date-fns"

// Get workout statistics
export async function getWorkoutStatistics(userId: number) {
  try {
    const today = new Date()
    const thirtyDaysAgo = subDays(today, 30)
    const formattedToday = format(today, "yyyy-MM-dd")
    const formattedThirtyDaysAgo = format(thirtyDaysAgo, "yyyy-MM-dd")

    // Total workouts completed
    const totalWorkoutsResult = await sql`
      SELECT COUNT(*) as count
      FROM workouts
      WHERE user_id = ${userId}
    `
    const totalWorkouts = totalWorkoutsResult[0]?.count || 0

    // Workouts in the last 30 days
    const recentWorkoutsResult = await sql`
      SELECT COUNT(*) as count
      FROM workouts
      WHERE user_id = ${userId}
      AND date BETWEEN ${formattedThirtyDaysAgo}::date AND ${formattedToday}::date
    `
    const recentWorkouts = recentWorkoutsResult[0]?.count || 0

    // Workout completion rate (exercises completed vs planned)
    const completionRateResult = await sql`
      WITH planned_exercises AS (
        SELECT w.id, w.date, EXTRACT(DOW FROM w.date) as day_of_week,
          CASE 
            WHEN EXTRACT(DOW FROM w.date) = 0 THEN 1
            WHEN EXTRACT(DOW FROM w.date) = 6 THEN 1
            ELSE 8
          END as expected_count
        FROM workouts w
        WHERE w.user_id = ${userId}
      ),
      completed_exercises AS (
        SELECT w.id, COUNT(we.id) as completed_count
        FROM workouts w
        LEFT JOIN workout_exercises we ON w.id = we.workout_id
        WHERE w.user_id = ${userId}
        GROUP BY w.id
      )
      SELECT 
        COALESCE(SUM(ce.completed_count), 0) as total_completed,
        COALESCE(SUM(pe.expected_count), 0) as total_expected
      FROM planned_exercises pe
      LEFT JOIN completed_exercises ce ON pe.id = ce.id
    `

    let completionRate = 0
    if (completionRateResult.length > 0) {
      const totalCompleted = Number.parseInt(completionRateResult[0].total_completed) || 0
      const totalExpected = Number.parseInt(completionRateResult[0].total_expected) || 1 // Avoid division by zero
      completionRate = Math.round((totalCompleted / totalExpected) * 100)
    }

    // Monthly workout counts for chart
    const monthlyWorkoutsResult = await sql`
      SELECT 
        DATE_TRUNC('month', date)::date as month_start,
        COUNT(*) as count
      FROM workouts
      WHERE user_id = ${userId}
      GROUP BY month_start
      ORDER BY month_start DESC
      LIMIT 6
    `

    const monthlyWorkouts = monthlyWorkoutsResult
      .map((row) => ({
        month: format(new Date(row.month_start), "MMM yyyy"),
        count: Number.parseInt(row.count),
      }))
      .reverse()

    return {
      success: true,
      data: {
        totalWorkouts,
        recentWorkouts,
        completionRate,
        monthlyWorkouts,
      },
    }
  } catch (error) {
    console.error("Error fetching workout statistics:", error)
    return { success: false, message: "Failed to fetch workout statistics" }
  }
}

// Get exercise weight history
export async function getExerciseWeightHistory(userId: number) {
  try {
    // Get all exercises that have weight data
    const exercisesWithWeightResult = await sql`
      SELECT DISTINCT we.exercise_name
      FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      WHERE w.user_id = ${userId}
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
          date: format(new Date(row.date), "MMM d, yyyy"),
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
        exercises,
        exerciseWeightHistory,
      },
    }
  } catch (error) {
    console.error("Error fetching exercise weight history:", error)
    return { success: false, message: "Failed to fetch exercise weight history" }
  }
}

// Get exercise weight history for the last month
export async function getMonthlyExerciseWeightHistory(userId: number) {
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
        exercises,
        exerciseWeightHistory,
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

// Get nutrition statistics
export async function getNutritionStatistics(userId: number) {
  try {
    const today = new Date()
    const thirtyDaysAgo = subDays(today, 30)
    const formattedToday = format(today, "yyyy-MM-dd")
    const formattedThirtyDaysAgo = format(thirtyDaysAgo, "yyyy-MM-dd")

    // Total nutrition logs
    const totalLogsResult = await sql`
      SELECT COUNT(*) as count
      FROM nutrition_logs
      WHERE user_id = ${userId}
    `
    const totalLogs = totalLogsResult[0]?.count || 0

    // Logs in the last 30 days
    const recentLogsResult = await sql`
      SELECT COUNT(*) as count
      FROM nutrition_logs
      WHERE user_id = ${userId}
      AND date BETWEEN ${formattedThirtyDaysAgo}::date AND ${formattedToday}::date
    `
    const recentLogs = recentLogsResult[0]?.count || 0

    // Average macros for the last 30 days
    const macrosResult = await sql`
      WITH meal_totals AS (
        SELECT 
          nl.id,
          SUM(m.protein * nlm.quantity) as protein,
          SUM(m.carbs * nlm.quantity) as carbs,
          SUM(m.fat * nlm.quantity) as fat,
          SUM(m.calories * nlm.quantity) as calories
        FROM nutrition_logs nl
        JOIN nutrition_log_meals nlm ON nl.id = nlm.nutrition_log_id
        JOIN meals m ON nlm.meal_id = m.id
        WHERE nl.user_id = ${userId}
        AND nl.date BETWEEN ${formattedThirtyDaysAgo}::date AND ${formattedToday}::date
        GROUP BY nl.id
      )
      SELECT 
        ROUND(AVG(protein)) as avg_protein,
        ROUND(AVG(carbs)) as avg_carbs,
        ROUND(AVG(fat)) as avg_fat,
        ROUND(AVG(calories)) as avg_calories
      FROM meal_totals
    `

    const avgMacros =
      macrosResult.length > 0
        ? {
            protein: Number.parseInt(macrosResult[0].avg_protein) || 0,
            carbs: Number.parseInt(macrosResult[0].avg_carbs) || 0,
            fat: Number.parseInt(macrosResult[0].avg_fat) || 0,
            calories: Number.parseInt(macrosResult[0].avg_calories) || 0,
          }
        : {
            protein: 0,
            carbs: 0,
            fat: 0,
            calories: 0,
          }

    // Most common meal
    const commonMealResult = await sql`
      SELECT m.name, COUNT(*) as count
      FROM nutrition_log_meals nlm
      JOIN meals m ON nlm.meal_id = m.id
      JOIN nutrition_logs nl ON nlm.nutrition_log_id = nl.id
      WHERE nl.user_id = ${userId}
      GROUP BY m.name
      ORDER BY count DESC
      LIMIT 1
    `

    const mostCommonMeal = commonMealResult.length > 0 ? commonMealResult[0].name : "N/A"

    // Average water intake
    const waterResult = await sql`
      SELECT AVG(nloi.amount) as avg_water
      FROM nutrition_log_other_items nloi
      JOIN other_items oi ON nloi.other_item_id = oi.id
      JOIN nutrition_logs nl ON nloi.nutrition_log_id = nl.id
      WHERE nl.user_id = ${userId}
      AND oi.name = 'Water'
      AND nl.date BETWEEN ${formattedThirtyDaysAgo}::date AND ${formattedToday}::date
    `

    const avgWater = waterResult.length > 0 ? Math.round(Number.parseFloat(waterResult[0].avg_water) || 0) : 0

    return {
      success: true,
      data: {
        totalLogs,
        recentLogs,
        avgMacros,
        mostCommonMeal,
        avgWater,
      },
    }
  } catch (error) {
    console.error("Error fetching nutrition statistics:", error)
    return { success: false, message: "Failed to fetch nutrition statistics" }
  }
}

// Get weight statistics
export async function getWeightStatistics(userId: number) {
  try {
    // Get weight history
    const weightHistoryResult = await sql`
      SELECT weight, date
      FROM weight_records
      WHERE user_id = ${userId}
      ORDER BY date ASC
    `

    const weightHistory = weightHistoryResult.map((record) => ({
      date: format(new Date(record.date), "MMM d"),
      weight: Number.parseFloat(record.weight),
    }))

    // Calculate weight change
    let weightChange = 0
    let weightChangePercent = 0

    if (weightHistory.length >= 2) {
      const firstWeight = weightHistory[0].weight
      const lastWeight = weightHistory[weightHistory.length - 1].weight
      weightChange = Number.parseFloat((lastWeight - firstWeight).toFixed(1))
      weightChangePercent = Number.parseFloat(((weightChange / firstWeight) * 100).toFixed(1))
    }

    // Get current weight
    const currentWeightResult = await sql`
      SELECT weight
      FROM user_profiles
      WHERE user_id = ${userId}
    `

    const currentWeight = currentWeightResult.length > 0 ? Number.parseFloat(currentWeightResult[0].weight) : 0

    return {
      success: true,
      data: {
        weightHistory,
        weightChange,
        weightChangePercent,
        currentWeight,
      },
    }
  } catch (error) {
    console.error("Error fetching weight statistics:", error)
    return { success: false, message: "Failed to fetch weight statistics" }
  }
}

// Get streak statistics
export async function getStreakStatistics(userId: number) {
  try {
    // Get streak data
    const streakResult = await sql`
      SELECT 
        nutrition_current_streak, 
        nutrition_best_streak,
        workout_current_streak, 
        workout_best_streak
      FROM user_streaks
      WHERE user_id = ${userId}
    `

    const streaks =
      streakResult.length > 0
        ? {
            nutrition: {
              current: streakResult[0].nutrition_current_streak || 0,
              best: streakResult[0].nutrition_best_streak || 0,
            },
            workout: {
              current: streakResult[0].workout_current_streak || 0,
              best: streakResult[0].workout_best_streak || 0,
            },
          }
        : {
            nutrition: { current: 0, best: 0 },
            workout: { current: 0, best: 0 },
          }

    return {
      success: true,
      data: streaks,
    }
  } catch (error) {
    console.error("Error fetching streak statistics:", error)
    return { success: false, message: "Failed to fetch streak statistics" }
  }
}
