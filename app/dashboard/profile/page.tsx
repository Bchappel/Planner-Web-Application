"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { getProfileData, saveProfileData, getTestUserId } from "@/lib/actions/profile-actions"
import { getStreakData } from "@/lib/actions/streak-actions"
import { Loader2, Save, Edit, User, Ruler, Flame } from "lucide-react"
import { format, differenceInYears, parseISO } from "date-fns"

// Add these imports
import { getWeightHistory } from "@/lib/actions/weight-actions"
import { formatHeightWithFractions } from "@/lib/utils/format-height"

export default function ProfilePage() {
  const { toast } = useToast()
  const [userId, setUserId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Profile state
  const [profile, setProfile] = useState({
    dateOfBirth: "2003-05-09", // Default to May 9th, 2003
    height: "",
    weight: 0,
    gender: "Male", // Hardcoded to Male
  })

  // Streak state
  const [streaks, setStreaks] = useState({
    nutrition: {
      current: 0,
      best: 0,
      lastUpdated: null as string | null,
    },
    workout: {
      current: 0,
      best: 0,
      lastUpdated: null as string | null,
    },
  })

  // Add this state in the component
  const [weightHistory, setWeightHistory] = useState<any[]>([])

  // Fetch user ID on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const id = await getTestUserId()
        if (id) {
          setUserId(id)
        } else {
          toast({
            title: "Error",
            description: "Could not find test user. Please check your database setup.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching user ID:", error)
      }
    }

    fetchUserId()
  }, [toast])

  // Fetch profile data when user ID is available
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userId) return

      setIsLoading(true)
      try {
        const result = await getProfileData(userId)

        if (result.success && result.data) {
          // Always ensure gender is Male regardless of what's in the database
          setProfile({
            dateOfBirth: result.data.dateOfBirth || "2003-05-09",
            height: result.data.height || "",
            weight: result.data.weight || 0,
            gender: "Male",
          })
        }

        // Fetch streak data
        const streakData = await getStreakData(userId)
        setStreaks(streakData)

        // Add this to the useEffect that fetches profile data
        // Inside the fetchProfileData function, after fetching the profile data
        const weightHistoryResult = await getWeightHistory(userId, 5)
        if (weightHistoryResult.success) {
          setWeightHistory(weightHistoryResult.data || [])
        }
      } catch (error) {
        console.error("Error fetching profile data:", error)
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileData()
  }, [userId, toast])

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Save profile data
  const saveProfile = async () => {
    if (!userId) return

    setIsSubmitting(true)
    try {
      const result = await saveProfileData({
        userId,
        ...profile,
        dateOfBirth: profile.dateOfBirth || "2003-05-09", // Ensure date of birth is set
        gender: "Male", // Ensure gender is always Male when saving
        // Include empty values for fields that are no longer in the UI but still in the database schema
        activityLevel: "Moderately Active",
        fitnessGoals: [],
        targetWeight: undefined,
        bodyFat: undefined,
      })

      if (result.success) {
        toast({
          title: "Profile saved",
          description: "Your profile has been updated successfully.",
        })
        setIsEditing(false)
      } else {
        throw new Error(result.message || "Failed to save profile")
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: any) => {
    try {
      // Handle different date formats
      let dob: Date

      if (typeof dateOfBirth === "string") {
        // If it's a string, try to parse it
        dob = parseISO(dateOfBirth)
      } else if (dateOfBirth instanceof Date) {
        // If it's already a Date object
        dob = dateOfBirth
      } else {
        // If it's something else, convert to string first
        console.log("Unexpected date format:", dateOfBirth, typeof dateOfBirth)
        // Default to a known date if we can't parse
        dob = new Date(2003, 4, 9) // May 9th, 2003 (months are 0-indexed)
      }

      return differenceInYears(new Date(), dob)
    } catch (error) {
      console.error("Error calculating age:", error, "Date value:", dateOfBirth)
      return 20 // Default age if calculation fails
    }
  }

  // Format date for display
  const formatDate = (dateValue: any) => {
    try {
      // Handle different date formats
      if (typeof dateValue === "string") {
        // If it's a string in ISO format
        const date = parseISO(dateValue)
        return format(date, "MMMM d, yyyy")
      } else if (dateValue instanceof Date) {
        // If it's already a Date object
        return format(dateValue, "MMMM d, yyyy")
      } else {
        // If it's something else
        console.log("Unexpected date format:", dateValue, typeof dateValue)
        return "May 9, 2003" // Default to hardcoded date
      }
    } catch (error) {
      console.error("Error formatting date:", error, "Date value:", dateValue)
      return "May 9, 2003" // Default to hardcoded date if formatting fails
    }
  }

  const age = calculateAge(profile.dateOfBirth)

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  // Ensure dateOfBirth is a string for the date input
  const dateInputValue = typeof profile.dateOfBirth === "string" ? profile.dateOfBirth : "2003-05-09" // Default if not a string

  // Format the date of birth for display
  const formattedDateOfBirth = formatDate(profile.dateOfBirth)

  // Format the last updated dates for streaks
  const formatLastUpdated = (dateString: string | null) => {
    if (!dateString) return "Never"
    try {
      return format(new Date(dateString), "MMM d")
    } catch (error) {
      return "Unknown"
    }
  }

  const nutritionLastUpdated = formatLastUpdated(streaks.nutrition.lastUpdated)
  const workoutLastUpdated = formatLastUpdated(streaks.workout.lastUpdated)

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Profile</h1>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <Button onClick={saveProfile} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Profile
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  {isEditing ? (
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateInputValue}
                      onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    />
                  ) : (
                    <div className="mt-1">
                      <div className="text-lg">{formattedDateOfBirth}</div>
                      <div className="text-sm text-muted-foreground">{age} years old</div>
                    </div>
                  )}
                </div>

                {/* Gender field - always displayed as Male, not editable */}
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <div className="mt-1 text-lg">Male</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Body Measurements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Ruler className="mr-2 h-5 w-5" />
              Body Measurements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="height">Height</Label>
                {isEditing ? (
                  <Input
                    id="height"
                    placeholder="e.g. 6'1&quot; or 6'1.5&quot;"
                    value={profile.height}
                    onChange={(e) => handleInputChange("height", e.target.value)}
                  />
                ) : (
                  <div className="mt-1 text-lg">
                    {/* Use the new formatting function */}
                    {formatHeightWithFractions(profile.height)}
                  </div>
                )}
                {/* Add a small helper text for the height input */}
                {isEditing && (
                  <p className="text-xs text-muted-foreground mt-1">
                    You can use decimals for fractions (e.g., 6'1.5" for 6'1½")
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="weight">Current Weight (lbs)</Label>
                {isEditing ? (
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={profile.weight || ""}
                    onChange={(e) => handleInputChange("weight", Number.parseFloat(e.target.value) || 0)}
                  />
                ) : (
                  <div className="mt-1 text-lg">{profile.weight ? `${profile.weight} lbs` : "Not set"}</div>
                )}
                {/* Add this section to the JSX, inside the "Body Measurements" card, after the weight display */}
                {!isEditing && weightHistory.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Weight History</h4>
                    <div className="space-y-1">
                      {weightHistory.map((record, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{format(new Date(record.date), "MMM d, yyyy")}</span>
                          <span
                            className={
                              index > 0 && record.weight !== weightHistory[index - 1].weight
                                ? record.weight < weightHistory[index - 1].weight
                                  ? "text-green-500"
                                  : "text-red-500"
                                : ""
                            }
                          >
                            {record.weight} lbs
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streaks Section */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Flame className="mr-2 h-5 w-5 text-orange-500" />
              Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Nutrition Streak */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg p-6 border border-amber-200 dark:border-amber-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">Nutrition Streak</h3>
                  <div className="flex items-center">
                    <Flame className="h-6 w-6 text-orange-500 mr-1" />
                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {streaks.nutrition.current}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
                  {streaks.nutrition.current > 0
                    ? `You've hit all your macro targets for ${streaks.nutrition.current} days in a row!`
                    : "Start tracking your nutrition to build a streak!"}
                </p>
                <div className="flex justify-between items-center mt-4 text-xs text-amber-600 dark:text-amber-500">
                  <span>Best streak: {streaks.nutrition.best} days</span>
                  <span>Last updated: {nutritionLastUpdated}</span>
                </div>
                <div className="mt-4 h-2 bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (streaks.nutrition.current / 10) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-amber-600 dark:text-amber-500">
                  <span>0</span>
                  <span>5</span>
                  <span>10+</span>
                </div>
              </div>

              {/* Workout Streak */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">Workout Streak</h3>
                  <div className="flex items-center">
                    <Flame className="h-6 w-6 text-blue-500 mr-1" />
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {streaks.workout.current}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                  {streaks.workout.current > 0
                    ? `You've completed ${streaks.workout.current} workouts in a row!`
                    : "Complete a workout to start your streak!"}
                </p>
                <div className="flex justify-between items-center mt-4 text-xs text-blue-600 dark:text-blue-500">
                  <span>Best streak: {streaks.workout.best} days</span>
                  <span>Last updated: {workoutLastUpdated}</span>
                </div>
                <div className="mt-4 h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (streaks.workout.current / 15) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-blue-600 dark:text-blue-500">
                  <span>0</span>
                  <span>7</span>
                  <span>15+</span>
                </div>
              </div>

              {/* Streak Explanation */}
              <div className="md:col-span-2 mt-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">How Streaks Work</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <li className="flex items-start">
                    <span className="text-orange-500 mr-2">•</span>
                    <span>
                      <strong>Nutrition Streak:</strong> Complete all your daily macro targets (protein, carbs, fat, and
                      water) to maintain your streak.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>
                      <strong>Workout Streak:</strong> Complete all exercises in your daily workout to maintain your
                      streak.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2">•</span>
                    <span>Missing a day will reset your current streak, but your best streak is always saved.</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
