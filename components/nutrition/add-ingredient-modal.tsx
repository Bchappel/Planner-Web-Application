"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Loader2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { addIngredient, type Ingredient } from "@/lib/actions/ingredient-actions"

interface AddIngredientModalProps {
  onIngredientAdded?: (ingredient: Ingredient) => void
}

export default function AddIngredientModal({ onIngredientAdded }: AddIngredientModalProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    protein: 0,
    carbs: 0,
    fat: 0,
    calories: 0,
    measurement_type: "weight" as "weight" | "volume",
    unit: "g",
    per_amount: 100,
  })

  const weightUnits = ["g", "kg", "oz", "lb"]
  const volumeUnits = ["ml", "l", "fl oz", "cup", "tbsp", "tsp"]

  const handleChange = (field: string, value: string | number) => {
    let parsedValue = value

    if (field !== "name" && field !== "measurement_type" && field !== "unit" && typeof value === "string") {
      parsedValue = value === "" ? 0 : Number.parseFloat(value)
    }

    setFormData((prev) => ({
      ...prev,
      [field]: parsedValue,
    }))

    // Auto-calculate calories if macros change
    if (field === "protein" || field === "carbs" || field === "fat") {
      const protein = field === "protein" ? parsedValue : formData.protein
      const carbs = field === "carbs" ? parsedValue : formData.carbs
      const fat = field === "fat" ? parsedValue : formData.fat

      const calculatedCalories = Number(protein) * 4 + Number(carbs) * 4 + Number(fat) * 9

      setFormData((prev) => ({
        ...prev,
        calories: Math.round(calculatedCalories),
      }))
    }

    // Update unit when measurement type changes
    if (field === "measurement_type") {
      setFormData((prev) => ({
        ...prev,
        unit: value === "weight" ? "g" : "ml",
      }))
    }
  }

  const resetForm = () => {
    setFormData({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter an ingredient name",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await addIngredient({
        name: formData.name.trim(),
        protein: Number(formData.protein) || 0,
        carbs: Number(formData.carbs) || 0,
        fat: Number(formData.fat) || 0,
        calories: Number(formData.calories) || 0,
        measurement_type: formData.measurement_type,
        unit: formData.unit,
        per_amount: Number(formData.per_amount) || 100,
      })

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })

        resetForm()
        setOpen(false)

        if (onIngredientAdded && result.ingredient) {
          onIngredientAdded(result.ingredient)
        }
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
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Ingredient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Ingredient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Ingredient Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., Chicken Breast (Raw)"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="measurement_type">Measurement Type</Label>
              <Select
                value={formData.measurement_type}
                onValueChange={(value) => handleChange("measurement_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight">Weight (solids)</SelectItem>
                  <SelectItem value="volume">Volume (liquids)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select value={formData.unit} onValueChange={(value) => handleChange("unit", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(formData.measurement_type === "weight" ? weightUnits : volumeUnits).map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="per_amount">Nutrition values per</Label>
            <div className="flex gap-2">
              <Input
                id="per_amount"
                type="number"
                min="1"
                value={formData.per_amount || ""}
                onChange={(e) => handleChange("per_amount", e.target.value)}
                className="flex-1"
              />
              <span className="flex items-center px-3 text-sm text-muted-foreground">{formData.unit}</span>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Ingredient"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
