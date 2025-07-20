"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getAllIngredients, deleteIngredient, type Ingredient } from "@/lib/actions/ingredient-actions"
import AddIngredientModal from "@/components/nutrition/add-ingredient-modal"

export default function IngredientsPage() {
  const { toast } = useToast()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchIngredients()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredIngredients(
        ingredients.filter((ingredient) => ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    } else {
      setFilteredIngredients(ingredients)
    }
  }, [searchQuery, ingredients])

  const fetchIngredients = async () => {
    setIsLoading(true)
    try {
      const data = await getAllIngredients()
      console.log("🔍 Fetched ingredients:", data)
      setIngredients(data)
      setFilteredIngredients(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load ingredients",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      const result = await deleteIngredient(id)
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
        fetchIngredients()
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete ingredient",
        variant: "destructive",
      })
    }
  }

  const getDominantMacro = (ingredient: Ingredient) => {
    if (ingredient.protein >= ingredient.carbs && ingredient.protein >= ingredient.fat) return "protein"
    if (ingredient.fat >= ingredient.protein && ingredient.fat >= ingredient.carbs) return "fat"
    return "carbs"
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Ingredient Database</h1>
        <AddIngredientModal onIngredientAdded={fetchIngredients} />
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search ingredients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Ingredients Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredIngredients.map((ingredient) => {
            const dominantMacro = getDominantMacro(ingredient)

            return (
              <Card key={ingredient.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{ingredient.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(ingredient.id, ingredient.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
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

                    <div className="text-sm text-muted-foreground">
                      <p>
                        Per {ingredient.per_amount}
                        {ingredient.unit}
                      </p>
                      <p className="capitalize">{ingredient.measurement_type} measurement</p>
                    </div>

                    {/* Debug info */}
                    <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                      <div>
                        Types: P:{typeof ingredient.protein} C:{typeof ingredient.carbs} F:{typeof ingredient.fat} Cal:
                        {typeof ingredient.calories}
                      </div>
                      <div>
                        Values: P:{ingredient.protein} C:{ingredient.carbs} F:{ingredient.fat} Cal:{ingredient.calories}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {!isLoading && filteredIngredients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">
            {searchQuery ? `No ingredients found for "${searchQuery}"` : "No ingredients found"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery ? "Try a different search term" : "Add your first ingredient to get started"}
          </p>
        </div>
      )}
    </div>
  )
}
