"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export interface SimpleIngredient {
  id: number
  name: string
  protein: number
  carbs: number
  fat: number
  calories: number
  unit: string
  per_amount: number
}

export interface MealIngredient {
  ingredient: SimpleIngredient
  amount: number
}

// Get all ingredients
export async function getSimpleIngredients() {
  try {
    const result = await sql`
      SELECT id, name, protein::float, carbs::float, fat::float, calories, unit, per_amount
      FROM simple_ingredients
      ORDER BY name
    `

    console.log("🔍 Raw ingredients from DB:", result)

    const ingredients = result.map((row) => ({
      id: row.id,
      name: row.name,
      protein: Number(row.protein),
      carbs: Number(row.carbs),
      fat: Number(row.fat),
      calories: Number(row.calories),
      unit: row.unit,
      per_amount: Number(row.per_amount),
    })) as SimpleIngredient[]

    console.log("🔍 Processed ingredients:", ingredients)
    return ingredients
  } catch (error) {
    console.error("Error fetching ingredients:", error)
    return []
  }
}

// Search ingredients
export async function searchSimpleIngredients(query: string) {
  try {
    const result = await sql`
      SELECT id, name, protein::float, carbs::float, fat::float, calories, unit, per_amount
      FROM simple_ingredients
      WHERE name ILIKE ${`%${query}%`}
      ORDER BY name
      LIMIT 10
    `

    console.log("🔍 Search results from DB:", result)

    const ingredients = result.map((row) => ({
      id: row.id,
      name: row.name,
      protein: Number(row.protein),
      carbs: Number(row.carbs),
      fat: Number(row.fat),
      calories: Number(row.calories),
      unit: row.unit,
      per_amount: Number(row.per_amount),
    })) as SimpleIngredient[]

    console.log("🔍 Processed search results:", ingredients)
    return ingredients
  } catch (error) {
    console.error("Error searching ingredients:", error)
    return []
  }
}

// Calculate nutrition for amount
export function calculateNutrition(ingredient: SimpleIngredient, amount: number) {
  console.log("🧮 Calculating nutrition for:", {
    ingredient: ingredient.name,
    ingredientData: ingredient,
    amount,
    per_amount: ingredient.per_amount,
  })

  const ratio = amount / ingredient.per_amount
  console.log("🧮 Ratio:", ratio)

  const result = {
    protein: Math.round(ingredient.protein * ratio * 10) / 10,
    carbs: Math.round(ingredient.carbs * ratio * 10) / 10,
    fat: Math.round(ingredient.fat * ratio * 10) / 10,
    calories: Math.round(ingredient.calories * ratio),
  }

  console.log("🧮 Calculated nutrition:", result)
  return result
}

// Calculate total nutrition for multiple ingredients
export function calculateTotalNutrition(mealIngredients: MealIngredient[]) {
  console.log("🧮 Calculating total nutrition for meal ingredients:", mealIngredients)

  const total = mealIngredients.reduce(
    (total, { ingredient, amount }) => {
      console.log("🧮 Processing ingredient:", ingredient.name, "amount:", amount)
      const nutrition = calculateNutrition(ingredient, amount)
      console.log("🧮 Individual nutrition:", nutrition)

      const newTotal = {
        protein: Math.round((total.protein + nutrition.protein) * 10) / 10,
        carbs: Math.round((total.carbs + nutrition.carbs) * 10) / 10,
        fat: Math.round((total.fat + nutrition.fat) * 10) / 10,
        calories: total.calories + nutrition.calories,
      }

      console.log("🧮 Running total:", newTotal)
      return newTotal
    },
    { protein: 0, carbs: 0, fat: 0, calories: 0 },
  )

  console.log("🧮 Final total nutrition:", total)
  return total
}

// Save meal to database
export async function saveMeal(data: {
  name: string
  category: string
  protein: number
  carbs: number
  fat: number
  calories: number
  description?: string
}) {
  try {
    const result = await sql`
      INSERT INTO custom_meals (name, category, protein, carbs, fat, calories, description, user_id)
      VALUES (${data.name}, ${data.category}, ${data.protein}, ${data.carbs}, ${data.fat}, ${data.calories}, ${data.description || ""}, 1)
      RETURNING *
    `

    revalidatePath("/dashboard/nutrition")

    return {
      success: true,
      meal: result[0],
    }
  } catch (error) {
    console.error("Error saving meal:", error)
    return {
      success: false,
      message: "Failed to save meal",
    }
  }
}
