"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export interface MealIngredient {
  id: number
  name: string
  protein: number
  carbs: number
  fat: number
  calories: number
  measurement_type: "weight" | "volume" | "quantity"
  unit: string
  per_amount: number
  amount_per?: number
}

// Search for meal ingredients
export async function searchMealIngredients(query: string): Promise<MealIngredient[]> {
  try {
    console.log("🔍 Searching for ingredients with query:", query)

    const results = await sql`
      SELECT 
        id,
        name,
        protein::float as protein,
        carbs::float as carbs,
        fat::float as fat,
        calories,
        measurement_type,
        unit,
        per_amount,
        amount_per
      FROM meal_ingredients
      WHERE name ILIKE ${"%" + query + "%"}
      ORDER BY name
      LIMIT 10
    `

    console.log("🔍 Database search results:", results)

    // Ensure all numeric values are properly converted
    const ingredients = results.map((row: any) => ({
      id: Number(row.id),
      name: String(row.name),
      protein: Number(row.protein),
      carbs: Number(row.carbs),
      fat: Number(row.fat),
      calories: Number(row.calories),
      measurement_type: row.measurement_type,
      unit: String(row.unit),
      per_amount: Number(row.per_amount),
      amount_per: row.amount_per ? Number(row.amount_per) : undefined,
    }))

    console.log("🔍 Processed ingredients:", ingredients)
    return ingredients
  } catch (error) {
    console.error("Error searching meal ingredients:", error)
    return []
  }
}

// Get all meal ingredients
export async function getMealIngredients(): Promise<MealIngredient[]> {
  try {
    const results = await sql`
      SELECT id, name, protein::float, carbs::float, fat::float, calories, 
             measurement_type, unit, per_amount, amount_per
      FROM meal_ingredients
      ORDER BY name
    `

    // Ensure all numeric values are properly converted
    const ingredients = results.map((row: any) => ({
      id: Number(row.id),
      name: String(row.name),
      protein: Number(row.protein),
      carbs: Number(row.carbs),
      fat: Number(row.fat),
      calories: Number(row.calories),
      measurement_type: row.measurement_type,
      unit: String(row.unit),
      per_amount: Number(row.per_amount),
      amount_per: row.amount_per ? Number(row.amount_per) : undefined,
    }))

    return ingredients
  } catch (error) {
    console.error("Error fetching meal ingredients:", error)
    return []
  }
}

// Add new meal ingredient
export async function addMealIngredient(data: {
  name: string
  protein: number
  carbs: number
  fat: number
  calories: number
  measurement_type: string
  unit: string
  per_amount: number
  amount_per?: number
}) {
  try {
    // For quantity-based ingredients, set amount_per
    const amountPer = data.measurement_type === "quantity" ? data.per_amount : null

    const result = await sql`
      INSERT INTO meal_ingredients (
        name, protein, carbs, fat, calories, 
        measurement_type, unit, per_amount, amount_per
      )
      VALUES (
        ${data.name}, ${data.protein}, ${data.carbs}, ${data.fat}, ${data.calories},
        ${data.measurement_type}, ${data.unit}, ${data.per_amount}, ${amountPer}
      )
      RETURNING id, name
    `

    revalidatePath("/dashboard/nutrition")

    return {
      success: true,
      message: `${data.name} added successfully`,
      ingredient: result[0],
    }
  } catch (error) {
    console.error("Error adding meal ingredient:", error)
    return {
      success: false,
      message: "Failed to add ingredient",
    }
  }
}
