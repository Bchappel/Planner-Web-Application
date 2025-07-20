"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Plus } from "lucide-react"
import { searchIngredients, type Ingredient } from "@/lib/actions/ingredient-actions"

interface IngredientSearchProps {
  onIngredientSelect: (ingredient: Ingredient) => void
  selectedIngredients: Ingredient[]
}

export default function IngredientSearch({ onIngredientSelect, selectedIngredients }: IngredientSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Ingredient[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const searchForIngredients = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const results = await searchIngredients(searchQuery)
        console.log("🔍 IngredientSearch - Raw search results:", results)
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
  }, [searchQuery])

  const handleIngredientSelect = (ingredient: Ingredient) => {
    console.log("🔍 IngredientSearch - Selected ingredient:", ingredient)
    console.log("🔍 IngredientSearch - Ingredient types:", {
      protein: typeof ingredient.protein,
      carbs: typeof ingredient.carbs,
      fat: typeof ingredient.fat,
      calories: typeof ingredient.calories,
    })
    onIngredientSelect(ingredient)
  }

  const getDominantMacro = (ingredient: Ingredient) => {
    if (ingredient.protein >= ingredient.carbs && ingredient.protein >= ingredient.fat) return "protein"
    if (ingredient.fat >= ingredient.protein && ingredient.fat >= ingredient.carbs) return "fat"
    return "carbs"
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search ingredients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Search Results */}
      {isSearching && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {searchResults.map((ingredient) => {
            const isSelected = selectedIngredients.some((selected) => selected.id === ingredient.id)
            const dominantMacro = getDominantMacro(ingredient)

            return (
              <Card key={ingredient.id} className={isSelected ? "opacity-50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <h4 className="font-medium text-sm leading-tight mb-2">{ingredient.name}</h4>

                      <div className="flex flex-wrap gap-1 text-xs mb-2">
                        <Badge
                          variant="outline"
                          className={dominantMacro === "protein" ? "text-red-600 font-medium" : "text-red-600"}
                        >
                          P: {ingredient.protein}g
                        </Badge>
                        <Badge
                          variant="outline"
                          className={dominantMacro === "carbs" ? "text-amber-600 font-medium" : "text-amber-600"}
                        >
                          C: {ingredient.carbs}g
                        </Badge>
                        <Badge
                          variant="outline"
                          className={dominantMacro === "fat" ? "text-purple-600 font-medium" : "text-purple-600"}
                        >
                          F: {ingredient.fat}g
                        </Badge>
                        <Badge variant="outline" className="text-green-600">
                          {ingredient.calories} cal
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Per {ingredient.per_amount}
                        {ingredient.unit} ({ingredient.measurement_type})
                      </div>

                      {/* Debug info */}
                      <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                        <div>ID: {ingredient.id}</div>
                        <div>
                          Raw values: P:{ingredient.protein} C:{ingredient.carbs} F:{ingredient.fat} Cal:
                          {ingredient.calories}
                        </div>
                        <div>
                          Types: P:{typeof ingredient.protein} C:{typeof ingredient.carbs} F:{typeof ingredient.fat}{" "}
                          Cal:
                          {typeof ingredient.calories}
                        </div>
                        <div>
                          Per amount: {ingredient.per_amount} (type: {typeof ingredient.per_amount})
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleIngredientSelect(ingredient)}
                      disabled={isSelected}
                      className="shrink-0"
                    >
                      {isSelected ? "Added" : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No ingredients found for "{searchQuery}"</p>
        </div>
      )}

      {searchQuery.trim().length < 2 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Type at least 2 characters to search for ingredients</p>
        </div>
      )}
    </div>
  )
}
