"use client"

import { useState } from "react"
import SimpleMealBuilder from "./simple-meal-builder"

interface MealBuilderModalProps {
  onMealAdded?: (meal: any) => void
  defaultCategory?: string
  buttonText?: string
}

export default function MealBuilderModal({
  onMealAdded,
  defaultCategory = "breakfast",
  buttonText,
}: MealBuilderModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <SimpleMealBuilder
      onMealAdded={onMealAdded}
      defaultCategory={defaultCategory}
      buttonText={buttonText || "Build Meal"}
    />
  )
}
