"use server"

import { sql } from "@/lib/db"
import { format, subDays } from "date-fns"

export interface ProgressiveOverloadSuggestion {
  exerciseName: string
  currentWeight: number
  suggestedWeight: number
  weightIncrease: number
  reason: string
  consecutiveSessions: number
  customIncrement: number
  lastThreeSessions: {
    date: string
    weight: number
    sets: number
    reps: number
  }[]
}

export interface OverloadAnalysis {
  suggestions: ProgressiveOverloadSuggestion[]
  totalExercises: number
  exercisesReadyForIncrease: number
  exercisesWithNoProgression: number
}

// Get progressive overload suggestions for a user
export async function getProgressiveOverloadSuggestions(userId: number): Promise<{
  success: boolean
  data?: OverloadAnalysis
  message?: string
}> {
  try {
    // Get all exercises with weight data from the last 30 days, including weight_increment
    const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd")
    const today = format(new Date(), "yyyy-MM-dd")

    const exerciseDataResult = await sql`
      SELECT 
        we.exercise_name,
        w.date,
        we.weight::numeric as weight,
        we.sets::integer as sets,
        we.reps::integer as reps,
        e.weight_increment::numeric as weight_increment
      FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      LEFT JOIN exercises e ON e.name = we.exercise_name
      WHERE w.user_id = ${userId}
      AND w.date BETWEEN ${thirtyDaysAgo}::date AND ${today}::date
      AND we.weight IS NOT NULL 
      AND we.weight != ''
      AND we.sets IS NOT NULL
      AND we.reps IS NOT NULL
      ORDER BY we.exercise_name, w.date DESC
    `

    // Get recent decisions to exclude from suggestions
    const recentDecisionsResult = await sql`
      SELECT exercise_name, current_weight::numeric as current_weight, status
      FROM progressive_overload_suggestions
      WHERE user_id = ${userId}
      AND created_at > NOW() - INTERVAL '7 days'
    `

    // Create a map of recent decisions
    const recentDecisions = new Map<string, { weight: number; status: string }>()
    for (const decision of recentDecisionsResult) {
      const key = `${decision.exercise_name}-${decision.current_weight}`
      recentDecisions.set(key, {
        weight: Number(decision.current_weight),
        status: decision.status,
      })
    }

    // Group exercises by name
    const exerciseGroups: Record<string, any[]> = {}

    for (const row of exerciseDataResult) {
      const exerciseName = row.exercise_name
      if (!exerciseGroups[exerciseName]) {
        exerciseGroups[exerciseName] = []
      }

      exerciseGroups[exerciseName].push({
        date: format(new Date(row.date), "yyyy-MM-dd"),
        weight: Number(row.weight),
        sets: Number(row.sets),
        reps: Number(row.reps),
        weightIncrement: Number(row.weight_increment) || 5.0, // Default to 5 if not set
      })
    }

    const suggestions: ProgressiveOverloadSuggestion[] = []
    let exercisesWithNoProgression = 0

    // Analyze each exercise for progressive overload opportunities
    for (const [exerciseName, sessions] of Object.entries(exerciseGroups)) {
      if (sessions.length < 3) continue // Need at least 3 sessions

      // Get the weight increment for this exercise
      const weightIncrement = sessions[0].weightIncrement

      // Skip exercises with 0 weight increment (bodyweight exercises)
      if (weightIncrement === 0) {
        exercisesWithNoProgression++
        continue
      }

      // Get the last 3 sessions
      const lastThreeSessions = sessions.slice(0, 3)

      // Check if all 3 sessions have the same weight
      const weights = lastThreeSessions.map((s) => s.weight)
      const allSameWeight = weights.every((w) => w === weights[0])

      if (!allSameWeight) continue

      const currentWeight = weights[0]

      // Check if we have a recent decision for this exercise at this weight
      const decisionKey = `${exerciseName}-${currentWeight}`
      const recentDecision = recentDecisions.get(decisionKey)

      if (recentDecision) {
        // If they accepted, don't suggest again until they actually increase the weight
        // If they declined, wait 7 days (already handled by the query above)
        continue
      }

      // Check if this suggestion was recently dismissed (legacy dismissals table)
      const isDismissed = await isSuggestionDismissed(userId, exerciseName, currentWeight)
      if (isDismissed) continue

      // Check if user completed 3 sets of 12+ reps in all 3 sessions
      const allSessionsComplete = lastThreeSessions.every((session) => session.sets >= 3 && session.reps >= 12)

      if (allSessionsComplete) {
        const suggestedWeight = currentWeight + weightIncrement

        suggestions.push({
          exerciseName,
          currentWeight,
          suggestedWeight,
          weightIncrease: weightIncrement,
          customIncrement: weightIncrement,
          reason: `Completed 3+ sets of 12+ reps at ${currentWeight} lbs for 3 consecutive sessions`,
          consecutiveSessions: 3,
          lastThreeSessions: lastThreeSessions.reverse(), // Show chronologically
        })
      }
    }

    // Sort suggestions by weight increase (highest first)
    suggestions.sort((a, b) => b.weightIncrease - a.weightIncrease)

    return {
      success: true,
      data: {
        suggestions,
        totalExercises: Object.keys(exerciseGroups).length,
        exercisesReadyForIncrease: suggestions.length,
        exercisesWithNoProgression,
      },
    }
  } catch (error) {
    console.error("Error analyzing progressive overload:", error)
    return {
      success: false,
      message: "Failed to analyze progressive overload opportunities",
    }
  }
}

// Accept a progressive overload suggestion
export async function acceptProgressiveOverloadSuggestion(
  userId: number,
  exerciseName: string,
  currentWeight: number,
  suggestedWeight: number,
): Promise<{ success: boolean; message: string }> {
  try {
    // Store the acceptance in the suggestions table
    await sql`
      INSERT INTO progressive_overload_suggestions (user_id, exercise_name, current_weight, suggested_weight, status, created_at)
      VALUES (${userId}, ${exerciseName}, ${currentWeight}, ${suggestedWeight}, 'accepted', CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, exercise_name, current_weight) 
      DO UPDATE SET 
        suggested_weight = ${suggestedWeight},
        status = 'accepted',
        updated_at = CURRENT_TIMESTAMP
    `

    return {
      success: true,
      message: `Accepted suggestion to raise ${exerciseName} to ${suggestedWeight} lbs`,
    }
  } catch (error) {
    console.error("Error accepting suggestion:", error)
    return {
      success: false,
      message: "Failed to accept suggestion",
    }
  }
}

// Dismiss a progressive overload suggestion (user override)
export async function dismissProgressiveOverloadSuggestion(
  userId: number,
  exerciseName: string,
  currentWeight: number,
): Promise<{ success: boolean; message: string }> {
  try {
    // Store the dismissal in the dismissals table
    await sql`
      INSERT INTO progressive_overload_dismissals (user_id, exercise_name, weight, dismissed_at)
      VALUES (${userId}, ${exerciseName}, ${currentWeight}, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, exercise_name, weight) 
      DO UPDATE SET dismissed_at = CURRENT_TIMESTAMP
    `

    // Also store in suggestions table as declined
    await sql`
      INSERT INTO progressive_overload_suggestions (user_id, exercise_name, current_weight, suggested_weight, status, created_at)
      VALUES (${userId}, ${exerciseName}, ${currentWeight}, ${currentWeight}, 'declined', CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, exercise_name, current_weight) 
      DO UPDATE SET 
        status = 'declined',
        updated_at = CURRENT_TIMESTAMP
    `

    return {
      success: true,
      message: `Declined suggestion for ${exerciseName} - will stay on current weight`,
    }
  } catch (error) {
    console.error("Error dismissing suggestion:", error)
    return {
      success: false,
      message: "Failed to dismiss suggestion",
    }
  }
}

// Get user's suggestion decisions
export async function getUserSuggestionDecisions(userId: number): Promise<{
  success: boolean
  data?: Array<{
    exerciseName: string
    currentWeight: number
    suggestedWeight: number
    status: "accepted" | "declined"
    createdAt: string
  }>
  message?: string
}> {
  try {
    const result = await sql`
      SELECT 
        exercise_name,
        current_weight::numeric as current_weight,
        suggested_weight::numeric as suggested_weight,
        status,
        created_at
      FROM progressive_overload_suggestions
      WHERE user_id = ${userId}
      AND created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
    `

    return {
      success: true,
      data: result.map((row) => ({
        exerciseName: row.exercise_name,
        currentWeight: Number(row.current_weight),
        suggestedWeight: Number(row.suggested_weight),
        status: row.status as "accepted" | "declined",
        createdAt: format(new Date(row.created_at), "yyyy-MM-dd"),
      })),
    }
  } catch (error) {
    console.error("Error fetching suggestion decisions:", error)
    return {
      success: false,
      message: "Failed to fetch suggestion decisions",
    }
  }
}

// Get all exercises with their weight increments for management
export async function getExerciseWeightIncrements(): Promise<{
  success: boolean
  data?: Array<{ id: number; name: string; category: string; weightIncrement: number }>
  message?: string
}> {
  try {
    const result = await sql`
      SELECT id, name, category, weight_increment::numeric as weight_increment
      FROM exercises
      ORDER BY category, name
    `

    return {
      success: true,
      data: result.map((row) => ({
        id: Number(row.id),
        name: row.name,
        category: row.category,
        weightIncrement: Number(row.weight_increment) || 5.0,
      })),
    }
  } catch (error) {
    console.error("Error fetching exercise weight increments:", error)
    return {
      success: false,
      message: "Failed to fetch exercise weight increments",
    }
  }
}

// Update weight increment for an exercise
export async function updateExerciseWeightIncrement(
  exerciseId: number,
  weightIncrement: number,
): Promise<{ success: boolean; message: string }> {
  try {
    await sql`
      UPDATE exercises 
      SET weight_increment = ${weightIncrement}
      WHERE id = ${exerciseId}
    `

    return {
      success: true,
      message: "Weight increment updated successfully",
    }
  } catch (error) {
    console.error("Error updating weight increment:", error)
    return {
      success: false,
      message: "Failed to update weight increment",
    }
  }
}

// Check if a suggestion has been dismissed
export async function isSuggestionDismissed(userId: number, exerciseName: string, weight: number): Promise<boolean> {
  try {
    const result = await sql`
      SELECT id FROM progressive_overload_dismissals
      WHERE user_id = ${userId} 
      AND exercise_name = ${exerciseName}
      AND weight = ${weight}
      AND dismissed_at > NOW() - INTERVAL '7 days'
    `

    return result.length > 0
  } catch (error) {
    console.error("Error checking dismissal:", error)
    return false
  }
}
