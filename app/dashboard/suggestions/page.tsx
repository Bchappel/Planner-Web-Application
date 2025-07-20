"use client"

import { ProgressiveOverloadSuggestions } from "@/components/statistics/progressive-overload-suggestions"

export default function SuggestionsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Training Suggestions</h1>
        <p className="text-muted-foreground mt-2">
          Smart recommendations to help you progress your workouts based on your training data.
        </p>
      </div>

      <ProgressiveOverloadSuggestions />
    </div>
  )
}
