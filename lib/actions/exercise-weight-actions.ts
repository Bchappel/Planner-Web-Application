"use server"

import { neon } from "@neondatabase/serverless"

// Define the data structure for exercise weight history
export type ExerciseWeightData = {
  date: string
  exercise_name: string
  weight: number
}

export async function getExerciseWeightHistory(days = 30): Promise<ExerciseWeightData[]> {
  const sql = neon(process.env.DATABASE_URL!)

  try {
    const result = await sql`
      SELECT 
        w.date,
        we.exercise_name,
        CAST(we.weight AS FLOAT) as weight
      FROM 
        workouts w
      JOIN 
        workout_exercises we ON w.id = we.workout_id
      WHERE 
        w.date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY 
        we.exercise_name, w.date
    `

    return result.map((row) => ({
      date: new Date(row.date).toISOString().split("T")[0],
      exercise_name: row.exercise_name,
      weight: row.weight,
    }))
  } catch (error) {
    console.error("Error fetching exercise weight history:", error)
    return []
  }
}
