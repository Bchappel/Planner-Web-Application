"use client"

import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

import { useState, useEffect } from "react"
import { format, isToday, isBefore, startOfDay } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Loader2, Plus, Minus, Trash2, Droplets, Search, Lock, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  saveNutritionLog,
  getAllMealsByCategory,
  getOtherItems,
  deleteCustomMeal,
  removeAllNonCustomMeals,
  addCreatineSupplement,
} from "@/lib/actions/nutrition-actions"
import {
  getUserNutritionGoals,
  saveUserNutritionGoals,
  initializeUserNutritionGoals,
} from "@/lib/actions/nutrition-goals-actions"
import { cn } from "@/lib/utils"
import AddCustomMeal from "./add-custom-meal"
import DeleteMealDialog from "./delete-meal-dialog"
import MealDetailsModal from "./meal-details-modal"
import MealBuilderModal from "./meal-builder-modal"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Macro colors
const MACRO_COLORS = {
  protein: "bg-red-500", // Red for protein
  carbs: "bg-amber-500", // Amber for carbs
  fat: "bg-purple-500", // Purple for fat
  calories: "bg-green-500", // Green for calories
  water: "bg-blue-500", // Blue for water
}

// Macro background colors (lighter versions for meal cards)
const MACRO_BG_COLORS = {
  protein: "bg-red-50 dark:bg-red-950/30", // Light red for protein
  carbs: "bg-amber-50 dark:bg-amber-950/30", // Light amber for carbs
  fat: "bg-purple-50 dark:bg-purple-950/30", // Light purple for fat
}

// Macro border colors
const MACRO_BORDER_COLORS = {
  protein: "border-red-200 dark:border-red-800", // Red border for protein
  carbs: "border-amber-200 dark:border-amber-800", // Amber border for carbs
  fat: "border-purple-200 dark:border-purple-800", // Purple border for fat
}

// Types for our nutrition data
interface Meal {
  id: number
  name: string
  category: string
  protein: number
  carbs: number
  fat: number
  calories: number
  quantity?: number
  is_custom?: boolean
  description?: string
  recipe?: string
}

// Update the OtherItem interface to include a boolean type for checkbox items
interface OtherItem {
  id: number
  name: string
  category: string
  unit: string
  dailyGoal: number
  amount?: number
  isBoolean?: boolean
  taken?: boolean
}

interface NutritionTrackerProps {
  date: Date
  userId: number
  existingLog?: {
    meals: {
      breakfast: Meal[]
      lunch: Meal[]
      dinner: Meal[]
      snack: Meal[]
    }
    otherItems?: {
      hydration?: OtherItem[]
      supplements?: OtherItem[]
      [key: string]: OtherItem[] | undefined
    }
    totals: {
      protein: number
      carbs: number
      fat: number
      calories: number
    }
  } | null
  onNutritionSaved?: () => void
}

// Helper function to safely format numbers
const safeNumber = (value: any, defaultValue = 0): number => {
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

export default function NutritionTracker({ date, userId, existingLog, onNutritionSaved }: NutritionTrackerProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("breakfast")
  const [isLoadingMeals, setIsLoadingMeals] = useState(true)
  const [hasRemovedNonCustom, setHasRemovedNonCustom] = useState(false)
  const [isAddingCreatine, setIsAddingCreatine] = useState(false)
  const [isLoadingGoals, setIsLoadingGoals] = useState(true)

  // Check if the selected date is in the past (read-only mode)
  const isPastDate = isBefore(startOfDay(date), startOfDay(new Date()))
  const isCurrentDay = isToday(date)

  // State for search functionality
  const [searchQuery, setSearchQuery] = useState("")

  // State for available meals by category
  const [availableMeals, setAvailableMeals] = useState<Record<string, Meal[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  })

  // State for selected meals
  const [selectedMeals, setSelectedMeals] = useState<Record<string, Meal[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  })

  // State for other items (water, etc.)
  const [otherItems, setOtherItems] = useState<OtherItem[]>([])
  const [trackedOtherItems, setTrackedOtherItems] = useState<OtherItem[]>([])

  // Add a new state variable for creatine tracking after the other state variables
  const [creatineTaken, setCreatineTaken] = useState(false)
  // Store the creatine item if it exists in the database
  const [creatineItem, setCreatineItem] = useState<OtherItem | null>(null)

  // State for macro goals (with defaults)
  const [macroGoals, setMacroGoals] = useState({
    protein: 190,
    carbs: 280,
    fat: 80,
    calories: 2600,
    water: 3000,
  })

  // State for settings modal
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [tempGoals, setTempGoals] = useState(macroGoals)
  const [isSavingGoals, setIsSavingGoals] = useState(false)

  // State for meal details modal
  const [selectedMealForDetails, setSelectedMealForDetails] = useState<Meal | null>(null)
  const [mealDetailsModalOpen, setMealDetailsModalOpen] = useState(false)

  // State for totals with safe number handling
  const [totals, setTotals] = useState({
    protein: 0,
    carbs: 0,
    fat: 0,
    calories: 0,
  })

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [mealToDelete, setMealToDelete] = useState<Meal | null>(null)

  // Remove all non-custom meals on first load
  useEffect(() => {
    const cleanupMeals = async () => {
      if (!hasRemovedNonCustom) {
        try {
          const result = await removeAllNonCustomMeals()
          if (result.success) {
            setHasRemovedNonCustom(true)
          }
        } catch (error) {
          console.error("Error removing non-custom meals:", error)
        }
      }
    }

    cleanupMeals()
  }, [hasRemovedNonCustom])

  // Add creatine to the database if it doesn't exist
  useEffect(() => {
    const ensureCreatineExists = async () => {
      if (!isAddingCreatine) {
        setIsAddingCreatine(true)
        try {
          const result = await addCreatineSupplement()
          if (result.success) {
            if (!result.exists) {
              toast({
                title: "Creatine Added",
                description: "Creatine supplement has been added to the database.",
              })
            }

            // Create a creatine item object
            const newCreatineItem: OtherItem = {
              id: result.id,
              name: "Creatine Monohydrate",
              category: "supplements",
              unit: "serving",
              dailyGoal: 1,
              isBoolean: true,
            }

            setCreatineItem(newCreatineItem)

            // Refresh other items to include the new creatine item
            const items = await getOtherItems()
            setOtherItems(items)
          }
        } catch (error) {
          console.error("Error adding creatine supplement:", error)
        }
      }
    }

    ensureCreatineExists()
  }, [toast, isAddingCreatine])

  // Load available meals for all categories at once
  useEffect(() => {
    const fetchMeals = async () => {
      setIsLoadingMeals(true)
      try {
        // Get all meals in a single query and organized by category
        const mealsData = await getAllMealsByCategory()

        // Sort meals by dominant macro type first, then by amount of that macro
        const sortedMeals: Record<string, Meal[]> = {}
        Object.keys(mealsData).forEach((category) => {
          // Group meals by dominant macro
          const carbDominant = mealsData[category]
            .filter((meal) => getDominantMacro(meal) === "carbs")
            .sort((a, b) => safeNumber(b.carbs) - safeNumber(a.carbs))

          const proteinDominant = mealsData[category]
            .filter((meal) => getDominantMacro(meal) === "protein")
            .sort((a, b) => safeNumber(b.protein) - safeNumber(a.protein))

          const fatDominant = mealsData[category]
            .filter((meal) => getDominantMacro(meal) === "fat")
            .sort((a, b) => safeNumber(b.fat) - safeNumber(a.fat))

          // Combine the sorted groups
          sortedMeals[category] = [...carbDominant, ...proteinDominant, ...fatDominant]
        })

        setAvailableMeals(sortedMeals)
      } catch (error) {
        console.error("Error fetching meals:", error)
        toast({
          title: "Error",
          description: "Failed to load meal options. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingMeals(false)
      }
    }

    fetchMeals()
  }, [toast, hasRemovedNonCustom])

  // Load other trackable items (water, etc.)
  useEffect(() => {
    const fetchOtherItems = async () => {
      try {
        const items = await getOtherItems()
        setOtherItems(items)

        // Check if creatine exists in the database
        const foundCreatine = items.find(
          (item) => item.category === "supplements" && item.name === "Creatine Monohydrate",
        )

        if (foundCreatine) {
          setCreatineItem(foundCreatine)
        }
      } catch (error) {
        console.error("Error fetching other items:", error)
      }
    }

    fetchOtherItems()
  }, [])

  // Load user's nutrition goals from database
  useEffect(() => {
    const loadUserGoals = async () => {
      setIsLoadingGoals(true)
      try {
        // Initialize default goals for user if they don't exist
        await initializeUserNutritionGoals(userId)

        // Load user's goals from database
        const goals = await getUserNutritionGoals(userId)
        setMacroGoals(goals)
        setTempGoals(goals)

        // Also try to load from localStorage as fallback/migration
        const savedGoals = localStorage.getItem("nutrition-goals")
        if (savedGoals && !goals) {
          try {
            const localGoals = JSON.parse(savedGoals)
            // Save localStorage goals to database for migration
            await saveUserNutritionGoals(userId, localGoals)
            setMacroGoals(localGoals)
            setTempGoals(localGoals)
            // Clear localStorage after migration
            localStorage.removeItem("nutrition-goals")
          } catch (error) {
            console.error("Error migrating localStorage goals:", error)
          }
        }
      } catch (error) {
        console.error("Error loading user goals:", error)
      } finally {
        setIsLoadingGoals(false)
      }
    }

    if (userId) {
      loadUserGoals()
    }
  }, [userId])

  // Function to open settings modal
  const openSettingsModal = () => {
    setTempGoals(macroGoals)
    setSettingsModalOpen(true)
  }

  // Function to save macro goals to database
  const saveMacroGoals = async () => {
    setIsSavingGoals(true)
    try {
      const result = await saveUserNutritionGoals(userId, tempGoals)

      if (result.success) {
        setMacroGoals(result.goals)
        setSettingsModalOpen(false)

        toast({
          title: "Goals Updated",
          description: "Your macro and water goals have been saved to your account.",
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("Error saving goals:", error)
      toast({
        title: "Error",
        description: "Failed to save nutrition goals. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSavingGoals(false)
    }
  }

  // Function to cancel settings changes
  const cancelSettingsChanges = () => {
    setTempGoals(macroGoals)
    setSettingsModalOpen(false)
  }

  // Update other item amount
  const updateOtherItemAmount = (itemId: number, amount: number) => {
    // Prevent modifications for past dates
    if (isPastDate) return

    const safeAmount = safeNumber(amount, 0)
    const existingIndex = trackedOtherItems.findIndex((item) => item.id === itemId)

    if (existingIndex >= 0) {
      // Update existing item
      const updatedItems = [...trackedOtherItems]
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        amount: safeAmount,
      }
      setTrackedOtherItems(updatedItems)
    } else {
      // Add new tracked item
      const item = otherItems.find((item) => item.id === itemId)
      if (item) {
        setTrackedOtherItems([...trackedOtherItems, { ...item, amount: safeAmount }])
      }
    }
  }

  // Add a function to handle creatine checkbox toggle after the updateOtherItemAmount function
  const toggleCreatineTaken = (taken: boolean) => {
    // Prevent modifications for past dates
    if (isPastDate) return

    setCreatineTaken(taken)

    // Only update tracked items if creatine exists in the database
    if (creatineItem) {
      const existingIndex = trackedOtherItems.findIndex((item) => item.id === creatineItem.id)

      if (existingIndex >= 0) {
        // Update existing item
        const updatedItems = [...trackedOtherItems]
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          taken,
          amount: taken ? 1 : 0, // Set amount to 1 if taken, 0 if not
        }
        setTrackedOtherItems(updatedItems)
      } else {
        // Add new tracked item
        setTrackedOtherItems([...trackedOtherItems, { ...creatineItem, taken, amount: taken ? 1 : 0 }])
      }
    }
  }

  // Initialize with existing log data if available
  useEffect(() => {
    if (existingLog) {
      setSelectedMeals(existingLog.meals)
      setTotals({
        protein: safeNumber(existingLog.totals.protein),
        carbs: safeNumber(existingLog.totals.carbs),
        fat: safeNumber(existingLog.totals.fat),
        calories: safeNumber(existingLog.totals.calories),
      })

      // Initialize tracked other items if available
      if (existingLog.otherItems) {
        const allTrackedItems: OtherItem[] = []
        Object.values(existingLog.otherItems).forEach((categoryItems) => {
          if (categoryItems) {
            allTrackedItems.push(...categoryItems)
          }
        })
        setTrackedOtherItems(allTrackedItems)

        // Check if creatine is in the tracked items
        const foundCreatine = allTrackedItems.find(
          (item) => item.category === "supplements" && item.name === "Creatine Monohydrate",
        )

        if (foundCreatine) {
          setCreatineTaken(foundCreatine.taken || foundCreatine.amount > 0)
          setCreatineItem(foundCreatine)
        }
      }
    } else {
      // Reset to empty selections
      setSelectedMeals({
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
      })
      setTotals({
        protein: 0,
        carbs: 0,
        fat: 0,
        calories: 0,
      })
      setTrackedOtherItems([])
      setCreatineTaken(false)
    }
  }, [existingLog])

  // Function to open meal details modal
  const openMealDetails = (meal: Meal) => {
    setSelectedMealForDetails(meal)
    setMealDetailsModalOpen(true)
  }

  // Function to close meal details modal
  const closeMealDetails = () => {
    setMealDetailsModalOpen(false)
    setSelectedMealForDetails(null)
  }

  // Function to add meal from modal
  const addMealFromModal = () => {
    // Prevent modifications for past dates
    if (isPastDate) return

    if (selectedMealForDetails) {
      toggleMealSelection(selectedMealForDetails, selectedMealForDetails.category)
      closeMealDetails()
    }
  }

  // Save nutrition log
  const saveNutritionData = async () => {
    // Prevent saving for past dates
    if (isPastDate) {
      toast({
        title: "Cannot modify past dates",
        description: "Previous days' nutrition logs are read-only and cannot be modified.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare meals data for database
      const meals = []

      // Add all selected meals to the array
      for (const [category, categoryMeals] of Object.entries(selectedMeals)) {
        for (const meal of categoryMeals) {
          meals.push({
            mealId: meal.id,
            category,
            quantity: safeNumber(meal.quantity, 1),
          })
        }
      }

      // Prepare other items data for database
      const otherItemsData = []

      // Add water if it has an amount > 0
      const waterItem = otherItems.find((item) => item.category === "hydration" && item.name === "Water")
      if (waterItem) {
        const currentWaterAmount = trackedOtherItems.find((item) => item.id === waterItem.id)?.amount || 0
        if (currentWaterAmount > 0) {
          otherItemsData.push({
            itemId: waterItem.id,
            amount: safeNumber(currentWaterAmount),
          })
        }
      }

      // Add creatine if taken
      if (creatineItem && creatineTaken) {
        otherItemsData.push({
          itemId: creatineItem.id,
          amount: 1, // Set to 1 when taken
        })
      }

      // Add any other tracked items
      trackedOtherItems.forEach((item) => {
        // Skip water and creatine as they're handled above
        if (
          item.category !== "hydration" &&
          !(item.category === "supplements" && item.name === "Creatine Monohydrate")
        ) {
          if (item.amount && item.amount > 0) {
            otherItemsData.push({
              itemId: item.id,
              amount: safeNumber(item.amount),
            })
          }
        }
      })

      const nutritionData = {
        userId,
        date: format(date, "yyyy-MM-dd"),
        meals,
        otherItems: otherItemsData,
      }

      // Send data to the server action
      const result = await saveNutritionLog(nutritionData)

      if (result.success) {
        if (onNutritionSaved) {
          onNutritionSaved()
        } else {
          toast({
            title: "Nutrition log saved",
            description: `Your nutrition log for ${format(date, "EEEE, MMMM d")} has been saved.`,
          })
        }
      } else {
        throw new Error(result.message || "Failed to save nutrition log")
      }
    } catch (error) {
      console.error("Error saving nutrition log:", error)
      toast({
        title: "Error",
        description: "Failed to save nutrition log. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate progress percentages with safe number handling
  const calculateProgress = (current: number, goal: number) => {
    const safeCurrent = safeNumber(current)
    const safeGoal = safeNumber(goal, 1) // Avoid division by zero
    const percentage = Math.min(Math.round((safeCurrent / safeGoal) * 100), 100)
    return isNaN(percentage) ? 0 : percentage
  }

  const proteinProgress = calculateProgress(totals.protein, macroGoals.protein)
  const carbsProgress = calculateProgress(totals.carbs, macroGoals.carbs)
  const fatProgress = calculateProgress(totals.fat, macroGoals.fat)
  const caloriesProgress = calculateProgress(totals.calories, macroGoals.calories)

  // Find water tracking data
  const waterItem =
    trackedOtherItems.find((item) => item.category === "hydration" && item.name === "Water") ||
    otherItems.find((item) => item.category === "hydration" && item.name === "Water")

  const waterAmount = safeNumber(waterItem?.amount)
  const waterGoal = macroGoals.water // Use the custom water goal instead of waterItem?.dailyGoal
  const waterProgress = calculateProgress(waterAmount, waterGoal)

  // Get category name for display
  const getCategoryDisplayName = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  // Check if a meal is selected
  const isMealSelected = (meal: Meal, category: string) => {
    return selectedMeals[category].some((m) => m.id === meal.id)
  }

  // Get quantity of a selected meal
  const getSelectedMealQuantity = (meal: Meal, category: string) => {
    const selectedMeal = selectedMeals[category].find((m) => m.id === meal.id)
    return safeNumber(selectedMeal?.quantity)
  }

  // Determine the dominant macro for a meal
  const getDominantMacro = (meal: Meal) => {
    const protein = safeNumber(meal.protein)
    const carbs = safeNumber(meal.carbs)
    const fat = safeNumber(meal.fat)

    // Compare protein, carbs, and fat to determine which is highest
    if (protein >= carbs && protein >= fat) {
      return "protein"
    } else if (fat >= protein && fat >= carbs) {
      return "fat"
    } else {
      return "carbs"
    }
  }

  // Get background color based on dominant macro
  const getMacroBackgroundColor = (meal: Meal) => {
    const dominantMacro = getDominantMacro(meal)
    return MACRO_BG_COLORS[dominantMacro]
  }

  // Get border color based on dominant macro
  const getMacroBorderColor = (meal: Meal) => {
    const dominantMacro = getDominantMacro(meal)
    return MACRO_BORDER_COLORS[dominantMacro]
  }

  // Function to toggle meal selection
  const toggleMealSelection = (meal: Meal, category: string) => {
    // Prevent modifications for past dates
    if (isPastDate) return

    const updatedMeals = { ...selectedMeals }
    const mealIndex = updatedMeals[category].findIndex((m) => m.id === meal.id)

    if (mealIndex >= 0) {
      // Meal is already selected, remove it
      updatedMeals[category].splice(mealIndex, 1)
    } else {
      // Meal is not selected, add it
      updatedMeals[category].push({ ...meal, quantity: safeNumber(meal.quantity, 1) })
    }

    setSelectedMeals(updatedMeals)

    // Update totals with safe number handling
    const newTotals = { ...totals }
    const mealProtein = safeNumber(meal.protein)
    const mealCarbs = safeNumber(meal.carbs)
    const mealFat = safeNumber(meal.fat)
    const mealCalories = safeNumber(meal.calories)
    const quantity = safeNumber(meal.quantity, 1)

    if (mealIndex >= 0) {
      // Remove meal from totals
      newTotals.protein = safeNumber(newTotals.protein - mealProtein * quantity)
      newTotals.carbs = safeNumber(newTotals.carbs - mealCarbs * quantity)
      newTotals.fat = safeNumber(newTotals.fat - mealFat * quantity)
      newTotals.calories = safeNumber(newTotals.calories - mealCalories * quantity)
    } else {
      // Add meal to totals
      newTotals.protein = safeNumber(newTotals.protein + mealProtein * quantity)
      newTotals.carbs = safeNumber(newTotals.carbs + mealCarbs * quantity)
      newTotals.fat = safeNumber(newTotals.fat + mealFat * quantity)
      newTotals.calories = safeNumber(newTotals.calories + mealCalories * quantity)
    }

    setTotals(newTotals)
  }

  // Remove a meal from selected meals
  const removeMeal = (mealId: number, category: string) => {
    // Prevent modifications for past dates
    if (isPastDate) return

    const mealIndex = selectedMeals[category].findIndex((m) => m.id === mealId)

    if (mealIndex >= 0) {
      const meal = selectedMeals[category][mealIndex]
      const quantity = safeNumber(meal.quantity, 1)

      if (quantity > 1) {
        // Decrement quantity for any category
        const updatedMeals = [...selectedMeals[category]]
        updatedMeals[mealIndex] = {
          ...meal,
          quantity: quantity - 1,
        }

        setSelectedMeals((prev) => ({
          ...prev,
          [category]: updatedMeals,
        }))

        // Update totals (subtract one serving)
        setTotals((prev) => ({
          protein: safeNumber(prev.protein - safeNumber(meal.protein)),
          carbs: safeNumber(prev.carbs - safeNumber(meal.carbs)),
          fat: safeNumber(prev.fat - safeNumber(meal.fat)),
          calories: safeNumber(prev.calories - safeNumber(meal.calories)),
        }))
      } else {
        // Remove the meal entirely when quantity is 1
        if (category === "breakfast" || category === "lunch" || category === "dinner") {
          // For main meals, clear the entire category
          setSelectedMeals((prev) => ({
            ...prev,
            [category]: [],
          }))
        } else {
          // For snacks, just remove this specific meal
          setSelectedMeals((prev) => ({
            ...prev,
            [category]: prev[category].filter((m) => m.id !== mealId),
          }))
        }

        // Update totals (subtract all servings)
        setTotals((prev) => ({
          protein: safeNumber(prev.protein - safeNumber(meal.protein) * quantity),
          carbs: safeNumber(prev.carbs - safeNumber(meal.carbs) * quantity),
          fat: safeNumber(prev.fat - safeNumber(meal.fat) * quantity),
          calories: safeNumber(prev.calories - safeNumber(meal.calories) * quantity),
        }))
      }
    }
  }

  // Function to handle meal deletion
  const handleDeleteMeal = (meal: Meal) => {
    // Prevent modifications for past dates
    if (isPastDate) return

    setMealToDelete(meal)
    setDeleteDialogOpen(true)
  }

  // Function to confirm meal deletion
  const confirmDeleteMeal = async () => {
    // Prevent modifications for past dates
    if (isPastDate) return

    if (mealToDelete) {
      try {
        const result = await deleteCustomMeal(mealToDelete.id)
        if (result.success) {
          // Remove meal from available meals
          const updatedAvailableMeals = { ...availableMeals }
          const category = mealToDelete.category
          const mealIndex = updatedAvailableMeals[category].findIndex((m) => m.id === mealToDelete.id)
          if (mealIndex >= 0) {
            updatedAvailableMeals[category].splice(mealIndex, 1)
            setAvailableMeals(updatedAvailableMeals)
          }
          // Remove meal from selected meals
          const updatedSelectedMeals = { ...selectedMeals }
          const selectedMealIndex = updatedSelectedMeals[category].findIndex((m) => m.id === mealToDelete.id)
          if (selectedMealIndex >= 0) {
            const meal = updatedSelectedMeals[category][selectedMealIndex]
            updatedSelectedMeals[category].splice(selectedMealIndex, 1)
            setSelectedMeals(updatedSelectedMeals)

            // Update totals
            setTotals((prev) => ({
              protein: safeNumber(prev.protein - safeNumber(meal.protein) * safeNumber(meal.quantity, 1)),
              carbs: safeNumber(prev.carbs - safeNumber(meal.carbs) * safeNumber(meal.quantity, 1)),
              fat: safeNumber(prev.fat - safeNumber(meal.fat) * safeNumber(meal.quantity, 1)),
              calories: safeNumber(prev.calories - safeNumber(meal.calories) * safeNumber(meal.quantity, 1)),
            }))
          }
        }
      } catch (error) {
        console.error("Error deleting meal:", error)
      } finally {
        setDeleteDialogOpen(false)
        setMealToDelete(null)
      }
    }
  }

  // Function to increment quantity for selected meals
  const incrementMealQuantity = (meal: Meal, category: string) => {
    // Prevent modifications for past dates
    if (isPastDate) return

    const updatedMeals = { ...selectedMeals }
    const mealIndex = updatedMeals[category].findIndex((m) => m.id === meal.id)

    if (mealIndex >= 0) {
      // Meal is already selected
      const currentQuantity = safeNumber(updatedMeals[category][mealIndex].quantity, 1)
      updatedMeals[category][mealIndex] = {
        ...updatedMeals[category][mealIndex],
        quantity: currentQuantity + 1,
      }

      // Add one serving to totals
      setTotals((prev) => ({
        protein: safeNumber(prev.protein + safeNumber(meal.protein)),
        carbs: safeNumber(prev.carbs + safeNumber(meal.carbs)),
        fat: safeNumber(prev.fat + safeNumber(meal.fat)),
        calories: safeNumber(prev.calories + safeNumber(meal.calories)),
      }))
    } else {
      // Meal is not selected, add it
      if (category === "breakfast" || category === "lunch" || category === "dinner") {
        // For main meals, replace any existing meal
        updatedMeals[category] = [{ ...meal, quantity: 1 }]
      } else {
        // For snacks, add to the list
        updatedMeals[category].push({ ...meal, quantity: 1 })
      }

      // Add to totals
      setTotals((prev) => ({
        protein: safeNumber(prev.protein + safeNumber(meal.protein)),
        carbs: safeNumber(prev.carbs + safeNumber(meal.carbs)),
        fat: safeNumber(prev.fat + safeNumber(meal.fat)),
        calories: safeNumber(prev.calories + safeNumber(meal.calories)),
      }))
    }

    setSelectedMeals(updatedMeals)
  }

  // Function to filter meals based on search query
  const getFilteredMeals = (meals: Meal[]) => {
    if (!searchQuery.trim()) return meals

    const query = searchQuery.toLowerCase()
    return meals.filter(
      (meal) =>
        meal.name.toLowerCase().includes(query) ||
        meal.description?.toLowerCase().includes(query) ||
        getDominantMacro(meal).toLowerCase().includes(query),
    )
  }

  return (
    <div className="h-full flex flex-col px-2 sm:px-0">
      {/* Delete Confirmation Dialog */}
      <DeleteMealDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDeleteMeal}
        mealName={mealToDelete?.name || ""}
      />

      {/* Meal Details Modal */}
      <MealDetailsModal
        meal={selectedMealForDetails}
        isOpen={mealDetailsModalOpen}
        onClose={closeMealDetails}
        onAddMeal={addMealFromModal}
        isReadOnly={isPastDate}
      />

      {/* Header with Save Button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-semibold">{format(date, "EEEE, MMMM d")} - Nutrition Log</h2>
          {isPastDate && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="text-xs">Read Only</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openSettingsModal}
            variant="outline"
            size="sm"
            className="text-sm"
            disabled={isPastDate || isLoadingGoals}
          >
            {isLoadingGoals ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
          </Button>
          <Button onClick={saveNutritionData} disabled={isSubmitting || isPastDate} size="sm" className="text-sm">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isPastDate ? "Read Only" : "Save Nutrition Log"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Read-only notice for past dates */}
      {isPastDate && (
        <div className="mb-4 p-3 bg-muted/50 border border-muted rounded-md">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>
              This nutrition log is from a previous day and cannot be modified. Only today's log can be edited.
            </span>
          </div>
        </div>
      )}

      {/* Macro Totals Card with Progress Bars */}
      <Card className="bg-primary/5 mb-2">
        <CardHeader className="pb-1 pt-2 px-4 sm:px-6">
          <CardTitle className="text-sm sm:text-base">Daily Macros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-2 px-4 sm:px-6">
          {/* Protein Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium">Protein</span>
              <span className="text-muted-foreground">
                {safeNumber(totals.protein)}g / {macroGoals.protein}g
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
            <div className="flex justify-between text-xs">
              <span className="font-medium">Carbs</span>
              <span className="text-muted-foreground">
                {safeNumber(totals.carbs)}g / {macroGoals.carbs}g
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
            <div className="flex justify-between text-xs">
              <span className="font-medium">Fat</span>
              <span className="text-muted-foreground">
                {safeNumber(totals.fat)}g / {macroGoals.fat}g
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
            <div className="flex justify-between text-xs">
              <span className="font-medium">Water</span>
              <span className="text-muted-foreground">
                {waterAmount}ml / {macroGoals.water}ml
              </span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
              <div
                className={`h-full rounded-full ${MACRO_COLORS.water} transition-all duration-500`}
                style={{ width: `${waterProgress}%` }}
              />
            </div>
          </div>

          {/* Creatine Status */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
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
            <span className="font-medium text-xs">Total Calories</span>
            <span className="text-sm sm:text-base font-bold transition-all duration-300">
              {safeNumber(totals.calories)} / {macroGoals.calories}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Meal Selection Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
        <TabsList className="grid grid-cols-5 mb-2 h-8 sm:h-10">
          <TabsTrigger value="breakfast" className="text-xs sm:text-sm">
            Breakfast
          </TabsTrigger>
          <TabsTrigger value="lunch" className="text-xs sm:text-sm">
            Lunch
          </TabsTrigger>
          <TabsTrigger value="dinner" className="text-xs sm:text-sm">
            Dinner
          </TabsTrigger>
          <TabsTrigger value="snack" className="text-xs sm:text-sm">
            Snacks
          </TabsTrigger>
          <TabsTrigger value="other" className="text-xs sm:text-sm">
            Other
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Other Items Tab Content */}
          {activeTab === "other" && (
            <div className="p-1 flex-1 overflow-y-auto">
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm sm:text-base font-medium">Hydration Tracking</h3>

                  {waterItem && (
                    <Card className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <h4 className="font-medium text-sm">Water Intake</h4>
                        {isPastDate && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Slider
                              value={[waterAmount]}
                              min={0}
                              max={Math.max(macroGoals.water, 5000)} // Use custom goal or minimum 5000ml
                              step={100}
                              onValueChange={(values) => updateOtherItemAmount(waterItem.id, values[0])}
                              className="py-2"
                              disabled={isPastDate}
                            />
                          </div>
                          <div className="w-16 sm:w-20">
                            <Input
                              type="number"
                              value={waterAmount}
                              onChange={(e) => updateOtherItemAmount(waterItem.id, Number(e.target.value))}
                              className="h-6 sm:h-7 text-xs sm:text-sm"
                              min={0}
                              step={100}
                              disabled={isPastDate}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">ml</div>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm sm:text-base font-medium">Supplements</h3>
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-green-500"></div>
                        <h4 className="font-medium text-sm">Creatine Monohydrate</h4>
                        {isPastDate && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">Taken today?</span>
                        <div className="flex items-center h-5">
                          <input
                            id="creatine-checkbox"
                            type="checkbox"
                            checked={creatineTaken}
                            onChange={(e) => toggleCreatineTaken(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            disabled={isPastDate}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Consolidated Food List */}
          {activeTab !== "other" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Food Options Header with Search */}
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <h3 className="text-sm font-medium">Food Options</h3>
                  {!isPastDate && (
                    <div className="flex gap-2">
                      <MealBuilderModal
                        onMealAdded={(meal) => {
                          // Add the new meal to the available meals for its category
                          setAvailableMeals((prev) => {
                            const updatedCategory = [...(prev[meal.category] || []), meal]

                            // Group meals by dominant macro
                            const carbDominant = updatedCategory
                              .filter((m) => getDominantMacro(m) === "carbs")
                              .sort((a, b) => safeNumber(b.carbs) - safeNumber(a.carbs))

                            const proteinDominant = updatedCategory
                              .filter((m) => getDominantMacro(m) === "protein")
                              .sort((a, b) => safeNumber(b.protein) - safeNumber(a.protein))

                            const fatDominant = updatedCategory
                              .filter((meal) => getDominantMacro(meal) === "fat")
                              .sort((a, b) => safeNumber(b.fat) - safeNumber(a.fat))

                            return {
                              ...prev,
                              [meal.category]: [...carbDominant, ...proteinDominant, ...fatDominant],
                            }
                          })
                        }}
                        defaultCategory={activeTab}
                        buttonText="Build Meal"
                      />
                      <AddCustomMeal
                        onMealAdded={(meal) => {
                          // Add the new meal to the available meals for its category
                          setAvailableMeals((prev) => {
                            const updatedCategory = [...(prev[meal.category] || []), meal]

                            // Group meals by dominant macro
                            const carbDominant = updatedCategory
                              .filter((m) => getDominantMacro(m) === "carbs")
                              .sort((a, b) => safeNumber(b.carbs) - safeNumber(a.carbs))

                            const proteinDominant = updatedCategory
                              .filter((m) => getDominantMacro(m) === "protein")
                              .sort((a, b) => safeNumber(b.protein) - safeNumber(a.protein))

                            const fatDominant = updatedCategory
                              .filter((meal) => getDominantMacro(meal) === "fat")
                              .sort((a, b) => safeNumber(b.fat) - safeNumber(a.fat))

                            return {
                              ...prev,
                              [meal.category]: [...carbDominant, ...proteinDominant, ...fatDominant],
                            }
                          })
                        }}
                        defaultCategory={activeTab}
                        buttonText="Quick Add"
                      />
                    </div>
                  )}
                </div>

                {/* Search Bar */}
                <div className="relative px-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={`Search ${getCategoryDisplayName(activeTab).toLowerCase()}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-8 sm:h-9 text-sm focus:ring-2 focus:ring-offset-0 focus:ring-primary/20 border-2"
                    disabled={isPastDate}
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                      disabled={isPastDate}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                {["breakfast", "lunch", "dinner", "snack"].map((category) => (
                  <div key={`meals-${category}`} className={activeTab === category ? "block" : "hidden"}>
                    {isLoadingMeals ? (
                      <div className="flex justify-center items-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : availableMeals[category]?.length === 0 ? (
                      <div className="text-center py-8 border border-dashed rounded-lg border-gray-300 dark:border-gray-600">
                        <p className="text-muted-foreground text-sm">No meals available for {category}</p>
                      </div>
                    ) : (
                      (() => {
                        const filteredMeals = getFilteredMeals(availableMeals[category] || [])

                        if (filteredMeals.length === 0 && searchQuery) {
                          return (
                            <div className="text-center py-8 border border-dashed rounded-lg border-gray-300 dark:border-gray-600">
                              <p className="text-muted-foreground text-sm">No meals found matching "{searchQuery}"</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSearchQuery("")}
                                className="mt-2 text-xs"
                                disabled={isPastDate}
                              >
                                Clear search
                              </Button>
                            </div>
                          )
                        }

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {filteredMeals.map((meal) => {
                              const isSelected = isMealSelected(meal, category)
                              const quantity = getSelectedMealQuantity(meal, category)
                              const dominantMacro = getDominantMacro(meal)
                              const macroBgColor = getMacroBackgroundColor(meal)
                              const macroBorderColor = getMacroBorderColor(meal)

                              return (
                                <div
                                  key={`meal-${meal.id}`}
                                  className={cn(
                                    "flex justify-between items-center p-3 sm:p-4 border rounded transition-all cursor-pointer",
                                    isSelected
                                      ? `bg-primary/10 border-primary/30`
                                      : `hover:bg-secondary/10 opacity-70 ${macroBgColor} ${macroBorderColor}`,
                                    isPastDate && "opacity-60 cursor-default",
                                  )}
                                  onClick={() => openMealDetails(meal)}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm sm:text-base flex items-center">
                                      <span className="truncate">{meal.name}</span>
                                    </div>
                                    <div className="text-xs sm:text-sm text-muted-foreground flex flex-wrap gap-1 mt-0.5">
                                      <span
                                        className={
                                          dominantMacro === "protein"
                                            ? "font-medium text-red-600 dark:text-red-400"
                                            : ""
                                        }
                                      >
                                        P:{safeNumber(meal.protein)}g
                                      </span>
                                      <span
                                        className={
                                          dominantMacro === "carbs"
                                            ? "font-medium text-amber-600 dark:text-amber-400"
                                            : ""
                                        }
                                      >
                                        C:{safeNumber(meal.carbs)}g
                                      </span>
                                      <span
                                        className={
                                          dominantMacro === "fat"
                                            ? "font-medium text-purple-600 dark:text-purple-400"
                                            : ""
                                        }
                                      >
                                        F:{safeNumber(meal.fat)}g
                                      </span>
                                      <span>{safeNumber(meal.calories)}cal</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {/* Selection indicator - show quantity for all categories when > 1 */}
                                    {isSelected && quantity > 1 && (
                                      <Badge variant="outline" className="text-xs py-0 h-5 px-1.5">
                                        x{quantity}
                                      </Badge>
                                    )}

                                    {/* Add/Increment button - shows "Add" when not selected, "Increment" when selected */}
                                    {!isPastDate && (
                                      <>
                                        {!isSelected ? (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              toggleMealSelection(meal, activeTab)
                                            }}
                                            className="h-6 w-6 sm:h-7 sm:w-7 text-green-600 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20"
                                          >
                                            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                          </Button>
                                        ) : (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              incrementMealQuantity(meal, activeTab)
                                            }}
                                            className="h-6 w-6 sm:h-7 sm:w-7 text-green-600 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20"
                                          >
                                            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                          </Button>
                                        )}

                                        {/* Delete button for meals */}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteMeal(meal)
                                          }}
                                          className="h-6 w-6 sm:h-7 sm:w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                          <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                        </Button>

                                        {/* Minus button for selected meals - now works for all categories */}
                                        {isSelected && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              removeMeal(meal.id, activeTab)
                                            }}
                                            className="h-6 w-6 sm:h-7 sm:w-7"
                                          >
                                            <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                          </Button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Tabs>

      {/* Settings Modal */}
      <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nutrition Goals</DialogTitle>
            <DialogDescription>Customize your daily macro and water intake goals.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Protein Goal */}
            <div className="space-y-2">
              <Label htmlFor="protein-goal" className="text-sm font-medium">
                Protein Goal (grams)
              </Label>
              <Input
                id="protein-goal"
                type="number"
                value={tempGoals.protein}
                onChange={(e) => setTempGoals((prev) => ({ ...prev, protein: Number(e.target.value) || 0 }))}
                min={0}
                step={5}
                className="w-full"
              />
            </div>

            {/* Carbs Goal */}
            <div className="space-y-2">
              <Label htmlFor="carbs-goal" className="text-sm font-medium">
                Carbs Goal (grams)
              </Label>
              <Input
                id="carbs-goal"
                type="number"
                value={tempGoals.carbs}
                onChange={(e) => setTempGoals((prev) => ({ ...prev, carbs: Number(e.target.value) || 0 }))}
                min={0}
                step={5}
                className="w-full"
              />
            </div>

            {/* Fat Goal */}
            <div className="space-y-2">
              <Label htmlFor="fat-goal" className="text-sm font-medium">
                Fat Goal (grams)
              </Label>
              <Input
                id="fat-goal"
                type="number"
                value={tempGoals.fat}
                onChange={(e) => setTempGoals((prev) => ({ ...prev, fat: Number(e.target.value) || 0 }))}
                min={0}
                step={5}
                className="w-full"
              />
            </div>

            {/* Water Goal */}
            <div className="space-y-2">
              <Label htmlFor="water-goal" className="text-sm font-medium">
                Water Goal (ml)
              </Label>
              <Input
                id="water-goal"
                type="number"
                value={tempGoals.water}
                onChange={(e) => setTempGoals((prev) => ({ ...prev, water: Number(e.target.value) || 0 }))}
                min={0}
                step={100}
                className="w-full"
              />
            </div>

            {/* Calculated Calories Display */}
            <div className="p-3 bg-muted rounded-md">
              <div className="text-sm font-medium mb-1">Calculated Daily Calories</div>
              <div className="text-lg font-bold">
                {(tempGoals.protein * 4 + tempGoals.carbs * 4 + tempGoals.fat * 9).toLocaleString()} calories
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Based on 4 cal/g for protein & carbs, 9 cal/g for fat
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={cancelSettingsChanges} disabled={isSavingGoals}>
              Cancel
            </Button>
            <Button onClick={saveMacroGoals} disabled={isSavingGoals}>
              {isSavingGoals ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Goals"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
