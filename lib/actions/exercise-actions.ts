"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

// Get all exercises from the database
export async function getAllExercises() {
  try {
    const exercises = await sql`
      SELECT id, name, category 
      FROM exercises 
      ORDER BY category, name
    `

    return {
      success: true,
      exercises: exercises.map((ex: any) => ({
        id: ex.id,
        name: ex.name,
        category: ex.category,
      })),
    }
  } catch (error) {
    console.error("Error fetching all exercises:", error)
    return { success: false, message: "Failed to fetch exercises" }
  }
}

// Save a custom workout
export async function saveCustomWorkout(workoutData: Record<string, string[]>) {
  try {
    // In a real app, you would get the user ID from the session
    // For now, we'll use a placeholder user ID
    const userId = 1

    // Start a transaction
    await sql`BEGIN`

    // Delete existing custom workout for this user
    await sql`
      DELETE FROM custom_workouts 
      WHERE user_id = ${userId}
    `

    // Insert new custom workout data
    for (const [day, exerciseIds] of Object.entries(workoutData)) {
      if (exerciseIds.length === 0) continue

      for (const exerciseId of exerciseIds) {
        await sql`
          INSERT INTO custom_workouts (user_id, day_of_week, exercise_id)
          VALUES (${userId}, ${Number.parseInt(day)}, ${exerciseId})
        `
      }
    }

    await sql`COMMIT`

    // Revalidate relevant paths
    revalidatePath("/dashboard/workouts")
    revalidatePath("/dashboard/exercises")

    return { success: true }
  } catch (error) {
    console.error("Error saving custom workout:", error)
    await sql`ROLLBACK`
    return { success: false, message: "Failed to save custom workout" }
  }
}

// Get a user's custom workout
export async function getCustomWorkout() {
  try {
    // In a real app, you would get the user ID from the session
    const userId = 1

    const customWorkout = await sql`
      SELECT day_of_week, exercise_id
      FROM custom_workouts
      WHERE user_id = ${userId}
    `

    // Transform the data into the format we need
    const workoutByDay: Record<string, string[]> = {
      "0": [],
      "1": [],
      "2": [],
      "3": [],
      "4": [],
      "5": [],
      "6": [],
    }

    customWorkout.forEach((row: any) => {
      const day = row.day_of_week.toString()
      workoutByDay[day].push(row.exercise_id)
    })

    return { success: true, data: workoutByDay }
  } catch (error) {
    console.error("Error fetching custom workout:", error)
    return { success: false, message: "Failed to fetch custom workout" }
  }
}

// Create the custom_workouts table if it doesn't exist
export async function setupCustomWorkoutsTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS custom_workouts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        day_of_week INTEGER NOT NULL,
        exercise_id TEXT NOT NULL,
        UNIQUE(user_id, day_of_week, exercise_id)
      )
    `
    return { success: true }
  } catch (error) {
    console.error("Error setting up custom workouts table:", error)
    return { success: false, message: "Failed to set up custom workouts table" }
  }
}
