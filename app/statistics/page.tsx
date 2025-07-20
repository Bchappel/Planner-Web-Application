import { Suspense } from "react"
import { ExerciseWeightContainer } from "@/components/statistics/exercise-weight-container"
import { Skeleton } from "@/components/ui/skeleton"

export default function StatisticsPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Workout Statistics</h1>

      <div className="grid gap-6">
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <ExerciseWeightContainer />
        </Suspense>
      </div>
    </div>
  )
}
