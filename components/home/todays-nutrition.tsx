"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Utensils, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { getNutritionLog, getTestUserId } from "@/lib/actions/nutrition-actions"

// Macro goals
const MACRO_GOALS = {
  protein: 190, // 190g protein
  carbs: 280, // 280g carbs
  fat: 80, // 80g fat
  calories: 2600, // Calculated based on macros
  water: 3000, // 3000ml water
  creatine: 1, // 1 serving creatine
}

// Macro colors
const MACRO_COLORS = {
  protein: "bg-red-500", // Red for protein
  carbs: "bg-amber-500", // Amber for carbs
  fat: "bg-purple-500", // Purple for fat
  calories: "bg-green-500", // Green for calories
  water: "bg-blue-500", // Blue for water
}

export default function TodaysNutrition() {
  const [nutritionData, setNutritionData] = useState<any>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [waterAmount, setWaterAmount] = useState(0)
  const [creatineTaken, setCreatineTaken] = useState(false)

  // Fetch user ID
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const id = await getTestUserId()
        if (id) {
          setUserId(id)
        }
      } catch (error) {
        console.error("Error fetching user ID:", error)
      }
    }

    fetchUserId()
  }, [])

  // Fetch nutrition data
  useEffect(() => {
    const fetchNutritionData = async () => {
      if (!userId) return

      setIsLoading(true)
      try {
        const today = format(new Date(), "yyyy-MM-dd")
        const result = await getNutritionLog(userId, today)

        if (result.success) {
          setNutritionData(result.data)

          // Extract water amount if available
          if (result.data?.otherItems?.hydration) {
            const waterItem = result.data.otherItems.hydration.find((item: any) => item.name === "Water")
            if (waterItem) {
              setWaterAmount(waterItem.amount || 0)
            }
          }

          // Extract creatine status if available
          if (result.data?.otherItems?.supplements) {
            const creatineItem = result.data.otherItems.supplements.find(
              (item: any) => item.name === "Creatine Monohydrate",
            )
            if (creatineItem) {
              setCreatineTaken(creatineItem.taken || creatineItem.amount > 0)
            }
          }
        } else {
          // If no data for today, set default values
          setNutritionData({
            totals: {
              protein: 0,
              carbs: 0,
              fat: 0,
              calories: 0,
            },
          })
          setWaterAmount(0)
          setCreatineTaken(false)
        }
      } catch (error) {
        console.error("Error fetching nutrition data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNutritionData()
  }, [userId])

  // Calculate progress percentages
  const calculateProgress = (current: number, goal: number) => {
    return Math.min(Math.round((current / goal) * 100), 100)
  }

  // Get totals or default values
  const totals = nutritionData?.totals || { protein: 0, carbs: 0, fat: 0, calories: 0 }

  // Calculate progress
  const proteinProgress = calculateProgress(totals.protein, MACRO_GOALS.protein)
  const carbsProgress = calculateProgress(totals.carbs, MACRO_GOALS.carbs)
  const fatProgress = calculateProgress(totals.fat, MACRO_GOALS.fat)
  const caloriesProgress = calculateProgress(totals.calories, MACRO_GOALS.calories)
  const waterProgress = calculateProgress(waterAmount, MACRO_GOALS.water)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg sm:text-xl flex items-center">
          <Utensils className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Today's Nutrition
        </CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
      </CardHeader>
      <CardContent className="flex-1 px-4 sm:px-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Protein Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="font-medium">Protein</span>
                <span className="text-muted-foreground">
                  {totals.protein}g / {MACRO_GOALS.protein}g
                </span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
                <div
                  className={`h-full rounded-full ${MACRO_COLORS.protein} transition-all duration-500`}
                  style={{ width: `${proteinProgress}%` }}
                />
              </div>
            </div>

            {/* Carbs Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="font-medium">Carbs</span>
                <span className="text-muted-foreground">
                  {totals.carbs}g / {MACRO_GOALS.carbs}g
                </span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
                <div
                  className={`h-full rounded-full ${MACRO_COLORS.carbs} transition-all duration-500`}
                  style={{ width: `${carbsProgress}%` }}
                />
              </div>
            </div>

            {/* Fat Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="font-medium">Fat</span>
                <span className="text-muted-foreground">
                  {totals.fat}g / {MACRO_GOALS.fat}g
                </span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
                <div
                  className={`h-full rounded-full ${MACRO_COLORS.fat} transition-all duration-500`}
                  style={{ width: `${fatProgress}%` }}
                />
              </div>
            </div>

            {/* Water Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="font-medium">Water</span>
                <span className="text-muted-foreground">
                  {waterAmount}ml / {MACRO_GOALS.water}ml
                </span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
                <div
                  className={`h-full rounded-full ${MACRO_COLORS.water} transition-all duration-500`}
                  style={{ width: `${waterProgress}%` }}
                />
              </div>
            </div>

            {/* Creatine Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="font-medium">Creatine</span>
                <span className="text-muted-foreground">{creatineTaken ? "✓ Taken" : "Not taken"}</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
                <div
                  className={`h-full rounded-full bg-green-500 transition-all duration-500`}
                  style={{ width: creatineTaken ? "100%" : "0%" }}
                />
              </div>
            </div>

            {/* Calories Summary */}
            <div className="pt-1 flex justify-between items-center">
              <span className="font-medium text-xs sm:text-sm">Total Calories</span>
              <span className="text-base sm:text-lg font-bold transition-all duration-300">
                {totals.calories} / {MACRO_GOALS.calories}
              </span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 px-4 sm:px-6">
        <Button asChild className="w-full text-sm">
          <Link href="/dashboard/nutrition" className="flex items-center justify-center">
            <span className="flex-shrink-0">Go to Nutrition</span>
            <ChevronRight className="ml-2 h-4 w-4 flex-shrink-0" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
