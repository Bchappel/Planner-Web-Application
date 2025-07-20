"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

// Save a weight record
export async function saveWeightRecord(userId: number, weight: number, date: string) {
  try {
    console.log(`Saving weight record for user ${userId}: ${weight}kg on ${date}`)

    // Insert the weight record
    await sql`
      INSERT INTO weight_records (user_id, weight, date)
      VALUES (${userId}, ${weight}, ${date}::date)
    `

    // Update the user's current weight in their profile
    await sql`
      UPDATE user_profiles
      SET weight = ${weight}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId}
    `

    // Revalidate relevant paths
    revalidatePath("/dashboard/profile")

    return { success: true, message: "Weight record saved successfully" }
  } catch (error) {
    console.error("Error saving weight record:", error)
    return { success: false, message: "Failed to save weight record" }
  }
}

// Get weight history for a user
export async function getWeightHistory(userId: number, limit = 10) {
  try {
    const records = await sql`
      SELECT weight, date
      FROM weight_records
      WHERE user_id = ${userId}
      ORDER BY date DESC
      LIMIT ${limit}
    `

    return { success: true, data: records }
  } catch (error) {
    console.error("Error fetching weight history:", error)
    return { success: false, message: "Failed to fetch weight history" }
  }
}
