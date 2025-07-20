"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { TrendingUp, CheckCircle, AlertCircle, Settings, Check, ThumbsDown } from "lucide-react"
import {
  getProgressiveOverloadSuggestions,
  acceptProgressiveOverloadSuggestion,
  dismissProgressiveOverloadSuggestion,
  getUserSuggestionDecisions,
  type ProgressiveOverloadSuggestion,
  type OverloadAnalysis,
} from "@/lib/actions/progressive-overload-actions"
import { getTestUserId } from "@/lib/actions/profile-actions"

export function ProgressiveOverloadSuggestions() {
  const { toast } = useToast()
  const [userId, setUserId] = useState<number | null>(null)
  const [analysis, setAnalysis] = useState<OverloadAnalysis | null>(null)
  const [recentDecisions, setRecentDecisions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchData() {
      try {
        const id = await getTestUserId()
        setUserId(id)

        if (id) {
          // Fetch suggestions
          const result = await getProgressiveOverloadSuggestions(id)
          if (result.success && result.data) {
            setAnalysis(result.data)
          } else {
            toast({
              title: "Error",
              description: result.message || "Failed to load progressive overload suggestions",
              variant: "destructive",
            })
          }

          // Fetch recent decisions
          const decisionsResult = await getUserSuggestionDecisions(id)
          if (decisionsResult.success && decisionsResult.data) {
            setRecentDecisions(decisionsResult.data)
          }
        }
      } catch (error) {
        console.error("Error fetching progressive overload data:", error)
        toast({
          title: "Error",
          description: "Failed to load progressive overload suggestions",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast])

  const handleAcceptSuggestion = async (suggestion: ProgressiveOverloadSuggestion) => {
    if (!userId) return

    const suggestionId = `${suggestion.exerciseName}-${suggestion.currentWeight}`
    setProcessingIds((prev) => new Set(prev).add(suggestionId))

    try {
      const result = await acceptProgressiveOverloadSuggestion(
        userId,
        suggestion.exerciseName,
        suggestion.currentWeight,
        suggestion.suggestedWeight,
      )

      if (result.success) {
        // Remove the suggestion from the list
        setAnalysis((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            suggestions: prev.suggestions.filter(
              (s) => !(s.exerciseName === suggestion.exerciseName && s.currentWeight === suggestion.currentWeight),
            ),
            exercisesReadyForIncrease: prev.exercisesReadyForIncrease - 1,
          }
        })

        // Add to recent decisions
        setRecentDecisions((prev) => [
          {
            exerciseName: suggestion.exerciseName,
            currentWeight: suggestion.currentWeight,
            suggestedWeight: suggestion.suggestedWeight,
            status: "accepted",
            createdAt: new Date().toISOString().split("T")[0],
          },
          ...prev,
        ])

        toast({
          title: "Suggestion Accepted",
          description: `Raise weight to: ${suggestion.suggestedWeight} lbs for ${suggestion.exerciseName}`,
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error accepting suggestion:", error)
      toast({
        title: "Error",
        description: "Failed to accept suggestion",
        variant: "destructive",
      })
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(suggestionId)
        return newSet
      })
    }
  }

  const handleDeclineSuggestion = async (suggestion: ProgressiveOverloadSuggestion) => {
    if (!userId) return

    const suggestionId = `${suggestion.exerciseName}-${suggestion.currentWeight}`
    setProcessingIds((prev) => new Set(prev).add(suggestionId))

    try {
      const result = await dismissProgressiveOverloadSuggestion(
        userId,
        suggestion.exerciseName,
        suggestion.currentWeight,
      )

      if (result.success) {
        // Remove the suggestion from the list
        setAnalysis((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            suggestions: prev.suggestions.filter(
              (s) => !(s.exerciseName === suggestion.exerciseName && s.currentWeight === suggestion.currentWeight),
            ),
            exercisesReadyForIncrease: prev.exercisesReadyForIncrease - 1,
          }
        })

        // Add to recent decisions
        setRecentDecisions((prev) => [
          {
            exerciseName: suggestion.exerciseName,
            currentWeight: suggestion.currentWeight,
            suggestedWeight: suggestion.currentWeight,
            status: "declined",
            createdAt: new Date().toISOString().split("T")[0],
          },
          ...prev,
        ])

        toast({
          title: "Suggestion Declined",
          description: `Stay on current weight: ${suggestion.currentWeight} lbs for ${suggestion.exerciseName}`,
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error declining suggestion:", error)
      toast({
        title: "Error",
        description: "Failed to decline suggestion",
        variant: "destructive",
      })
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(suggestionId)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Progressive Overload Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load progressive overload analysis.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Progressive Overload Suggestions
          </CardTitle>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Total Exercises: {analysis.totalExercises}</span>
            <span>Ready for Increase: {analysis.exercisesReadyForIncrease}</span>
            {analysis.exercisesWithNoProgression > 0 && (
              <span>Bodyweight Exercises: {analysis.exercisesWithNoProgression}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.suggestions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Weight Increases Suggested</h3>
              <p className="text-muted-foreground">
                Keep up the great work! Continue your current routine or try increasing reps/sets before adding weight.
              </p>
              {analysis.exercisesWithNoProgression > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Note: {analysis.exercisesWithNoProgression} bodyweight exercises are excluded from weight progression.
                </p>
              )}
            </div>
          ) : (
            analysis.suggestions.map((suggestion) => {
              const suggestionId = `${suggestion.exerciseName}-${suggestion.currentWeight}`
              const isProcessing = processingIds.has(suggestionId)

              return (
                <div
                  key={suggestionId}
                  className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">{suggestion.exerciseName}</h4>
                      <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Current Weight</p>
                      <p className="text-2xl font-bold">{suggestion.currentWeight} lbs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Suggested Weight</p>
                      <p className="text-2xl font-bold text-green-600">{suggestion.suggestedWeight} lbs</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    >
                      +{suggestion.weightIncrease} lbs increase
                    </Badge>
                    <div className="flex gap-2">
                      <Badge variant="outline">{suggestion.consecutiveSessions} sessions completed</Badge>
                      <Badge variant="outline" className="text-xs">
                        <Settings className="h-3 w-3 mr-1" />
                        Custom: +{suggestion.customIncrement}lbs
                      </Badge>
                    </div>
                  </div>

                  {/* Accept/Decline Buttons */}
                  <div className="flex gap-3 mb-4">
                    <Button
                      onClick={() => handleAcceptSuggestion(suggestion)}
                      disabled={isProcessing}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isProcessing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Accept - Raise to {suggestion.suggestedWeight} lbs
                    </Button>
                    <Button
                      onClick={() => handleDeclineSuggestion(suggestion)}
                      disabled={isProcessing}
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      {isProcessing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      ) : (
                        <ThumbsDown className="h-4 w-4 mr-2" />
                      )}
                      Decline - Stay at {suggestion.currentWeight} lbs
                    </Button>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Last 3 Sessions:</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {suggestion.lastThreeSessions.map((session, index) => (
                        <div key={index} className="text-center p-2 bg-white/50 dark:bg-black/20 rounded">
                          <div className="font-medium">{session.date}</div>
                          <div className="text-muted-foreground">
                            {session.weight}lbs • {session.sets}×{session.reps}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>💡 Equipment-Based Increment:</strong> This exercise uses a custom{" "}
                      {suggestion.customIncrement} lb increment based on your available equipment.
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Recent Decisions */}
      {recentDecisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              Recent Decisions
            </CardTitle>
            <p className="text-sm text-muted-foreground">Your recent weight progression decisions</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDecisions.slice(0, 5).map((decision, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">{decision.exerciseName}</p>
                    <p className="text-sm text-muted-foreground">{decision.createdAt}</p>
                  </div>
                  <div className="text-right">
                    {decision.status === "accepted" ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <Check className="h-4 w-4" />
                        <span className="font-medium">Raise weight to: {decision.suggestedWeight} lbs</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-orange-600">
                        <ThumbsDown className="h-4 w-4" />
                        <span className="font-medium">Stay on current weight: {decision.currentWeight} lbs</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
