"use server"

import { revalidatePath } from "next/cache"
import { sql } from "@/lib/db"
import { updateNutritionStreak, checkNutritionTargets } from "./streak-actions"

// Types for our nutrition data
interface Meal {
  id: number
  name: string
  category: string
  protein: number
  carbs: number
  fat: number
  calories: number
  description?: string
  recipe?: string
}

interface MealSelection {
  mealId: number
  category: string
  quantity: number
  logged_protein?: number
  logged_carbs?: number
  logged_fat?: number
  logged_calories?: number
  logged_meal_name?: string
}

interface OtherItem {
  id: number
  name: string
  category: string
  unit: string
  dailyGoal: number
}

interface OtherItemTracking {
  itemId: number
  amount: number
}

interface NutritionData {
  userId: string | number
  date: string
  meals: MealSelection[]
  otherItems: OtherItemTracking[]
}

// Get all meals and organize them by category - CUSTOM MEALS ONLY
export async function getAllMealsByCategory() {
  try {
    const allMeals = await sql`
      SELECT id, name, category, protein, carbs, fat, calories, is_custom, description, recipe
      FROM meals
      WHERE is_custom = true
      ORDER BY category, name
    `

    // Organize meals by category
    const mealsByCategory: Record<string, any[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    }

    allMeals.forEach((meal: any) => {
      const category = meal.category.toLowerCase()
      if (mealsByCategory[category]) {
        mealsByCategory[category].push(meal)
      }
    })

    return mealsByCategory
  } catch (error) {
    console.error("Error fetching custom meals:", error)
    return {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    }
  }
}

// Get meals by category - CUSTOM MEALS ONLY
export async function getMealsByCategory(category: string) {
  try {
    const meals = await sql`
      SELECT id, name, category, protein, carbs, fat, calories, is_custom, description, recipe
      FROM meals
      WHERE category = ${category} AND is_custom = true
      ORDER BY name
    `

    return meals
  } catch (error) {
    console.error(`Error fetching ${category} meals:`, error)
    return []
  }
}

// Get all meals - CUSTOM MEALS ONLY
export async function getAllMeals() {
  try {
    const meals = await sql`
      SELECT id, name, category, protein, carbs, fat, calories, is_custom, description, recipe
      FROM meals
      WHERE is_custom = true
      ORDER BY category, name
    `

    return meals
  } catch (error) {
    console.error("Error fetching all meals:", error)
    return []
  }
}

// Get all other trackable items
export async function getOtherItems() {
  const maxRetries = 3
  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const items = await sql`
        SELECT id, name, category, unit, daily_goal as "dailyGoal"
        FROM other_items
        ORDER BY category, name
      `

      return items
    } catch (error) {
      lastError = error
      console.error(`Error fetching other items (attempt ${attempt}):`, error)

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  return []
}

// Add creatine supplement to the database if it doesn't exist
export async function addCreatineSupplement() {
  try {
    const existingCreatine = await sql`
      SELECT id FROM other_items 
      WHERE name = 'Creatine Monohydrate' AND category = 'supplements'
      LIMIT 1
    `

    if (existingCreatine.length > 0) {
      return {
        success: true,
        message: "Creatine supplement already exists",
        id: existingCreatine[0].id,
        exists: true,
      }
    }

    const result = await sql`
      INSERT INTO other_items (name, category, unit, daily_goal)
      VALUES ('Creatine Monohydrate', 'supplements', 'serving', 1)
      RETURNING id
    `

    const creatineId = result[0].id

    revalidatePath("/dashboard/nutrition")

    return {
      success: true,
      message: "Creatine supplement added successfully",
      id: creatineId,
      exists: false,
    }
  } catch (error) {
    console.error("Error adding creatine supplement:", error)
    return { success: false, message: "Failed to add creatine supplement" }
  }
}

// Save nutrition log with historical data preservation
export async function saveNutritionLog(data: NutritionData) {
  try {
    await sql`BEGIN`

    // Calculate totals from current meal data
    let totalProtein = 0
    let totalCarbs = 0
    let totalFat = 0
    let totalCalories = 0
    let totalWater = 0
    let creatineTaken = false

    // Get current meal data to calculate totals
    const mealIds = data.meals.map((m) => m.mealId)
    let currentMeals: any[] = []

    if (mealIds.length > 0) {
      currentMeals = await sql`
        SELECT id, name, protein, carbs, fat, calories
        FROM meals
        WHERE id = ANY(${mealIds})
      `
    }

    // Calculate meal totals and prepare meal data with logged values
    const mealsWithLoggedData = data.meals.map((mealSelection) => {
      const currentMeal = currentMeals.find((m) => m.id === mealSelection.mealId)
      if (currentMeal) {
        const mealProtein = Number(currentMeal.protein) * mealSelection.quantity
        const mealCarbs = Number(currentMeal.carbs) * mealSelection.quantity
        const mealFat = Number(currentMeal.fat) * mealSelection.quantity
        const mealCalories = Number(currentMeal.calories) * mealSelection.quantity

        totalProtein += mealProtein
        totalCarbs += mealCarbs
        totalFat += mealFat
        totalCalories += mealCalories

        return {
          ...mealSelection,
          logged_protein: mealProtein,
          logged_carbs: mealCarbs,
          logged_fat: mealFat,
          logged_calories: mealCalories,
          logged_meal_name: currentMeal.name,
        }
      }
      return mealSelection
    })

    // Calculate other items totals
    for (const item of data.otherItems) {
      const otherItem = await sql`
        SELECT name, category FROM other_items WHERE id = ${item.itemId} LIMIT 1
      `

      if (otherItem.length > 0) {
        if (otherItem[0].category === "hydration" && otherItem[0].name === "Water") {
          totalWater = item.amount
        }
        if (otherItem[0].category === "supplements" && otherItem[0].name === "Creatine Monohydrate") {
          creatineTaken = item.amount > 0
        }
      }
    }

    // Insert or update nutrition log with calculated totals
    const logResult = await sql`
      INSERT INTO nutrition_logs (
        user_id, 
        date, 
        total_protein, 
        total_carbs, 
        total_fat, 
        total_calories, 
        total_water, 
        creatine_taken
      )
      VALUES (
        ${data.userId}, 
        ${data.date}, 
        ${totalProtein}, 
        ${totalCarbs}, 
        ${totalFat}, 
        ${totalCalories}, 
        ${totalWater}, 
        ${creatineTaken}
      )
      ON CONFLICT (user_id, date) 
      DO UPDATE SET 
        total_protein = EXCLUDED.total_protein,
        total_carbs = EXCLUDED.total_carbs,
        total_fat = EXCLUDED.total_fat,
        total_calories = EXCLUDED.total_calories,
        total_water = EXCLUDED.total_water,
        creatine_taken = EXCLUDED.creatine_taken,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `

    const logId = logResult[0].id

    // Clear existing meal entries
    await sql`
      DELETE FROM nutrition_log_meals WHERE nutrition_log_id = ${logId}
    `

    // Insert meals with logged nutrition values
    for (const meal of mealsWithLoggedData) {
      await sql`
        INSERT INTO nutrition_log_meals (
          nutrition_log_id, 
          meal_id, 
          meal_category, 
          quantity,
          logged_protein,
          logged_carbs,
          logged_fat,
          logged_calories,
          logged_meal_name
        )
        VALUES (
          ${logId}, 
          ${meal.mealId}, 
          ${meal.category}, 
          ${meal.quantity},
          ${meal.logged_protein || 0},
          ${meal.logged_carbs || 0},
          ${meal.logged_fat || 0},
          ${meal.logged_calories || 0},
          ${meal.logged_meal_name || ""}
        )
      `
    }

    // Clear existing other items
    await sql`
      DELETE FROM nutrition_log_other_items WHERE nutrition_log_id = ${logId}
    `

    // Insert other items
    for (const item of data.otherItems) {
      await sql`
        INSERT INTO nutrition_log_other_items (nutrition_log_id, other_item_id, amount)
        VALUES (${logId}, ${item.itemId}, ${item.amount})
      `
    }

    await sql`COMMIT`

    const allTargetsMet = await checkNutritionTargets(Number(data.userId), data.date)
    await updateNutritionStreak(Number(data.userId), data.date, allTargetsMet)

    revalidatePath("/dashboard/nutrition")
    revalidatePath("/dashboard/profile")

    return { success: true, message: "Nutrition log saved successfully" }
  } catch (error) {
    console.error("Error saving nutrition log:", error)
    await sql`ROLLBACK`
    return { success: false, message: "Failed to save nutrition log" }
  }
}

// Get nutrition log for a specific date with historical data preservation
export async function getNutritionLog(userId: string | number, date: string) {
  try {
    const logResult = await sql`
      SELECT 
        id,
        total_protein,
        total_carbs,
        total_fat,
        total_calories,
        total_water,
        creatine_taken
      FROM nutrition_logs 
      WHERE user_id = ${userId} AND date = ${date}::date
      LIMIT 1
    `

    if (!logResult || logResult.length === 0) {
      return { success: true, data: null }
    }

    const log = logResult[0]
    const logId = log.id

    // Get meals with logged nutrition values (fallback to current meal data if logged values don't exist)
    const mealsResult = await sql`
      SELECT 
        nlm.meal_id,
        nlm.meal_category,
        nlm.quantity,
        COALESCE(nlm.logged_meal_name, m.name) as name,
        COALESCE(nlm.logged_protein, m.protein) as protein,
        COALESCE(nlm.logged_carbs, m.carbs) as carbs,
        COALESCE(nlm.logged_fat, m.fat) as fat,
        COALESCE(nlm.logged_calories, m.calories) as calories,
        m.is_custom,
        m.description,
        m.recipe,
        nlm.logged_meal_name IS NOT NULL as is_historical
      FROM nutrition_log_meals nlm
      LEFT JOIN meals m ON nlm.meal_id = m.id
      WHERE nlm.nutrition_log_id = ${logId}
      ORDER BY 
        CASE 
          WHEN nlm.meal_category = 'breakfast' THEN 1
          WHEN nlm.meal_category = 'lunch' THEN 2
          WHEN nlm.meal_category = 'dinner' THEN 3
          WHEN nlm.meal_category = 'snack' THEN 4
          ELSE 5
        END,
        nlm.id
    `

    const otherItemsResult = await sql`
      SELECT 
        nloi.other_item_id,
        nloi.amount,
        oi.name,
        oi.category,
        oi.unit,
        oi.daily_goal as "dailyGoal"
      FROM nutrition_log_other_items nloi
      JOIN other_items oi ON nloi.other_item_id = oi.id
      WHERE nloi.nutrition_log_id = ${logId}
      ORDER BY oi.category, oi.name
    `

    // Group meals by category
    const mealsByCategory: Record<string, any[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    }

    mealsResult.forEach((meal: any) => {
      mealsByCategory[meal.meal_category].push({
        id: meal.meal_id,
        name: meal.name,
        category: meal.meal_category,
        protein: Number(meal.protein),
        carbs: Number(meal.carbs),
        fat: Number(meal.fat),
        calories: Number(meal.calories),
        quantity: meal.quantity,
        is_custom: meal.is_custom,
        description: meal.description || "",
        recipe: meal.recipe || "",
        is_historical: meal.is_historical, // Indicates if this uses logged historical data
      })
    })

    // Group other items by category
    const otherItemsByCategory: Record<string, any[]> = {}

    otherItemsResult.forEach((item: any) => {
      if (!otherItemsByCategory[item.category]) {
        otherItemsByCategory[item.category] = []
      }

      const isCreatine = item.category === "supplements" && item.name === "Creatine Monohydrate"

      otherItemsByCategory[item.category].push({
        id: item.other_item_id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        dailyGoal: item.dailyGoal,
        amount: item.amount,
        isBoolean: isCreatine,
        taken: isCreatine ? item.amount > 0 : false,
      })
    })

    // Use stored totals if available, otherwise calculate from meals
    const totals = {
      protein: Number(log.total_protein) || 0,
      carbs: Number(log.total_carbs) || 0,
      fat: Number(log.total_fat) || 0,
      calories: Number(log.total_calories) || 0,
    }

    // Add water and creatine data to other items if they exist in the log
    if (log.total_water > 0) {
      if (!otherItemsByCategory.hydration) {
        otherItemsByCategory.hydration = []
      }

      // Check if water item already exists from other_items query
      const existingWater = otherItemsByCategory.hydration.find((item) => item.name === "Water")
      if (existingWater) {
        existingWater.amount = Number(log.total_water)
      } else {
        // Add water item with stored amount
        otherItemsByCategory.hydration.push({
          id: 0, // Placeholder ID for historical data
          name: "Water",
          category: "hydration",
          unit: "ml",
          dailyGoal: 3000,
          amount: Number(log.total_water),
        })
      }
    }

    if (log.creatine_taken) {
      if (!otherItemsByCategory.supplements) {
        otherItemsByCategory.supplements = []
      }

      // Check if creatine item already exists from other_items query
      const existingCreatine = otherItemsByCategory.supplements.find((item) => item.name === "Creatine Monohydrate")
      if (existingCreatine) {
        existingCreatine.taken = log.creatine_taken
        existingCreatine.amount = log.creatine_taken ? 1 : 0
      } else {
        // Add creatine item with stored status
        otherItemsByCategory.supplements.push({
          id: 0, // Placeholder ID for historical data
          name: "Creatine Monohydrate",
          category: "supplements",
          unit: "serving",
          dailyGoal: 1,
          amount: log.creatine_taken ? 1 : 0,
          isBoolean: true,
          taken: log.creatine_taken,
        })
      }
    }

    return {
      success: true,
      data: {
        userId,
        date,
        meals: mealsByCategory,
        otherItems: otherItemsByCategory,
        totals,
      },
    }
  } catch (error) {
    console.error("Error fetching nutrition log:", error)
    return { success: false, message: "Failed to fetch nutrition data" }
  }
}

// Get a test user ID (for demo purposes) with better error handling
export async function getTestUserId() {
  try {
    // First, try to get any user from the users table
    const result = await sql`
      SELECT id FROM users LIMIT 1
    `

    if (result && result.length > 0) {
      return result[0].id
    }

    // If no users exist, create a test user
    const createResult = await sql`
      INSERT INTO users (email, name) 
      VALUES ('test@example.com', 'Test User')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `

    if (createResult && createResult.length > 0) {
      return createResult[0].id
    }

    return null
  } catch (error) {
    console.error("Error getting test user:", error)

    // Try a simpler approach - just return a hardcoded ID for now
    try {
      const fallbackResult = await sql`SELECT 1 as id`
      if (fallbackResult) {
        return 1 // Return a default user ID
      }
    } catch (fallbackError) {
      console.error("Fallback query also failed:", fallbackError)
    }

    return null
  }
}

// Add a custom meal to the database
export async function addCustomMeal(data: {
  name: string
  category: string
  protein: number
  carbs: number
  fat: number
  calories: number
  description?: string
  recipe?: string
}) {
  try {
    if (!data.name || !data.category) {
      return { success: false, message: "Name and category are required" }
    }

    const result = await sql`
      INSERT INTO meals (name, category, protein, carbs, fat, calories, is_custom, description, recipe)
      VALUES (
        ${data.name}, 
        ${data.category}, 
        ${data.protein || 0}, 
        ${data.carbs || 0}, 
        ${data.fat || 0}, 
        ${data.calories || 0},
        true,
        ${data.description || null},
        ${data.recipe || null}
      )
      RETURNING id
    `

    const mealId = result[0]?.id

    revalidatePath("/dashboard/nutrition")

    return {
      success: true,
      message: "Meal added successfully",
      mealId,
      meal: {
        id: mealId,
        ...data,
        is_custom: true,
      },
    }
  } catch (error) {
    console.error("Error adding custom meal:", error)
    return { success: false, message: "Failed to add meal" }
  }
}

// Delete a meal from the database (historical data is preserved)
export async function deleteCustomMeal(mealId: number) {
  try {
    const mealCheck = await sql`
      SELECT id, name FROM meals WHERE id = ${mealId}
    `

    if (mealCheck.length === 0) {
      return { success: false, message: "Meal not found" }
    }

    // Note: We only delete the meal from the meals table
    // Historical nutrition logs will retain their logged values
    await sql`
      DELETE FROM meals WHERE id = ${mealId}
    `

    revalidatePath("/dashboard/nutrition")

    return {
      success: true,
      message: "Meal deleted successfully. Historical nutrition data has been preserved.",
      mealId,
    }
  } catch (error) {
    console.error("Error deleting meal:", error)
    return { success: false, message: "Failed to delete meal" }
  }
}

// Remove all non-custom meals from the database
export async function removeAllNonCustomMeals() {
  try {
    await sql`BEGIN`

    try {
      await sql`
        DELETE FROM nutrition_log_meals 
        WHERE meal_id IN (SELECT id FROM meals WHERE is_custom = false OR is_custom IS NULL)
      `

      const result = await sql`
        DELETE FROM meals 
        WHERE is_custom = false OR is_custom IS NULL
        RETURNING id
      `

      await sql`COMMIT`

      revalidatePath("/dashboard/nutrition")

      return {
        success: true,
        message: `Removed ${result.length} non-custom meals from the database`,
        count: result.length,
      }
    } catch (error) {
      await sql`ROLLBACK`
      throw error
    }
  } catch (error) {
    console.error("Error removing non-custom meals:", error)
    return { success: false, message: "Failed to remove non-custom meals" }
  }
}

// Update meal recipe
export async function updateMealRecipe(mealId: number, recipe: string) {
  try {
    await sql`
      UPDATE meals 
      SET recipe = ${recipe}
      WHERE id = ${mealId} AND is_custom = true
    `

    revalidatePath("/dashboard/nutrition")

    return {
      success: true,
      message: "Recipe updated successfully",
    }
  } catch (error) {
    console.error("Error updating meal recipe:", error)
    return { success: false, message: "Failed to update recipe" }
  }
}
