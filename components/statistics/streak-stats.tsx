"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Flame, Award, Trophy, Star } from "lucide-react"

interface StreakStatsProps {
  data: {
    nutrition: {
      current: number
      best: number
    }
    workout: {
      current: number
      best: number
    }
  }
  compact?: boolean
}

export default function StreakStats({ data, compact = false }: StreakStatsProps) {
  const { nutrition, workout } = data

  // Calculate total streaks and achievements
  const totalCurrentStreak = nutrition.current + workout.current
  const totalBestStreak = nutrition.best + workout.best

  // Determine achievement level
  const getAchievementLevel = (total: number) => {
    if (total >= 30) return "Gold"
    if (total >= 15) return "Silver"
    if (total >= 5) return "Bronze"
    return "Beginner"
  }

  const achievementLevel = getAchievementLevel(totalBestStreak)

  // Stat cards for both compact and full view
  const StatCards = () => (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
        <div className="flex items-center mb-2">
          <Flame className="h-5 w-5 mr-2 text-amber-500" />
          <h3 className="font-medium text-amber-800 dark:text-amber-300">Nutrition Streak</h3>
        </div>
        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{nutrition.current} days</p>
        <p className="text-sm text-amber-700 dark:text-amber-500">Best: {nutrition.best} days</p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center mb-2">
          <Flame className="h-5 w-5 mr-2 text-blue-500" />
          <h3 className="font-medium text-blue-800 dark:text-blue-300">Workout Streak</h3>
        </div>
        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{workout.current} days</p>
        <p className="text-sm text-blue-700 dark:text-blue-500">Best: {workout.best} days</p>
      </div>
    </div>
  )

  // If compact view, just show the stat cards
  if (compact) {
    return <StatCards />
  }

  // Achievement badges
  const achievementBadges = [
    {
      name: "Consistency Champion",
      description: "Complete 7 consecutive days of tracking",
      icon: <Trophy className="h-6 w-6 text-amber-500" />,
      achieved: totalBestStreak >= 7,
    },
    {
      name: "Nutrition Master",
      description: "Maintain a nutrition streak of 10+ days",
      icon: <Flame className="h-6 w-6 text-amber-500" />,
      achieved: nutrition.best >= 10,
    },
    {
      name: "Workout Warrior",
      description: "Maintain a workout streak of 10+ days",
      icon: <Flame className="h-6 w-6 text-blue-500" />,
      achieved: workout.best >= 10,
    },
    {
      name: "Perfect Balance",
      description: "Maintain both nutrition and workout streaks simultaneously for 5+ days",
      icon: <Star className="h-6 w-6 text-purple-500" />,
      achieved: nutrition.current >= 5 && workout.current >= 5,
    },
  ]

  return (
    <div>
      <StatCards />

      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4">Achievement Level</h3>
        <Card
          className={`
          ${achievementLevel === "Gold" ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" : ""}
          ${achievementLevel === "Silver" ? "bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800" : ""}
          ${achievementLevel === "Bronze" ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800" : ""}
          ${achievementLevel === "Beginner" ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800" : ""}
        `}
        >
          <CardContent className="p-6 flex items-center">
            <div className="mr-4">
              <Award
                className={`h-12 w-12 
                ${achievementLevel === "Gold" ? "text-amber-500" : ""}
                ${achievementLevel === "Silver" ? "text-slate-400" : ""}
                ${achievementLevel === "Bronze" ? "text-orange-600" : ""}
                ${achievementLevel === "Beginner" ? "text-blue-500" : ""}
              `}
              />
            </div>
            <div>
              <h4 className="text-xl font-bold">{achievementLevel} Level</h4>
              <p className="text-sm text-muted-foreground">Total best streak: {totalBestStreak} days</p>
              <p className="text-sm mt-1">
                {achievementLevel === "Gold" && "Outstanding dedication! You're at the highest achievement level."}
                {achievementLevel === "Silver" && "Great consistency! You're well on your way to Gold level."}
                {achievementLevel === "Bronze" && "Good progress! Keep building those streaks to reach Silver."}
                {achievementLevel === "Beginner" &&
                  "You're just getting started. Build your streaks to unlock achievements!"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-lg font-medium mb-4">Achievements</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {achievementBadges.map((badge, index) => (
          <Card key={index} className={badge.achieved ? "border-green-200 dark:border-green-800" : "opacity-70"}>
            <CardContent className="p-4 flex items-center">
              <div className="mr-3 flex-shrink-0">
                {badge.icon}
                {badge.achieved && (
                  <div className="mt-1 flex justify-center">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-medium">{badge.name}</h4>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
