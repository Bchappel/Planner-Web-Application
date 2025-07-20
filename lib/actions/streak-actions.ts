"use server"

import { sql } from "@/lib/db"
import { differenceInDays } from "date-fns"

// Types for our streak data
interface StreakData {
  nutrition: {
    current: number
    best: number
    lastUpdated: string | null
  }
  workout: {
    current: number
    best: number
    lastUpdated: string | null
  }
}

// Get streak data for a user
export async function getStreakData(userId: number): Promise<StreakData> {
  try {
    console.log(`Fetching streak data for user ${userId}`)

    // Get the streak data
    const streakResult = await sql`
      SELECT 
        nutrition_current_streak, 
        nutrition_best_streak, 
        nutrition_last_updated,
        workout_current_streak, 
        workout_best_streak, 
        workout_last_updated
      FROM user_streaks 
      WHERE user_id = ${userId}
      LIMIT 1
    `

    if (!streakResult || streakResult.length === 0) {
      console.log("No streak data found for this user")
      return {
        nutrition: { current: 0, best: 0, lastUpdated: null },
        workout: { current: 0, best: 0, lastUpdated: null },
      }
    }

    const streak = streakResult[0]
    console.log(`Found streak data for user ${userId}:`, streak)

    return {
      nutrition: {
        current: streak.nutrition_current_streak || 0,
        best: streak.nutrition_best_streak || 0,
        lastUpdated: streak.nutrition_last_updated ? streak.nutrition_last_updated.toString() : null,
      },
      workout: {
        current: streak.workout_current_streak || 0,
        best: streak.workout_best_streak || 0,
        lastUpdated: streak.workout_last_updated ? streak.workout_last_updated.toString() : null,
      },
    }
  } catch (error) {
    console.error("Error fetching streak data:", error)
    return {
      nutrition: { current: 0, best: 0, lastUpdated: null },
      workout: { current: 0, best: 0, lastUpdated: null },
    }
  }
}

// Update workout streak - based on scheduled workout days, not calendar days
export async function updateWorkoutStreak(userId: number, date: string, allCompleted: boolean) {
  try {
    console.log(`Updating workout streak for user ${userId} on date ${date}, all completed: ${allCompleted}`)

    if (!allCompleted) {
      console.log("Not all exercises completed, not updating streak")
      return
    }

    // Get current streak data
    const streakData = await sql`
      SELECT workout_current_streak, workout_best_streak, workout_last_updated 
      FROM user_streaks 
      WHERE user_id = ${userId}
    `

    const today = new Date(date)
    const todayDayOfWeek = today.getDay()
    let currentStreak = 0
    let bestStreak = 0
    let lastUpdated: Date | null = null

    if (streakData.length > 0) {
      currentStreak = streakData[0].workout_current_streak || 0
      bestStreak = streakData[0].workout_best_streak || 0
      lastUpdated = streakData[0].workout_last_updated ? new Date(streakData[0].workout_last_updated) : null
    }

    // Define custom workout schedule (days that have workouts)
    // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
    const workoutDays = new Set([1, 2, 4, 6]) // Monday, Tuesday, Thursday, Saturday
    const restDays = new Set([0, 3, 5]) // Sunday, Wednesday, Friday

    // If today is a rest day, don't update streaks
    if (restDays.has(todayDayOfWeek)) {
      console.log("Today is a rest day, not updating workout streak")
      return
    }

    if (lastUpdated) {
      const dayDiff = differenceInDays(today, lastUpdated)
      const lastDayOfWeek = lastUpdated.getDay()

      if (dayDiff === 0) {
        // Same day, don't change streak
        console.log("Same day workout, not changing streak")
        return
      }

      // Check if this is the next scheduled workout day
      const isConsecutiveWorkoutDay = isNextScheduledWorkoutDay(lastUpdated, today, workoutDays)

      if (isConsecutiveWorkoutDay) {
        // Consecutive scheduled workout day, increment streak
        currentStreak++
        console.log(`Consecutive scheduled workout day, incrementing streak to ${currentStreak}`)
      } else {
        // Missed one or more scheduled workout days, reset streak
        const missedDays = getMissedWorkoutDays(lastUpdated, today, workoutDays)
        console.log(`Missed ${missedDays} scheduled workout days, resetting streak to 1`)
        currentStreak = 1
      }
    } else {
      // First workout
      currentStreak = 1
      console.log("First workout, setting streak to 1")
    }

    // Update best streak if needed
    if (currentStreak > bestStreak) {
      bestStreak = currentStreak
      console.log(`New best workout streak: ${bestStreak}`)
    }

    // Update database
    await sql`
      INSERT INTO user_streaks (
        user_id, workout_current_streak, workout_best_streak, workout_last_updated
      ) VALUES (
        ${userId}, ${currentStreak}, ${bestStreak}, ${date}::date
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        workout_current_streak = ${currentStreak},
        workout_best_streak = ${bestStreak},
        workout_last_updated = ${date}::date
    `

    console.log("Workout streak updated successfully")
  } catch (error) {
    console.error("Error updating workout streak:", error)
  }
}

// Helper function to check if current day is the next scheduled workout day
function isNextScheduledWorkoutDay(lastWorkoutDate: Date, currentDate: Date, workoutDays: Set<number>): boolean {
  const checkDate = new Date(lastWorkoutDate)
  checkDate.setDate(checkDate.getDate() + 1) // Start checking from the day after last workout

  // Look for the next scheduled workout day
  while (checkDate <= currentDate) {
    const dayOfWeek = checkDate.getDay()

    if (workoutDays.has(dayOfWeek)) {
      // Found the next scheduled workout day
      return checkDate.getTime() === currentDate.getTime()
    }

    checkDate.setDate(checkDate.getDate() + 1)
  }

  return false
}

// Helper function to count missed scheduled workout days
function getMissedWorkoutDays(lastWorkoutDate: Date, currentDate: Date, workoutDays: Set<number>): number {
  let missedCount = 0
  const checkDate = new Date(lastWorkoutDate)
  checkDate.setDate(checkDate.getDate() + 1) // Start checking from the day after last workout

  while (checkDate < currentDate) {
    const dayOfWeek = checkDate.getDay()

    if (workoutDays.has(dayOfWeek)) {
      missedCount++
    }

    checkDate.setDate(checkDate.getDate() + 1)
  }

  return missedCount
}

// Update nutrition streak
export async function updateNutritionStreak(userId: number, date: string, allTargetsMet: boolean) {
  try {
    console.log(`Updating nutrition streak for user ${userId} on date ${date}, all targets met: ${allTargetsMet}`)

    if (!allTargetsMet) {
      console.log("Not all nutrition targets met, not updating streak")
      return
    }

    // Get current streak data
    const streakData = await sql`
      SELECT nutrition_current_streak, nutrition_best_streak, nutrition_last_updated 
      FROM user_streaks 
      WHERE user_id = ${userId}
    `

    const today = new Date(date)
    let currentStreak = 0
    let bestStreak = 0
    let lastUpdated: Date | null = null

    if (streakData.length > 0) {
      currentStreak = streakData[0].nutrition_current_streak || 0
      bestStreak = streakData[0].nutrition_best_streak || 0
      lastUpdated = streakData[0].nutrition_last_updated ? new Date(streakData[0].nutrition_last_updated) : null
    }

    // Check if this is a consecutive day
    if (lastUpdated) {
      const dayDiff = differenceInDays(today, lastUpdated)

      if (dayDiff === 1) {
        // Consecutive day, increment streak
        currentStreak++
        console.log(`Consecutive nutrition day, incrementing streak to ${currentStreak}`)
      } else if (dayDiff === 0) {
        // Same day, don't change streak
        console.log("Same day nutrition log, not changing streak")
        return // Don't update database for same day
      } else {
        // Streak broken, reset to 1 for today's log
        console.log(`Nutrition streak broken (${dayDiff} days since last log), resetting to 1`)
        currentStreak = 1
      }
    } else {
      // First nutrition log
      currentStreak = 1
      console.log("First nutrition log, setting streak to 1")
    }

    // Update best streak if needed
    if (currentStreak > bestStreak) {
      bestStreak = currentStreak
      console.log(`New best nutrition streak: ${bestStreak}`)
    }

    // Update database
    await sql`
      INSERT INTO user_streaks (
        user_id, nutrition_current_streak, nutrition_best_streak, nutrition_last_updated
      ) VALUES (
        ${userId}, ${currentStreak}, ${bestStreak}, ${date}::date
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        nutrition_current_streak = ${currentStreak},
        nutrition_best_streak = ${bestStreak},
        nutrition_last_updated = ${date}::date
    `

    console.log("Nutrition streak updated successfully")
  } catch (error) {
    console.error("Error updating nutrition streak:", error)
  }
}

// Check if all nutrition targets are met
export async function checkNutritionTargets(userId: number, date: string): Promise<boolean> {
  try {
    // Get user nutrition goals
    const goalsResult = await sql`
      SELECT protein_goal, carbs_goal, fat_goal, calories_goal, water_goal
      FROM user_nutrition_goals
      WHERE user_id = ${userId}
      LIMIT 1
    `

    // Define default macro goals
    const MACRO_GOALS = {
      protein: 190, // 190g protein
      carbs: 280, // 280g carbs
      fat: 80, // 80g fat
      calories: 2600, // Calculated based on macros
      water: 3000, // 3000ml water
    }

    // Use custom goals if available
    if (goalsResult && goalsResult.length > 0) {
      MACRO_GOALS.protein = goalsResult[0].protein_goal || MACRO_GOALS.protein
      MACRO_GOALS.carbs = goalsResult[0].carbs_goal || MACRO_GOALS.carbs
      MACRO_GOALS.fat = goalsResult[0].fat_goal || MACRO_GOALS.fat
      MACRO_GOALS.calories = goalsResult[0].calories_goal || MACRO_GOALS.calories
      MACRO_GOALS.water = goalsResult[0].water_goal || MACRO_GOALS.water
    }

    // Get nutrition log for the date
    const logResult = await sql`
      SELECT id FROM nutrition_logs 
      WHERE user_id = ${userId} AND date = ${date}::date
      LIMIT 1
    `

    if (!logResult || logResult.length === 0) {
      console.log("No nutrition log found for this date")
      return false
    }

    const logId = logResult[0].id

    // Calculate total macros from meals
    const mealsResult = await sql`
      SELECT 
        SUM(m.protein * nlm.quantity) as total_protein,
        SUM(m.carbs * nlm.quantity) as total_carbs,
        SUM(m.fat * nlm.quantity) as total_fat,
        SUM(m.calories * nlm.quantity) as total_calories
      FROM nutrition_log_meals nlm
      JOIN meals m ON nlm.meal_id = m.id
      WHERE nlm.nutrition_log_id = ${logId}
    `

    // Get water intake
    const waterResult = await sql`
      SELECT amount
      FROM nutrition_log_other_items nloi
      JOIN other_items oi ON nloi.other_item_id = oi.id
      WHERE nloi.nutrition_log_id = ${logId}
      AND oi.name = 'Water'
      LIMIT 1
    `

    const totalProtein = mealsResult[0]?.total_protein || 0
    const totalCarbs = mealsResult[0]?.total_carbs || 0
    const totalFat = mealsResult[0]?.total_fat || 0
    const totalCalories = mealsResult[0]?.total_calories || 0
    const waterAmount = waterResult[0]?.amount || 0

    // Check if all targets are met
    const proteinMet = totalProtein >= MACRO_GOALS.protein
    const carbsMet = totalCarbs >= MACRO_GOALS.carbs
    const fatMet = totalFat >= MACRO_GOALS.fat
    const caloriesMet = totalCalories >= MACRO_GOALS.calories
    const waterMet = waterAmount >= MACRO_GOALS.water

    const allTargetsMet = proteinMet && carbsMet && fatMet && caloriesMet && waterMet

    console.log(`Nutrition targets check for ${date}:`, {
      protein: `${totalProtein}/${MACRO_GOALS.protein}g (${proteinMet ? "Met" : "Not met"})`,
      carbs: `${totalCarbs}/${MACRO_GOALS.carbs}g (${carbsMet ? "Met" : "Not met"})`,
      fat: `${totalFat}/${MACRO_GOALS.fat}g (${fatMet ? "Met" : "Not met"})`,
      calories: `${totalCalories}/${MACRO_GOALS.calories} (${caloriesMet ? "Met" : "Not met"})`,
      water: `${waterAmount}/${MACRO_GOALS.water}ml (${waterMet ? "Met" : "Not met"})`,
      allTargetsMet,
    })

    return allTargetsMet
  } catch (error) {
    console.error("Error checking nutrition targets:", error)
    return false
  }
}

// Check if all workout exercises are completed
export async function checkWorkoutCompletion(userId: number, date: string): Promise<boolean> {
  try {
    // Get workout for the date
    const workoutResult = await sql`
      SELECT id FROM workouts 
      WHERE user_id = ${userId} AND date = ${date}::date
      LIMIT 1
    `

    if (!workoutResult || workoutResult.length === 0) {
      console.log("No workout found for this date")
      return false
    }

    const workoutId = workoutResult[0].id

    // Get day of week for the date
    const dayOfWeek = new Date(date).getDay()

    // Define custom workout schedule
    const workoutDays = new Set([1, 2, 4, 6]) // Monday, Tuesday, Thursday, Saturday
    const restDays = new Set([0, 3, 5]) // Sunday, Wednesday, Friday

    // If it's a rest day, consider it completed
    if (restDays.has(dayOfWeek)) {
      console.log("Rest day, considering workout completed")
      return true
    }

    // Get expected number of exercises for this day
    const dayCategories = await sql`
      SELECT category FROM exercises
      WHERE category = ANY(
        CASE 
          WHEN ${dayOfWeek} = 0 THEN ARRAY['Recovery']::varchar[]
          WHEN ${dayOfWeek} = 1 THEN ARRAY['Chest', 'Arms', 'Shoulders']::varchar[]
          WHEN ${dayOfWeek} = 2 THEN ARRAY['Back', 'Arms']::varchar[]
          WHEN ${dayOfWeek} = 3 THEN ARRAY['Recovery']::varchar[]
          WHEN ${dayOfWeek} = 4 THEN ARRAY['Legs']::varchar[]
          WHEN ${dayOfWeek} = 5 THEN ARRAY['Recovery']::varchar[]
          WHEN ${dayOfWeek} = 6 THEN ARRAY['Shoulders', 'Arms']::varchar[]
        END
      )
      GROUP BY category
    `

    // Get number of expected exercises (max 8)
    const expectedExercisesResult = await sql`
      SELECT COUNT(*) as count
      FROM exercises
      WHERE category = ANY(
        CASE 
          WHEN ${dayOfWeek} = 0 THEN ARRAY['Recovery']::varchar[]
          WHEN ${dayOfWeek} = 1 THEN ARRAY['Chest', 'Arms', 'Shoulders']::varchar[]
          WHEN ${dayOfWeek} = 2 THEN ARRAY['Back', 'Arms']::varchar[]
          WHEN ${dayOfWeek} = 3 THEN ARRAY['Recovery']::varchar[]
          WHEN ${dayOfWeek} = 4 THEN ARRAY['Legs']::varchar[]
          WHEN ${dayOfWeek} = 5 THEN ARRAY['Recovery']::varchar[]
          WHEN ${dayOfWeek} = 6 THEN ARRAY['Shoulders', 'Arms']::varchar[]
        END
      )
      LIMIT 8
    `

    // Safely extract the count value with proper error handling
    let expectedExercises = 0
    if (expectedExercisesResult && expectedExercisesResult.length > 0) {
      // Handle different possible formats of the count result
      const countValue = expectedExercisesResult[0].count
      expectedExercises = typeof countValue === "number" ? countValue : Number.parseInt(countValue, 10) || 0

      // Limit to max 8 exercises
      expectedExercises = Math.min(8, expectedExercises)
    }

    console.log(`Expected exercises for day ${dayOfWeek}: ${expectedExercises}`)

    // Get number of completed exercises
    const completedExercisesResult = await sql`
      SELECT COUNT(*) as count
      FROM workout_exercises
      WHERE workout_id = ${workoutId}
    `

    // Safely extract the completed count
    let completedExercises = 0
    if (completedExercisesResult && completedExercisesResult.length > 0) {
      const countValue = completedExercisesResult[0].count
      completedExercises = typeof countValue === "number" ? countValue : Number.parseInt(countValue, 10) || 0
    }

    console.log(`Completed exercises: ${completedExercises}`)

    const allCompleted = completedExercises >= expectedExercises && expectedExercises > 0

    console.log(`Workout completion check for ${date}:`, {
      expectedExercises,
      completedExercises,
      allCompleted,
    })

    return allCompleted
  } catch (error) {
    console.error("Error checking workout completion:", error)
    return false
  }
}

// Reset current streaks when scheduled days are missed
export async function resetStreaksForMissedDays(userId: number, currentDate: string) {
  try {
    console.log(`Checking for missed scheduled days to reset streaks for user ${userId} on ${currentDate}`)

    const streakData = await sql`
      SELECT 
        nutrition_current_streak, 
        nutrition_last_updated,
        workout_current_streak, 
        workout_last_updated
      FROM user_streaks 
      WHERE user_id = ${userId}
    `

    if (!streakData || streakData.length === 0) {
      return
    }

    const streak = streakData[0]
    const today = new Date(currentDate)
    let needsUpdate = false
    let newNutritionStreak = streak.nutrition_current_streak || 0
    let newWorkoutStreak = streak.workout_current_streak || 0

    // Define custom workout schedule
    const workoutDays = new Set([1, 2, 4, 6]) // Monday, Tuesday, Thursday, Saturday

    // Check nutrition streak (still daily)
    if (streak.nutrition_last_updated) {
      const daysSinceNutrition = differenceInDays(today, new Date(streak.nutrition_last_updated))
      if (daysSinceNutrition > 1 && newNutritionStreak > 0) {
        console.log(`Nutrition streak broken: ${daysSinceNutrition} days since last log`)
        newNutritionStreak = 0
        needsUpdate = true
      }
    }

    // Check workout streak (scheduled days only)
    if (streak.workout_last_updated && newWorkoutStreak > 0) {
      const lastWorkoutDate = new Date(streak.workout_last_updated)
      const missedWorkoutDays = getMissedWorkoutDays(lastWorkoutDate, today, workoutDays)

      if (missedWorkoutDays > 0) {
        console.log(`Workout streak broken: missed ${missedWorkoutDays} scheduled workout days`)
        newWorkoutStreak = 0
        needsUpdate = true
      }
    }

    // Update database if needed
    if (needsUpdate) {
      await sql`
        UPDATE user_streaks 
        SET 
          nutrition_current_streak = ${newNutritionStreak},
          workout_current_streak = ${newWorkoutStreak}
        WHERE user_id = ${userId}
      `
      console.log("Streaks reset for missed scheduled days")
    }
  } catch (error) {
    console.error("Error resetting streaks for missed scheduled days:", error)
  }
}
