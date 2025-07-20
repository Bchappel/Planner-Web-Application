"use server"

import { revalidatePath } from "next/cache"
import { sql } from "@/lib/db"
import { updateWorkoutStreak, checkWorkoutCompletion } from "./streak-actions"

// Simplified types for our workout data
interface WorkoutExercise {
  exerciseId: string | number
  name: string
  category: string
  completed: boolean
  weight?: string
  sets?: string
  reps?: string
}

interface WorkoutData {
  userId: string | number
  date: string
  exercises: WorkoutExercise[]
}

// New interface for custom workout data
interface CustomWorkout {
  id: string | number
  name: string
  exercises: {
    id: string | number
    name: string
    category: string
  }[]
}

// Get custom workouts for a user
export async function getCustomWorkouts(userId: string | number) {
  try {
    // Get all custom workouts for this user
    const customWorkouts = await sql`
      SELECT 
        cw.id,
        cw.name,
        ARRAY_AGG(
          json_build_object(
            'id', e.id,
            'name', e.name,
            'category', e.category
          )
        ) as exercises
      FROM custom_workout_templates cw
      JOIN custom_workout_exercises cwe ON cw.id = cwe.workout_id
      JOIN exercises e ON cwe.exercise_id = e.id::text
      WHERE cw.user_id = ${userId}
      GROUP BY cw.id, cw.name
      ORDER BY cw.name
    `

    return {
      success: true,
      data: customWorkouts.map((workout: any) => ({
        id: workout.id,
        name: workout.name,
        exercises: workout.exercises,
      })),
    }
  } catch (error) {
    console.error("Error fetching custom workouts:", error)
    return { success: false, message: "Failed to fetch custom workouts" }
  }
}

// Save a custom workout template
export async function saveCustomWorkout(userId: string | number, name: string, exerciseIds: string[]) {
  try {
    // Start a transaction
    await sql`BEGIN`

    // Insert the custom workout template
    const workoutResult = await sql`
      INSERT INTO custom_workout_templates (user_id, name)
      VALUES (${userId}, ${name})
      RETURNING id
    `

    const workoutId = workoutResult[0].id

    // Insert each exercise
    for (const exerciseId of exerciseIds) {
      await sql`
        INSERT INTO custom_workout_exercises (workout_id, exercise_id)
        VALUES (${workoutId}, ${exerciseId})
      `
    }

    await sql`COMMIT`

    // Revalidate relevant pages
    revalidatePath("/dashboard/workouts")

    return { success: true, message: "Custom workout saved successfully", id: workoutId }
  } catch (error) {
    console.error("Error saving custom workout:", error)
    await sql`ROLLBACK`
    return { success: false, message: "Failed to save custom workout" }
  }
}

// This function determines which exercises show up on each day of the week
export async function getExercisesForDay(dayOfWeek: number) {
  try {
    // Check if there are custom exercises for this day
    try {
      const customWorkouts = await sql`
        SELECT e.id, e.name, e.category
        FROM custom_workouts cw
        JOIN exercises e ON cw.exercise_id = e.id::text
        WHERE cw.day_of_week = ${dayOfWeek}
        ORDER BY e.category, e.name
      `

      // Return custom workouts if they exist (even if empty)
      return customWorkouts.map((ex: any) => ({
        id: ex.id,
        name: ex.name,
        category: ex.category,
      }))
    } catch (error) {
      console.error("Error fetching custom workouts:", error)
      // Continue with default workouts if custom workouts fail
    }

    // If no custom workouts, use the default workout split
    // But now we'll provide some default exercises for every day
    const categoryMap: Record<number, string[]> = {
      0: ["Chest"], // Sunday - now has default exercises
      1: ["Chest", "Arms"], // Monday
      2: ["Back", "Arms"], // Tuesday
      3: ["Legs"], // Wednesday
      4: ["Shoulders", "Arms"], // Thursday
      5: ["Back", "Arms"], // Friday
      6: ["Legs"], // Saturday - now has default exercises
    }

    const categories = categoryMap[dayOfWeek] || ["Chest"]

    // Query exercises from the database based on categories
    const categoriesArray = `{${categories.map((c) => `"${c}"`).join(",")}}`
    const exercises = await sql`
      SELECT id, name, category 
      FROM exercises 
      WHERE category = ANY(${categoriesArray}::varchar[])
      ORDER BY category, name
      LIMIT 8
    `

    return exercises.map((ex: any) => ({
      id: ex.id,
      name: ex.name,
      category: ex.category,
    }))
  } catch (error) {
    console.error("Error fetching exercises:", error)
    return []
  }
}

// Save a workout to the database
export async function saveWorkout(data: WorkoutData) {
  try {
    console.log("Server received workout data:", data)

    // Start a transaction
    await sql`BEGIN`

    // Insert or update the workout
    const workoutResult = await sql`
      INSERT INTO workouts (user_id, date)
      VALUES (${data.userId}, ${data.date})
      ON CONFLICT (user_id, date) 
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `

    const workoutId = workoutResult[0].id
    console.log("Workout ID:", workoutId)

    // Delete existing workout exercises for this workout
    await sql`
      DELETE FROM workout_exercises WHERE workout_id = ${workoutId}
    `

    // Insert each completed exercise
    for (const exercise of data.exercises) {
      // Skip exercises that aren't completed
      if (!exercise.completed) continue

      console.log(`Adding completed exercise ${exercise.name} with weight ${exercise.weight || "none"}`)

      // Use the exercise name as the primary identifier since exerciseId might be null
      const exerciseId = exercise.exerciseId || null

      // Insert the exercise with weight
      await sql`
        INSERT INTO workout_exercises (workout_id, exercise_id, exercise_name, exercise_category, weight, sets, reps)
        VALUES (${workoutId}, ${exerciseId}, ${exercise.name}, ${exercise.category}, ${exercise.weight || null}, ${exercise.sets || null}, ${exercise.reps || null})
      `
    }

    await sql`COMMIT`

    // Check if all exercises are completed and update streak
    const allCompleted = await checkWorkoutCompletion(Number(data.userId), data.date)
    await updateWorkoutStreak(Number(data.userId), data.date, allCompleted)

    // Revalidate the workouts page
    revalidatePath("/dashboard/workouts")
    revalidatePath("/dashboard/profile")

    return { success: true, message: "Workout saved successfully" }
  } catch (error) {
    console.error("Error saving workout:", error)
    await sql`ROLLBACK`
    return { success: false, message: "Failed to save workout" }
  }
}

// Get a workout for a specific date
export async function getWorkout(userId: string | number, date: string) {
  try {
    console.log(`Fetching workout for user ${userId} on date ${date}`)

    // Get the workout
    const workoutResult = await sql`
      SELECT id FROM workouts 
      WHERE user_id = ${userId} AND date = ${date}::date
      LIMIT 1
    `

    if (!workoutResult || workoutResult.length === 0) {
      console.log("No workout found for this date")
      return { success: true, data: null }
    }

    const workoutId = workoutResult[0].id
    console.log(`Found workout with ID ${workoutId}`)

    // Get the completed exercises for this workout
    const exercisesResult = await sql`
      SELECT 
        exercise_id, 
        exercise_name, 
        exercise_category,
        weight,
        sets,
        reps
      FROM workout_exercises
      WHERE workout_id = ${workoutId}
      ORDER BY id
    `

    console.log(`Found ${exercisesResult.length} completed exercises for this workout`)

    // Map the exercises to our format
    const exercises = exercisesResult.map((exercise: any) => ({
      exerciseId: exercise.exercise_id,
      name: exercise.exercise_name,
      category: exercise.exercise_category,
      completed: true,
      weight: exercise.weight,
      sets: exercise.sets,
      reps: exercise.reps,
    }))

    return {
      success: true,
      data: {
        userId,
        date,
        exercises,
      },
    }
  } catch (error) {
    console.error("Error fetching workout:", error)
    // Return a more detailed error message
    return {
      success: false,
      message: `Failed to fetch workout data: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
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

// Save custom workout for a specific date
export async function saveCustomWorkoutForDate(dayOfWeek: number, exerciseIds: string[], date: string) {
  try {
    // For now, we'll use a fixed user ID (1) for testing
    // In a real app, you'd get this from the authenticated user
    const userId = 1

    // Start a transaction
    await sql`BEGIN`

    // Delete existing custom workouts for this day
    await sql`
      DELETE FROM custom_workouts 
      WHERE user_id = ${userId} AND day_of_week = ${dayOfWeek}
    `

    // Insert each selected exercise (only if there are any)
    for (const exerciseId of exerciseIds) {
      await sql`
        INSERT INTO custom_workouts (user_id, day_of_week, exercise_id)
        VALUES (${userId}, ${dayOfWeek}, ${exerciseId})
      `
    }

    await sql`COMMIT`

    // Revalidate relevant pages
    revalidatePath("/dashboard/workouts")
    revalidatePath("/dashboard")

    return { success: true, message: "Custom workout saved successfully" }
  } catch (error) {
    console.error("Error saving custom workout:", error)
    await sql`ROLLBACK`
    return { success: false, message: "Failed to save custom workout" }
  }
}

// Get all exercises
export async function getAllExercises() {
  try {
    const exercises = await sql`
      SELECT id, name, category
      FROM exercises
      ORDER BY category, name
    `

    return { success: true, data: exercises }
  } catch (error) {
    console.error("Error fetching all exercises:", error)
    return { success: false, message: "Failed to fetch exercises" }
  }
}
