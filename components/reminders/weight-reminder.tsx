"use client"

import type React from "react"

import { useState } from "react"
import { format, isFriday } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Scale, Check, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { saveWeightRecord } from "@/lib/actions/weight-actions"

interface WeightReminderProps {
  userId: number
  currentWeight: number
  onClose: () => void
}

export function WeightReminder({ userId, currentWeight, onClose }: WeightReminderProps) {
  const { toast } = useToast()
  const [weight, setWeight] = useState(currentWeight.toString())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const today = new Date()
  const isFridayToday = isFriday(today)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!weight || isNaN(Number.parseFloat(weight))) {
      toast({
        title: "Invalid weight",
        description: "Please enter a valid weight value.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await saveWeightRecord(userId, Number.parseFloat(weight), format(today, "yyyy-MM-dd"))

      if (result.success) {
        toast({
          title: "Weight updated",
          description: "Your weight has been recorded successfully.",
        })
        onClose()
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("Error saving weight:", error)
      toast({
        title: "Error",
        description: "Failed to save your weight. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Scale className="mr-2 h-5 w-5 text-blue-500" />
          Weight Tracker
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isFridayToday ? (
        <>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md mb-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">It's Friday! Time for your weekly weigh-in.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Current Weight (lbs)</Label>
              <div className="flex space-x-2">
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Enter your weight"
                  className="flex-1"
                />
                <Button type="submit" disabled={isSubmitting} className="shrink-0">
                  {isSubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </form>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-muted-foreground">Your next weigh-in reminder will be on Friday.</p>
          <p className="text-sm text-muted-foreground mt-2">Current weight: {currentWeight} lbs</p>
        </div>
      )}
    </div>
  )
}
