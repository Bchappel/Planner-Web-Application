// Client-side utility functions for nutrition calculations

export interface MealIngredient {
  id: number
  name: string
  protein: number
  carbs: number
  fat: number
  calories: number
  unit: string
  per_amount: number
  weight?: number
  measurement_type: "weight" | "quantity" | "volume"
  amount_per: number
  created_at?: string
}

// Helper function to ensure we're working with numbers
const safeNumber = (value: any, defaultValue = 0): number => {
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

// Calculate nutrition for a given amount of an ingredient
export function calculateNutrition(ingredient: MealIngredient, amount: number) {
  console.log("🧮 calculateNutrition called with:", {
    ingredient: {
      name: ingredient.name,
      measurement_type: ingredient.measurement_type,
      per_amount: ingredient.per_amount,
      amount_per: ingredient.amount_per,
      weight: ingredient.weight,
    },
    amount,
  })

  // Ensure we have valid numbers
  const safeProtein = safeNumber(ingredient.protein)
  const safeCarbs = safeNumber(ingredient.carbs)
  const safeFat = safeNumber(ingredient.fat)
  const safeCalories = safeNumber(ingredient.calories)
  const safeAmount = safeNumber(amount)
  const safeAmountPer = safeNumber(ingredient.amount_per, 1)

  let ratio: number

  if (ingredient.measurement_type === "quantity") {
    // For quantity-based ingredients (eggs, apples, etc.)
    // amount = number of items, amount_per = nutrition is per X items
    ratio = safeAmount / safeAmountPer
  } else {
    // For weight/volume-based ingredients
    // amount = weight/volume, per_amount = nutrition is per X grams/ml
    const safePerAmount = safeNumber(ingredient.per_amount, 100)
    ratio = safeAmount / safePerAmount
  }

  console.log("🧮 Calculation details:", {
    measurement_type: ingredient.measurement_type,
    ratio,
    safeAmount,
    safeAmountPer,
    per_amount: ingredient.per_amount,
  })

  // Calculate nutrition values
  const calculatedProtein = safeProtein * ratio
  const calculatedCarbs = safeCarbs * ratio
  const calculatedFat = safeFat * ratio
  const calculatedCalories = safeCalories * ratio

  // Round to reasonable precision
  const result = {
    protein: Math.round(calculatedProtein * 10) / 10,
    carbs: Math.round(calculatedCarbs * 10) / 10,
    fat: Math.round(calculatedFat * 10) / 10,
    calories: Math.round(calculatedCalories),
  }

  console.log("🧮 Final calculated nutrition:", result)
  return result
}

// Calculate total nutrition for multiple ingredients
export function calculateTotalNutrition(ingredients: Array<{ ingredient: MealIngredient; amount: number }>) {
  console.log("🧮 calculateTotalNutrition called with:", ingredients)

  const total = ingredients.reduce(
    (acc, { ingredient, amount }) => {
      const nutrition = calculateNutrition(ingredient, amount)
      console.log(`🧮 Adding nutrition for ${ingredient.name}:`, nutrition)

      return {
        protein: safeNumber(acc.protein) + safeNumber(nutrition.protein),
        carbs: safeNumber(acc.carbs) + safeNumber(nutrition.carbs),
        fat: safeNumber(acc.fat) + safeNumber(nutrition.fat),
        calories: safeNumber(acc.calories) + safeNumber(nutrition.calories),
      }
    },
    { protein: 0, carbs: 0, fat: 0, calories: 0 },
  )

  console.log("🧮 Total nutrition calculated:", total)
  return total
}

// Get the appropriate default amount for an ingredient
export function getDefaultAmount(ingredient: MealIngredient): number {
  if (ingredient.measurement_type === "quantity") {
    return safeNumber(ingredient.amount_per, 1)
  }
  return safeNumber(ingredient.per_amount, 100)
}

// Get the display unit for an ingredient
export function getDisplayUnit(ingredient: MealIngredient): string {
  return ingredient.unit || (ingredient.measurement_type === "quantity" ? "each" : "g")
}

// Get appropriate increment/decrement values for UI controls
export function getAmountStep(ingredient: MealIngredient): { step: number; minStep: number } {
  if (ingredient.measurement_type === "quantity") {
    return { step: 1, minStep: 1 }
  }
  return { step: 10, minStep: 1 }
}
