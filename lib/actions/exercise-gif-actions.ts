"use server"

import { neon } from "@neondatabase/serverless"

export async function getExerciseGif(exerciseName: string) {
  try {
    console.log(`🔍 Looking for GIF for exercise: "${exerciseName}"`)

    const sql = neon(process.env.DATABASE_URL!)

    // Use neon directly with parameterized query
    const result = await sql`
      SELECT name, gif_url 
      FROM exercises 
      WHERE LOWER(name) = LOWER(${exerciseName}) 
      AND gif_url IS NOT NULL 
      LIMIT 1
    `

    console.log(`🔍 Query result:`, result)

    if (result.length > 0) {
      const exercise = result[0]
      console.log(`✅ Found GIF for: ${exercise.name}`)
      console.log(`✅ GIF URL: ${exercise.gif_url}`)

      return {
        success: true,
        name: exercise.name,
        gifUrl: exercise.gif_url,
      }
    }

    console.log(`❌ No GIF found for: ${exerciseName}`)
    return {
      success: false,
      message: `No GIF found for ${exerciseName}`,
    }
  } catch (error) {
    console.error("❌ Error fetching exercise GIF:", error)
    return {
      success: false,
      message: "Error fetching exercise GIF",
    }
  }
}
