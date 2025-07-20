import HeroBanner from "@/components/ui/hero-banner"
import NextWorkout from "@/components/home/next-workout"
import TodaysNutrition from "@/components/home/todays-nutrition"

export default function HomePage() {
  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 sm:px-6">
      <HeroBanner name="Braedan" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <NextWorkout />
        <TodaysNutrition />
      </div>
    </div>
  )
}
