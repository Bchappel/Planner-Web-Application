"use server"

import { revalidatePath } from "next/cache"
import { sql } from "@/lib/db"

// Types for nutrition goals
interface NutritionGoals {
  protein: number
  carbs: number
  fat: number
  water: number
  calories: number
}

// Get user's nutrition goals from database
export async function getUserNutritionGoals(userId: number): Promise<NutritionGoals> {
  try {
    const result = await sql`
      SELECT 
        protein_goal as protein,
        carbs_goal as carbs,
        fat_goal as fat,
        water_goal as water,
        calories_goal as calories
      FROM user_nutrition_goals 
      WHERE user_id = ${userId}
      LIMIT 1
    `

    if (result.length > 0) {
      return {
        protein: Number(result[0].protein),
        carbs: Number(result[0].carbs),
        fat: Number(result[0].fat),
        water: Number(result[0].water),
        calories: Number(result[0].calories),
      }
    }

    // Return default goals if no record exists
    return {
      protein: 190,
      carbs: 280,
      fat: 80,
      water: 3000,
      calories: 2600,
    }
  } catch (error) {
    console.error("Error fetching user nutrition goals:", error)
    // Return default goals on error
    return {
      protein: 190,
      carbs: 280,
      fat: 80,
      water: 3000,
      calories: 2600,
    }
  }
}

// Save user's nutrition goals to database
export async function saveUserNutritionGoals(userId: number, goals: NutritionGoals) {
  try {
    // Calculate calories based on macros (4 cal/g protein, 4 cal/g carbs, 9 cal/g fat)
    const calculatedCalories = goals.protein * 4 + goals.carbs * 4 + goals.fat * 9

    const result = await sql`
      INSERT INTO user_nutrition_goals (
        user_id, 
        protein_goal, 
        carbs_goal, 
        fat_goal, 
        water_goal, 
        calories_goal,
        updated_at
      )
      VALUES (
        ${userId}, 
        ${goals.protein}, 
        ${goals.carbs}, 
        ${goals.fat}, 
        ${goals.water}, 
        ${calculatedCalories},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        protein_goal = EXCLUDED.protein_goal,
        carbs_goal = EXCLUDED.carbs_goal,
        fat_goal = EXCLUDED.fat_goal,
        water_goal = EXCLUDED.water_goal,
        calories_goal = EXCLUDED.calories_goal,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `

    revalidatePath("/dashboard/nutrition")

    return {
      success: true,
      message: "Nutrition goals saved successfully",
      goals: {
        ...goals,
        calories: calculatedCalories,
      },
    }
  } catch (error) {
    console.error("Error saving user nutrition goals:", error)
    return {
      success: false,
      message: "Failed to save nutrition goals",
    }
  }
}

// Initialize default goals for a new user
export async function initializeUserNutritionGoals(userId: number) {
  try {
    const existingGoals = await sql`
      SELECT id FROM user_nutrition_goals WHERE user_id = ${userId} LIMIT 1
    `

    if (existingGoals.length === 0) {
      await sql`
        INSERT INTO user_nutrition_goals (user_id, protein_goal, carbs_goal, fat_goal, water_goal, calories_goal)
        VALUES (${userId}, 190, 280, 80, 3000, 2600)
      `

      return {
        success: true,
        message: "Default nutrition goals initialized",
      }
    }

    return {
      success: true,
      message: "User already has nutrition goals",
    }
  } catch (error) {
    console.error("Error initializing user nutrition goals:", error)
    return {
      success: false,
      message: "Failed to initialize nutrition goals",
    }
  }
}
