"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Trash2, ChefHat, Search, Plus, Minus, Info, Hash, Weight, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { addCustomMeal } from "@/lib/actions/nutrition-actions"
import { searchMealIngredients, type MealIngredient, addMealIngredient } from "@/lib/actions/meal-ingredients-actions"
import {
  calculateNutrition,
  calculateTotalNutrition,
  getDefaultAmount,
  getDisplayUnit,
  getAmountStep,
} from "@/lib/utils/nutrition-calculations"

interface IngredientWithAmount {
  ingredient: MealIngredient
  amount: number
  nutrition: {
    protein: number
    carbs: number
    fat: number
    calories: number
  }
}

interface SimpleMealBuilderProps {
  onMealAdded?: (meal: any) => void
  defaultCategory?: string
  buttonText?: string
}

// Helper function to ensure we're working with numbers
const safeNumber = (value: any, defaultValue = 0): number => {
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

// Helper function to create a detailed recipe description
const createRecipeDescription = (ingredients: IngredientWithAmount[], servings: number) => {
  if (ingredients.length === 0) return ""

  const ingredientsList = ingredients
    .map((item) => {
      const unit = getDisplayUnit(item.ingredient)
      return `• ${item.amount}${unit} ${item.ingredient.name}`
    })
    .join("\n")

  const nutritionBreakdown = ingredients
    .map((item) => {
      const unit = getDisplayUnit(item.ingredient)
      return `${item.ingredient.name} (${item.amount}${unit}): ${item.nutrition.protein.toFixed(1)}g protein, ${item.nutrition.carbs.toFixed(1)}g carbs, ${item.nutrition.fat.toFixed(1)}g fat, ${item.nutrition.calories} calories`
    })
    .join("\n")

  const totalNutrition = calculateTotalNutrition(
    ingredients.map((item) => ({
      ingredient: item.ingredient,
      amount: item.amount,
    })),
  )

  const perServingNutrition = {
    protein: Math.round((totalNutrition.protein / servings) * 10) / 10,
    carbs: Math.round((totalNutrition.carbs / servings) * 10) / 10,
    fat: Math.round((totalNutrition.fat / servings) * 10) / 10,
    calories: Math.round(totalNutrition.calories / servings),
  }

  return `INGREDIENTS (${servings} ${servings === 1 ? "serving" : "servings"}):
${ingredientsList}

NUTRITION BREAKDOWN:
${nutritionBreakdown}

TOTAL RECIPE:
Protein: ${totalNutrition.protein.toFixed(1)}g
Carbs: ${totalNutrition.carbs.toFixed(1)}g
Fat: ${totalNutrition.fat.toFixed(1)}g
Calories: ${totalNutrition.calories}

PER SERVING:
Protein: ${perServingNutrition.protein.toFixed(1)}g
Carbs: ${perServingNutrition.carbs.toFixed(1)}g
Fat: ${perServingNutrition.fat.toFixed(1)}g
Calories: ${perServingNutrition.calories}`
}

export default function SimpleMealBuilder({
  onMealAdded,
  defaultCategory = "breakfast",
  buttonText = "Build Meal",
}: SimpleMealBuilderProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("search")
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showAddIngredientForm, setShowAddIngredientForm] = useState(false)

  // Meal details
  const [mealName, setMealName] = useState("")
  const [servings, setServings] = useState(1)

  // Search
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<MealIngredient[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Selected ingredients
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientWithAmount[]>([])

  // New ingredient form
  const [newIngredientForm, setNewIngredientForm] = useState({
    name: "",
    protein: 0,
    carbs: 0,
    fat: 0,
    calories: 0,
    measurement_type: "weight" as "weight" | "volume" | "quantity",
    unit: "g",
    per_amount: 100,
  })
  const [isAddingIngredient, setIsAddingIngredient] = useState(false)

  // Search for ingredients
  useEffect(() => {
    const searchForIngredients = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const results = await searchMealIngredients(searchQuery)
        setSearchResults(results)
      } catch (error) {
        console.error("Error searching ingredients:", error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    const debounceTimer = setTimeout(searchForIngredients, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, refreshTrigger])

  // Add ingredient to meal
  const addIngredientToMeal = (ingredient: MealIngredient) => {
    // Check if already added
    if (selectedIngredients.some((item) => item.ingredient.id === ingredient.id)) {
      return
    }

    // Get appropriate default amount based on measurement type
    const amount = getDefaultAmount(ingredient)

    // Calculate nutrition
    const nutrition = calculateNutrition(ingredient, amount)

    setSelectedIngredients((prev) => [
      ...prev,
      {
        ingredient,
        amount,
        nutrition,
      },
    ])

    // Switch to ingredients tab after adding
    setActiveTab("ingredients")
  }

  // Update ingredient amount
  const updateIngredientAmount = (id: number, newAmount: number) => {
    const ingredient = selectedIngredients.find((item) => item.ingredient.id === id)?.ingredient
    if (!ingredient) return

    const { minStep } = getAmountStep(ingredient)
    const safeAmount = Math.max(minStep, safeNumber(newAmount, minStep))

    setSelectedIngredients((prev) =>
      prev.map((item) => {
        if (item.ingredient.id === id) {
          const nutrition = calculateNutrition(item.ingredient, safeAmount)
          return {
            ...item,
            amount: safeAmount,
            nutrition,
          }
        }
        return item
      }),
    )
  }

  // Remove ingredient
  const removeIngredient = (id: number) => {
    setSelectedIngredients((prev) => prev.filter((item) => item.ingredient.id !== id))
  }

  // Calculate meal totals
  const mealTotals = calculateTotalNutrition(
    selectedIngredients.map((item) => ({
      ingredient: item.ingredient,
      amount: item.amount,
    })),
  )

  const safeServings = Math.max(1, safeNumber(servings, 1))

  const perServingTotals = {
    protein: Math.round((safeNumber(mealTotals.protein) / safeServings) * 10) / 10,
    carbs: Math.round((safeNumber(mealTotals.carbs) / safeServings) * 10) / 10,
    fat: Math.round((safeNumber(mealTotals.fat) / safeServings) * 10) / 10,
    calories: Math.round(safeNumber(mealTotals.calories) / safeServings),
  }

  // Reset form
  const resetForm = () => {
    setMealName("")
    setServings(1)
    setSelectedIngredients([])
    setSearchQuery("")
    setSearchResults([])
    setActiveTab("search")
    setShowAddIngredientForm(false)
    resetNewIngredientForm()
  }

  // Reset new ingredient form
  const resetNewIngredientForm = () => {
    setNewIngredientForm({
      name: "",
      protein: 0,
      carbs: 0,
      fat: 0,
      calories: 0,
      measurement_type: "weight",
      unit: "g",
      per_amount: 100,
    })
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!mealName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a meal name",
        variant: "destructive",
      })
      return
    }

    if (selectedIngredients.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one ingredient",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Create a simple description with ingredients for the main description field
      const ingredientsList = selectedIngredients
        .map((item) => {
          const unit = getDisplayUnit(item.ingredient)
          return `${item.amount}${unit} ${item.ingredient.name}`
        })
        .join(", ")

      // Create detailed recipe description
      const detailedRecipe = createRecipeDescription(selectedIngredients, safeServings)

      // Create meal data
      const mealData = {
        name: mealName.trim(),
        category: defaultCategory,
        protein: safeNumber(perServingTotals.protein),
        carbs: safeNumber(perServingTotals.carbs),
        fat: safeNumber(perServingTotals.fat),
        calories: safeNumber(perServingTotals.calories),
        description: `Ingredients: ${ingredientsList}`,
        recipe: detailedRecipe,
        is_custom: true,
      }

      const result = await addCustomMeal(mealData)

      if (result.success) {
        toast({
          title: "Success",
          description: `${mealName} created successfully with detailed recipe`,
        })

        resetForm()
        setOpen(false)

        if (onMealAdded && result.meal) {
          onMealAdded(result.meal)
        }
      } else {
        throw new Error(result.message || "Failed to create meal")
      }
    } catch (error) {
      console.error("Error creating meal:", error)
      toast({
        title: "Error",
        description: "Failed to create meal. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCategoryDisplayName = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  const getMeasurementIcon = (measurementType: string) => {
    switch (measurementType) {
      case "quantity":
        return <Hash className="h-3 w-3" />
      case "weight":
        return <Weight className="h-3 w-3" />
      default:
        return <Weight className="h-3 w-3" />
    }
  }

  // Handle new ingredient form change
  const handleNewIngredientChange = (field: string, value: string | number) => {
    let parsedValue = value

    if (field !== "name" && field !== "measurement_type" && field !== "unit" && typeof value === "string") {
      parsedValue = value === "" ? 0 : Number.parseFloat(value)
    }

    setNewIngredientForm((prev) => ({
      ...prev,
      [field]: parsedValue,
    }))

    // Auto-calculate calories if macros change
    if (field === "protein" || field === "carbs" || field === "fat") {
      const protein = field === "protein" ? parsedValue : newIngredientForm.protein
      const carbs = field === "carbs" ? parsedValue : newIngredientForm.carbs
      const fat = field === "fat" ? parsedValue : newIngredientForm.fat

      const calculatedCalories = Number(protein) * 4 + Number(carbs) * 4 + Number(fat) * 9

      setNewIngredientForm((prev) => ({
        ...prev,
        calories: Math.round(calculatedCalories),
      }))
    }

    // Update unit when measurement type changes
    if (field === "measurement_type") {
      setNewIngredientForm((prev) => ({
        ...prev,
        unit: value === "weight" ? "g" : value === "volume" ? "ml" : "serving",
      }))
    }
  }

  // Submit new ingredient
  const submitNewIngredient = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newIngredientForm.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter an ingredient name",
        variant: "destructive",
      })
      return
    }

    setIsAddingIngredient(true)

    try {
      const result = await addMealIngredient({
        name: newIngredientForm.name.trim(),
        protein: Number(newIngredientForm.protein) || 0,
        carbs: Number(newIngredientForm.carbs) || 0,
        fat: Number(newIngredientForm.fat) || 0,
        calories: Number(newIngredientForm.calories) || 0,
        measurement_type: newIngredientForm.measurement_type,
        unit: newIngredientForm.unit,
        per_amount: Number(newIngredientForm.per_amount) || 100,
        // For quantity-based ingredients, amount_per is used
        ...(newIngredientForm.measurement_type === "quantity" && { amount_per: Number(newIngredientForm.per_amount) }),
      })

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })

        // Reset form and go back to search
        resetNewIngredientForm()
        setShowAddIngredientForm(false)

        // Refresh search results and search for the new ingredient
        setRefreshTrigger((prev) => prev + 1)
        setSearchQuery(newIngredientForm.name)
      } else {
        throw new Error(result.message || "Failed to add ingredient")
      }
    } catch (error: any) {
      console.error("Error adding ingredient:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add ingredient. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAddingIngredient(false)
    }
  }

  const weightUnits = ["g", "kg", "oz", "lb"]
  const volumeUnits = ["ml", "l", "fl oz", "cup", "tbsp", "tsp"]
  const quantityUnits = ["serving", "piece", "slice", "scoop"]

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => setOpen(true)}>
          <ChefHat className="h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl h-[80vh] overflow-hidden flex flex-col rounded-md">
        <DialogHeader>
          <DialogTitle>Build {getCategoryDisplayName(defaultCategory)} from Ingredients</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search">Search Ingredients</TabsTrigger>
            <TabsTrigger value="ingredients">
              Ingredients {selectedIngredients.length > 0 && `(${selectedIngredients.length})`}
            </TabsTrigger>
            <TabsTrigger value="summary">Meal Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="flex-1 overflow-y-auto min-h-0">
            {showAddIngredientForm ? (
              <div className="space-y-4">
                <div className="flex items-center">
                  <Button variant="ghost" size="sm" className="mr-2" onClick={() => setShowAddIngredientForm(false)}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Search
                  </Button>
                  <h3 className="text-lg font-medium">Add New Ingredient</h3>
                </div>

                <form onSubmit={submitNewIngredient} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Ingredient Name</Label>
                    <Input
                      id="name"
                      value={newIngredientForm.name}
                      onChange={(e) => handleNewIngredientChange("name", e.target.value)}
                      placeholder="e.g., Chicken Breast (Raw)"
                      required
                      className="rounded-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="measurement_type">Measurement Type</Label>
                      <Select
                        value={newIngredientForm.measurement_type}
                        onValueChange={(value: "weight" | "volume" | "quantity") =>
                          handleNewIngredientChange("measurement_type", value)
                        }
                      >
                        <SelectTrigger className="rounded-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weight">Weight (solids)</SelectItem>
                          <SelectItem value="volume">Volume (liquids)</SelectItem>
                          <SelectItem value="quantity">Quantity (count)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit</Label>
                      <Select
                        value={newIngredientForm.unit}
                        onValueChange={(value) => handleNewIngredientChange("unit", value)}
                      >
                        <SelectTrigger className="rounded-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(newIngredientForm.measurement_type === "weight"
                            ? weightUnits
                            : newIngredientForm.measurement_type === "volume"
                              ? volumeUnits
                              : quantityUnits
                          ).map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="per_amount">
                      {newIngredientForm.measurement_type === "quantity"
                        ? "Nutrition values per serving"
                        : "Nutrition values per"}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="per_amount"
                        type="number"
                        min="1"
                        value={newIngredientForm.per_amount || ""}
                        onChange={(e) => handleNewIngredientChange("per_amount", e.target.value)}
                        className="flex-1 rounded-sm"
                      />
                      <span className="flex items-center px-3 text-sm text-muted-foreground">
                        {newIngredientForm.unit}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="protein">Protein (g)</Label>
                      <Input
                        id="protein"
                        type="number"
                        min="0"
                        step="0.1"
                        value={newIngredientForm.protein || ""}
                        onChange={(e) => handleNewIngredientChange("protein", e.target.value)}
                        className="rounded-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="carbs">Carbs (g)</Label>
                      <Input
                        id="carbs"
                        type="number"
                        min="0"
                        step="0.1"
                        value={newIngredientForm.carbs || ""}
                        onChange={(e) => handleNewIngredientChange("carbs", e.target.value)}
                        className="rounded-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fat">Fat (g)</Label>
                      <Input
                        id="fat"
                        type="number"
                        min="0"
                        step="0.1"
                        value={newIngredientForm.fat || ""}
                        onChange={(e) => handleNewIngredientChange("fat", e.target.value)}
                        className="rounded-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="calories">Calories</Label>
                      <Input
                        id="calories"
                        type="number"
                        min="0"
                        value={newIngredientForm.calories || ""}
                        onChange={(e) => handleNewIngredientChange("calories", e.target.value)}
                        className="rounded-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowAddIngredientForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isAddingIngredient}>
                      {isAddingIngredient ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Ingredient"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                <div className="mb-4 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search ingredients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-3 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-sm"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Can't find what you're looking for?</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddIngredientForm(true)}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Add New Ingredient
                    </Button>
                  </div>
                </div>

                {isSearching ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchResults.map((ingredient) => {
                      const isSelected = selectedIngredients.some((item) => item.ingredient.id === ingredient.id)
                      const displayUnit = getDisplayUnit(ingredient)

                      return (
                        <Card
                          key={ingredient.id}
                          className={`transition-all rounded-sm ${isSelected ? "opacity-50 border-muted" : "hover:border-primary/50 cursor-pointer"}`}
                          onClick={() => !isSelected && addIngredientToMeal(ingredient)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-sm">{ingredient.name}</h4>
                                  <Badge variant="outline" className="text-xs flex items-center gap-1 rounded-sm">
                                    {getMeasurementIcon(ingredient.measurement_type)}
                                    {ingredient.measurement_type}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  <Badge
                                    variant="outline"
                                    className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 rounded-sm"
                                  >
                                    {ingredient.protein.toFixed(1)}g P
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-sm"
                                  >
                                    {ingredient.carbs.toFixed(1)}g C
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="text-xs text-purple-600 bg-purple-50 dark:bg-purple-950/30 rounded-sm"
                                  >
                                    {ingredient.fat.toFixed(1)}g F
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="text-xs text-green-600 bg-green-50 dark:bg-green-950/30 rounded-sm"
                                  >
                                    {ingredient.calories} cal
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  per{" "}
                                  {ingredient.measurement_type === "quantity"
                                    ? ingredient.amount_per
                                    : ingredient.per_amount}{" "}
                                  {displayUnit}
                                </p>
                              </div>

                              <Button
                                size="sm"
                                variant={isSelected ? "ghost" : "outline"}
                                disabled={isSelected}
                                className="h-8 px-2"
                              >
                                {isSelected ? (
                                  "Added"
                                ) : (
                                  <>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add
                                  </>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : searchQuery.trim().length >= 2 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No ingredients found for "{searchQuery}"</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ChefHat className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Type at least 2 characters to search for ingredients</p>
                    <p className="text-sm mt-1">Try searching for "egg", "chicken", "rice", or "apple"</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="ingredients" className="flex-1 overflow-y-auto min-h-0">
            {selectedIngredients.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-md border-gray-300 dark:border-gray-600">
                <ChefHat className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground">No ingredients added yet</p>
                <p className="text-sm text-muted-foreground mt-1">Search and add ingredients from the first tab</p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab("search")}>
                  <Search className="h-4 w-4 mr-2" />
                  Search Ingredients
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedIngredients.map((item) => {
                  const { step, minStep } = getAmountStep(item.ingredient)
                  const displayUnit = getDisplayUnit(item.ingredient)

                  return (
                    <Card key={item.ingredient.id} className="overflow-hidden rounded-sm">
                      <CardContent className="p-0">
                        <div className="flex items-center justify-between p-3 bg-muted/30">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{item.ingredient.name}</h4>
                            <Badge variant="outline" className="text-xs flex items-center gap-1 rounded-sm">
                              {getMeasurementIcon(item.ingredient.measurement_type)}
                              {item.ingredient.measurement_type}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeIngredient(item.ingredient.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="p-3 pt-2">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 rounded-md"
                                onClick={() => updateIngredientAmount(item.ingredient.id, item.amount - step)}
                                disabled={item.amount <= minStep}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>

                              <Input
                                type="number"
                                value={item.amount}
                                onChange={(e) => updateIngredientAmount(item.ingredient.id, Number(e.target.value))}
                                className="h-8 w-20 text-center rounded-sm"
                                min={minStep}
                                step={minStep}
                              />

                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 rounded-md"
                                onClick={() => updateIngredientAmount(item.ingredient.id, item.amount + step)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>

                              <span className="text-sm text-muted-foreground ml-1">{displayUnit}</span>
                            </div>

                            <div className="flex flex-wrap gap-1 ml-auto">
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-sm">
                                {item.nutrition.protein.toFixed(1)}g P
                              </Badge>
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-sm">
                                {item.nutrition.carbs.toFixed(1)}g C
                              </Badge>
                              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-sm">
                                {item.nutrition.fat.toFixed(1)}g F
                              </Badge>
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-sm">
                                {item.nutrition.calories} cal
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="summary" className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="meal-name" className="text-sm font-medium">
                    Meal Name
                  </Label>
                  <Input
                    id="meal-name"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    placeholder="e.g., Scrambled Eggs & Toast"
                    className="mt-1 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="servings" className="text-sm font-medium">
                    Number of Servings
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 p-0"
                      onClick={() => setServings(Math.max(1, servings - 1))}
                      disabled={servings <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>

                    <Input
                      id="servings"
                      type="number"
                      min="1"
                      step="1"
                      value={servings}
                      onChange={(e) => setServings(Math.max(1, Number(e.target.value)))}
                      className="text-center focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-sm"
                    />

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 p-0"
                      onClick={() => setServings(servings + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <Card className="rounded-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    Nutrition Summary
                    {selectedIngredients.length === 0 && (
                      <Badge variant="outline" className="ml-2 rounded-sm">
                        No ingredients added
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="overflow-hidden rounded-sm">
                      <CardHeader className="bg-muted/30 py-2">
                        <CardTitle className="text-sm">Total Recipe</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-sm text-center">
                            <div className="text-xs text-muted-foreground">Protein</div>
                            <div className="font-bold text-red-600 dark:text-red-400">
                              {mealTotals.protein.toFixed(1)}g
                            </div>
                          </div>
                          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-sm text-center">
                            <div className="text-xs text-muted-foreground">Carbs</div>
                            <div className="font-bold text-amber-600 dark:text-amber-400">
                              {mealTotals.carbs.toFixed(1)}g
                            </div>
                          </div>
                          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-sm text-center">
                            <div className="text-xs text-muted-foreground">Fat</div>
                            <div className="font-bold text-purple-600 dark:text-purple-400">
                              {mealTotals.fat.toFixed(1)}g
                            </div>
                          </div>
                          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-sm text-center">
                            <div className="text-xs text-muted-foreground">Calories</div>
                            <div className="font-bold text-green-600 dark:text-green-400">{mealTotals.calories}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="overflow-hidden rounded-sm">
                      <CardHeader className="bg-muted/30 py-2">
                        <CardTitle className="text-sm">
                          Per Serving ({servings} {servings === 1 ? "serving" : "servings"})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-sm text-center">
                            <div className="text-xs text-muted-foreground">Protein</div>
                            <div className="font-bold text-red-600 dark:text-red-400">
                              {perServingTotals.protein.toFixed(1)}g
                            </div>
                          </div>
                          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-sm text-center">
                            <div className="text-xs text-muted-foreground">Carbs</div>
                            <div className="font-bold text-amber-600 dark:text-amber-400">
                              {perServingTotals.carbs.toFixed(1)}g
                            </div>
                          </div>
                          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-sm text-center">
                            <div className="text-xs text-muted-foreground">Fat</div>
                            <div className="font-bold text-purple-600 dark:text-purple-400">
                              {perServingTotals.fat.toFixed(1)}g
                            </div>
                          </div>
                          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-sm text-center">
                            <div className="text-xs text-muted-foreground">Calories</div>
                            <div className="font-bold text-green-600 dark:text-green-400">
                              {perServingTotals.calories}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {selectedIngredients.length > 0 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground p-2 bg-muted/30 rounded-sm">
                      <div className="flex items-center">
                        <Info className="h-4 w-4 mr-2" />
                        <span>
                          This meal contains {selectedIngredients.length} ingredient
                          {selectedIngredients.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setActiveTab("ingredients")}
                      >
                        View Ingredients
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 flex items-center justify-between sm:justify-between">
          <div className="flex items-center">
            {selectedIngredients.length > 0 && (
              <Badge variant="outline" className="mr-2 rounded-sm">
                {selectedIngredients.length} ingredient{selectedIngredients.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !mealName.trim() || selectedIngredients.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Meal"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
