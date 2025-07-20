"use client"

import type React from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"

interface MealDetailsModalProps {
  meal: {
    id: number
    name: string
    protein: number
    carbs: number
    fat: number
    calories: number
    description?: string
    recipe?: string
  } | null
  isOpen: boolean
  onClose: () => void
  onAddMeal?: () => void
  isReadOnly?: boolean
}

// Add this helper function at the top of the component, after the props interface
const safeNumber = (value: any, defaultValue = 0): number => {
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

const MealDetailsModal: React.FC<MealDetailsModalProps> = ({
  meal,
  isOpen,
  onClose,
  onAddMeal,
  isReadOnly = false,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold">{meal?.name || "Meal Details"}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {meal && (
                <>
                  {/* Nutrition Information */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-foreground">Nutrition Information</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-red-600 border-red-200">
                        Protein: {safeNumber(meal.protein)}g
                      </Badge>
                      <Badge variant="outline" className="text-amber-600 border-amber-200">
                        Carbs: {safeNumber(meal.carbs)}g
                      </Badge>
                      <Badge variant="outline" className="text-purple-600 border-purple-200">
                        Fat: {safeNumber(meal.fat)}g
                      </Badge>
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        Calories: {safeNumber(meal.calories)}
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  {meal.description && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-foreground">Description</h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-sm border">
                        {meal.description}
                      </p>
                    </div>
                  )}

                  {/* Recipe */}
                  {meal.recipe && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-foreground">Recipe</h4>
                      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-sm border max-h-40 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-sans">{meal.recipe}</pre>
                      </div>
                    </div>
                  )}

                  {/* No additional info message */}
                  {!meal.description && !meal.recipe && (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        No additional information available for this meal.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
          {onAddMeal && !isReadOnly && (
            <AlertDialogAction onClick={onAddMeal} className="bg-primary hover:bg-primary/90">
              Add to Meal
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default MealDetailsModal
