"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Search, Plus, Check } from "lucide-react"
import { searchFoods, type ProcessedFood } from "@/lib/actions/usda-api-actions"

interface USDAFoodSearchProps {
  onFoodSelect: (food: ProcessedFood) => void
  selectedFoods: ProcessedFood[]
}

export default function USDAFoodSearch({ onFoodSelect, selectedFoods }: USDAFoodSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ProcessedFood[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setHasSearched(true)

    try {
      const results = await searchFoods(searchQuery.trim())
      setSearchResults(results)
    } catch (error) {
      console.error("Search error:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const isSelected = (food: ProcessedFood) => {
    return selectedFoods.some((f) => f.fdcId === food.fdcId)
  }

  const getDominantMacro = (food: ProcessedFood) => {
    if (food.protein >= food.carbs && food.protein >= food.fat) return "protein"
    if (food.fat >= food.protein && food.fat >= food.carbs) return "fat"
    return "carbs"
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for ingredients (e.g., chicken breast, brown rice)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {/* Search Results */}
      <div className="space-y-2">
        {isSearching && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Searching USDA database...</span>
          </div>
        )}

        {!isSearching && hasSearched && searchResults.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No foods found for "{searchQuery}"</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
          </div>
        )}

        {!isSearching && searchResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Found {searchResults.length} ingredients for "{searchQuery}"
            </p>

            <div className="grid gap-2 max-h-96 overflow-y-auto">
              {searchResults.map((food) => {
                const selected = isSelected(food)
                const dominantMacro = getDominantMacro(food)
                const hasNutrition = food.calories > 0 || food.protein > 0 || food.carbs > 0 || food.fat > 0

                return (
                  <Card
                    key={food.fdcId}
                    className={`cursor-pointer transition-all ${
                      selected ? "bg-primary/10 border-primary/30" : "hover:bg-secondary/50"
                    } ${!hasNutrition ? "opacity-50" : ""}`}
                    onClick={() => hasNutrition && !selected && onFoodSelect(food)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 mr-3">
                          <h4 className="font-medium text-sm leading-tight mb-1">{food.description}</h4>

                          {food.brandName && <p className="text-xs text-muted-foreground mb-1">{food.brandName}</p>}

                          {hasNutrition ? (
                            <div className="flex flex-wrap gap-1 text-xs">
                              <Badge
                                variant="outline"
                                className={dominantMacro === "protein" ? "text-red-600 font-medium" : "text-red-600"}
                              >
                                P: {food.protein}g
                              </Badge>
                              <Badge
                                variant="outline"
                                className={dominantMacro === "carbs" ? "text-amber-600 font-medium" : "text-amber-600"}
                              >
                                C: {food.carbs}g
                              </Badge>
                              <Badge
                                variant="outline"
                                className={dominantMacro === "fat" ? "text-purple-600 font-medium" : "text-purple-600"}
                              >
                                F: {food.fat}g
                              </Badge>
                              <Badge variant="outline" className="text-green-600">
                                {food.calories} cal
                              </Badge>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No nutrition data available</p>
                          )}
                        </div>

                        <div className="flex-shrink-0">
                          {selected ? (
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                              <Check className="h-4 w-4" />
                            </div>
                          ) : hasNutrition ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-8 h-8 p-0 text-green-600 hover:text-green-600 hover:bg-green-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                onFoodSelect(food)
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
