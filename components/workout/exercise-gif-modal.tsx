"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Dumbbell } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getExerciseGif } from "@/lib/actions/exercise-gif-actions"

interface ExerciseGifModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseName: string
}

export default function ExerciseGifModal({ open, onOpenChange, exerciseName }: ExerciseGifModalProps) {
  const { toast } = useToast()
  const [gifUrl, setGifUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    if (open && exerciseName) {
      fetchExerciseGif()
    }
  }, [open, exerciseName])

  const fetchExerciseGif = async () => {
    setIsLoading(true)
    setImageLoaded(false)
    setGifUrl(null)

    try {
      const result = await getExerciseGif(exerciseName)

      if (result.success && result.gifUrl) {
        setGifUrl(result.gifUrl)
      } else {
        toast({
          title: "No GIF found",
          description: `No demonstration available for "${exerciseName}"`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching exercise GIF:", error)
      toast({
        title: "Error",
        description: "Failed to load exercise demonstration",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const handleImageError = () => {
    setImageLoaded(true)
    toast({
      title: "Image failed to load",
      description: "The exercise demonstration could not be loaded",
      variant: "destructive",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            {exerciseName}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading exercise demonstration...</p>
            </div>
          ) : gifUrl ? (
            <div className="space-y-4">
              {/* Exercise GIF - No grey background */}
              <div className="relative flex items-center justify-center">
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                <img
                  src={gifUrl || "/placeholder.svg"}
                  alt={`${exerciseName} demonstration`}
                  className={`max-w-full max-h-[400px] object-contain rounded-lg transition-opacity duration-300 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">No demonstration available for this exercise.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
