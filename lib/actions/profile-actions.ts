"use server"

import { revalidatePath } from "next/cache"
import { sql } from "@/lib/db"

// Types for our profile data
interface ProfileData {
  userId: number
  dateOfBirth: string
  height: string
  weight: number
  gender: string
  activityLevel: string
  fitnessGoals: string[]
  targetWeight?: number
  bodyFat?: number
}

// Get profile data for a user
export async function getProfileData(userId: number) {
  try {
    console.log(`Fetching profile data for user ${userId}`)

    // Get the profile data
    const profileResult = await sql`
      SELECT 
        date_of_birth as "dateOfBirth", 
        height, 
        weight, 
        gender, 
        activity_level as "activityLevel", 
        fitness_goals as "fitnessGoals", 
        target_weight as "targetWeight",
        body_fat as "bodyFat"
      FROM user_profiles 
      WHERE user_id = ${userId}
      LIMIT 1
    `

    if (!profileResult || profileResult.length === 0) {
      console.log("No profile found for this user")
      return {
        success: true,
        data: {
          userId,
          dateOfBirth: "2003-05-09", // Default to May 9th, 2003
          height: "",
          weight: 0,
          gender: "Male",
          activityLevel: "Moderately Active",
          fitnessGoals: [],
          targetWeight: null,
          bodyFat: null,
        },
      }
    }

    const profile = profileResult[0]
    console.log(`Found profile for user ${userId}:`, profile)

    // If dateOfBirth is null or undefined, set it to May 9th, 2003
    if (!profile.dateOfBirth) {
      profile.dateOfBirth = "2003-05-09"
    }

    return {
      success: true,
      data: {
        userId,
        ...profile,
        dateOfBirth: profile.dateOfBirth || "2003-05-09", // Ensure May 9th, 2003 is used if no date is found
        fitnessGoals: profile.fitnessGoals || [],
      },
    }
  } catch (error) {
    console.error("Error fetching profile data:", error)
    return { success: false, message: "Failed to fetch profile data" }
  }
}

// Save profile data
export async function saveProfileData(data: ProfileData) {
  try {
    console.log("Server received profile data:", data)

    // Insert or update the profile
    await sql`
      INSERT INTO user_profiles (
        user_id, 
        date_of_birth,
        height, 
        weight, 
        gender, 
        activity_level, 
        fitness_goals, 
        target_weight,
        body_fat
      )
      VALUES (
        ${data.userId}, 
        ${data.dateOfBirth || "2003-05-09"}::date, 
        ${data.height}, 
        ${data.weight}, 
        ${data.gender}, 
        ${data.activityLevel}, 
        ${data.fitnessGoals}::text[], 
        ${data.targetWeight || null},
        ${data.bodyFat || null}
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        date_of_birth = ${data.dateOfBirth || "2003-05-09"}::date,
        height = ${data.height},
        weight = ${data.weight},
        gender = ${data.gender},
        activity_level = ${data.activityLevel},
        fitness_goals = ${data.fitnessGoals}::text[],
        target_weight = ${data.targetWeight || null},
        body_fat = ${data.bodyFat || null},
        updated_at = CURRENT_TIMESTAMP
    `

    // Revalidate the profile page
    revalidatePath("/dashboard/profile")

    return { success: true, message: "Profile saved successfully" }
  } catch (error) {
    console.error("Error saving profile data:", error)
    return { success: false, message: "Failed to save profile data" }
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
