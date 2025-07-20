"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Plus, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { addCustomMeal } from "@/lib/actions/nutrition-actions"

interface AddCustomMealProps {
  onMealAdded?: (meal: any) => void
  defaultCategory?: string
  buttonText?: string
}

export default function AddCustomMeal({ onMealAdded, defaultCategory = "breakfast", buttonText }: AddCustomMealProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    category: defaultCategory,
    protein: 0,
    carbs: 0,
    fat: 0,
    calories: 0,
  })

  // Add this after the state declarations
  console.log("AddCustomMeal component rendered", { open, defaultCategory, buttonText })

  // Get category display name
  const getCategoryDisplayName = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  // Handle input changes
  const handleChange = (field: string, value: string | number) => {
    let parsedValue = value

    // Convert numeric fields to numbers
    if (field !== "name" && field !== "category" && typeof value === "string") {
      parsedValue = value === "" ? 0 : Number.parseFloat(value)
    }

    setFormData((prev) => ({
      ...prev,
      [field]: parsedValue,
    }))

    // Auto-calculate calories if protein, carbs, or fat changes
    if (field === "protein" || field === "carbs" || field === "fat") {
      const protein = field === "protein" ? parsedValue : formData.protein
      const carbs = field === "carbs" ? parsedValue : formData.carbs
      const fat = field === "fat" ? parsedValue : formData.fat

      // Calculate calories (4 cal/g for protein and carbs, 9 cal/g for fat)
      const calculatedCalories = Number(protein) * 4 + Number(carbs) * 4 + Number(fat) * 9

      setFormData((prev) => ({
        ...prev,
        calories: Math.round(calculatedCalories),
      }))
    }
  }

  // Update the handleOpenChange function
  const handleOpenChange = (open: boolean) => {
    console.log("Dialog open state changing:", open)
    if (open) {
      // Reset form with the default category
      setFormData({
        name: "",
        category: defaultCategory,
        protein: 0,
        carbs: 0,
        fat: 0,
        calories: 0,
      })
    }
    setOpen(open)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a meal name",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const mealData = {
        name: formData.name.trim(),
        category: defaultCategory,
        protein: Number(formData.protein) || 0,
        carbs: Number(formData.carbs) || 0,
        fat: Number(formData.fat) || 0,
        calories: Number(formData.calories) || 0,
      }

      console.log("Submitting meal data:", mealData)

      const result = await addCustomMeal(mealData)

      if (result.success) {
        toast({
          title: "Success",
          description: `${getCategoryDisplayName(defaultCategory)} added successfully`,
        })

        // Reset form
        setFormData({
          name: "",
          category: defaultCategory,
          protein: 0,
          carbs: 0,
          fat: 0,
          calories: 0,
        })

        // Close dialog
        setOpen(false)

        // Call the callback if provided
        if (onMealAdded && result.meal) {
          onMealAdded(result.meal)
        }
      } else {
        throw new Error(result.message || "Failed to add meal")
      }
    } catch (error) {
      console.error("Error adding meal:", error)
      toast({
        title: "Error",
        description: `Failed to add ${getCategoryDisplayName(defaultCategory)}. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add this function after handleSubmit
  const handleButtonClick = () => {
    console.log("Add meal button clicked!")
    setOpen(true)
  }

  // Dialog title based on category
  const dialogTitle = `Add ${getCategoryDisplayName(defaultCategory)}`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          type="button"
          onClick={handleButtonClick}
        >
          <Plus className="h-4 w-4" />
          {buttonText || "Add Meal"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder={`e.g., Protein Smoothie`}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                min="0"
                step="0.1"
                value={formData.protein || ""}
                onChange={(e) => handleChange("protein", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                min="0"
                step="0.1"
                value={formData.carbs || ""}
                onChange={(e) => handleChange("carbs", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fat">Fat (g)</Label>
              <Input
                id="fat"
                type="number"
                min="0"
                step="0.1"
                value={formData.fat || ""}
                onChange={(e) => handleChange("fat", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="calories">Calories</Label>
              <Input
                id="calories"
                type="number"
                min="0"
                value={formData.calories || ""}
                onChange={(e) => handleChange("calories", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>Add</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
