"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export interface Ingredient {
  id: number
  name: string
  protein: number
  carbs: number
  fat: number
  calories: number
  measurement_type: string
  unit: string
  per_amount: number
}

// Helper function to ensure we're working with numbers
const safeNumber = (value: any, defaultValue = 0): number => {
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

// Calculate nutrition for a specific amount of an ingredient
export async function calculateNutritionForAmount(
  ingredient: Ingredient,
  amount: number,
): Promise<{
  protein: number
  carbs: number
  fat: number
  calories: number
}> {
  console.log("🔍 calculateNutritionForAmount - START")
  console.log("🔍 calculateNutritionForAmount - Input ingredient:", ingredient)
  console.log("🔍 calculateNutritionForAmount - Input amount:", amount)

  // Convert all values to numbers to ensure proper calculation
  const proteinPerUnit = safeNumber(ingredient.protein)
  const carbsPerUnit = safeNumber(ingredient.carbs)
  const fatPerUnit = safeNumber(ingredient.fat)
  const caloriesPerUnit = safeNumber(ingredient.calories)
  const perAmount = safeNumber(ingredient.per_amount, 100)
  const safeAmount = safeNumber(amount, 0)

  console.log("🔍 calculateNutritionForAmount - Converted values:", {
    proteinPerUnit,
    carbsPerUnit,
    fatPerUnit,
    caloriesPerUnit,
    perAmount,
    safeAmount,
  })

  // Calculate the ratio of the requested amount to the base amount
  const ratio = safeAmount / perAmount

  console.log("🔍 calculateNutritionForAmount - Ratio:", ratio)

  // Calculate the nutrition values for the requested amount
  const protein = Math.round(proteinPerUnit * ratio * 10) / 10
  const carbs = Math.round(carbsPerUnit * ratio * 10) / 10
  const fat = Math.round(fatPerUnit * ratio * 10) / 10
  const calories = Math.round(caloriesPerUnit * ratio)

  console.log("🔍 calculateNutritionForAmount - Individual calculations:", {
    protein: `${proteinPerUnit} * ${ratio} = ${protein}`,
    carbs: `${carbsPerUnit} * ${ratio} = ${carbs}`,
    fat: `${fatPerUnit} * ${ratio} = ${fat}`,
    calories: `${caloriesPerUnit} * ${ratio} = ${calories}`,
  })

  const result = {
    protein,
    carbs,
    fat,
    calories,
  }

  console.log("🔍 calculateNutritionForAmount - Final result:", result)
  console.log("🔍 calculateNutritionForAmount - END")

  return result
}

// Get all ingredients
export async function getAllIngredients() {
  try {
    const ingredients = await sql`
      SELECT * FROM ingredients
      ORDER BY name ASC
    `

    // Convert string values to numbers
    return ingredients.map((ingredient) => ({
      ...ingredient,
      protein: safeNumber(ingredient.protein),
      carbs: safeNumber(ingredient.carbs),
      fat: safeNumber(ingredient.fat),
      calories: safeNumber(ingredient.calories),
      per_amount: safeNumber(ingredient.per_amount, 100),
    }))
  } catch (error) {
    console.error("Error fetching ingredients:", error)
    return []
  }
}

// Search ingredients
export async function searchIngredients(query: string) {
  try {
    const ingredients = await sql`
      SELECT * FROM ingredients
      WHERE name ILIKE ${`%${query}%`}
      ORDER BY name ASC
      LIMIT 20
    `

    // Convert string values to numbers
    return ingredients.map((ingredient) => ({
      ...ingredient,
      protein: safeNumber(ingredient.protein),
      carbs: safeNumber(ingredient.carbs),
      fat: safeNumber(ingredient.fat),
      calories: safeNumber(ingredient.calories),
      per_amount: safeNumber(ingredient.per_amount, 100),
    }))
  } catch (error) {
    console.error("Error searching ingredients:", error)
    return []
  }
}

// Add a new ingredient
export async function addIngredient(ingredient: Omit<Ingredient, "id">) {
  try {
    const result = await sql`
      INSERT INTO ingredients (
        name, protein, carbs, fat, calories, 
        measurement_type, unit, per_amount
      ) VALUES (
        ${ingredient.name}, 
        ${safeNumber(ingredient.protein)}, 
        ${safeNumber(ingredient.carbs)}, 
        ${safeNumber(ingredient.fat)}, 
        ${safeNumber(ingredient.calories)}, 
        ${ingredient.measurement_type}, 
        ${ingredient.unit}, 
        ${safeNumber(ingredient.per_amount, 100)}
      )
      RETURNING id
    `

    revalidatePath("/dashboard/ingredients")
    return { success: true, id: result[0].id }
  } catch (error) {
    console.error("Error adding ingredient:", error)
    return { success: false, error: "Failed to add ingredient" }
  }
}

// Update an ingredient
export async function updateIngredient(ingredient: Ingredient) {
  try {
    await sql`
      UPDATE ingredients
      SET 
        name = ${ingredient.name},
        protein = ${safeNumber(ingredient.protein)},
        carbs = ${safeNumber(ingredient.carbs)},
        fat = ${safeNumber(ingredient.fat)},
        calories = ${safeNumber(ingredient.calories)},
        measurement_type = ${ingredient.measurement_type},
        unit = ${ingredient.unit},
        per_amount = ${safeNumber(ingredient.per_amount, 100)}
      WHERE id = ${ingredient.id}
    `

    revalidatePath("/dashboard/ingredients")
    return { success: true }
  } catch (error) {
    console.error("Error updating ingredient:", error)
    return { success: false, error: "Failed to update ingredient" }
  }
}

// Delete an ingredient
export async function deleteIngredient(id: number) {
  try {
    await sql`
      DELETE FROM ingredients
      WHERE id = ${id}
    `

    revalidatePath("/dashboard/ingredients")
    return { success: true }
  } catch (error) {
    console.error("Error deleting ingredient:", error)
    return { success: false, error: "Failed to delete ingredient" }
  }
}
