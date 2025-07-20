import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export default function ExercisesLoading() {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Exercise Manager</CardTitle>
          <CardDescription>
            Customize your workout routine by selecting exercises for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search exercises..." className="pl-8" disabled />
            </div>
          </div>

          <Tabs defaultValue="0">
            <TabsList className="grid grid-cols-7 mb-4">
              {dayNames.map((day, index) => (
                <TabsTrigger key={index} value={index.toString()} disabled>
                  {day}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="0">
              <div className="space-y-6">
                {[1, 2, 3].map((category) => (
                  <div key={category}>
                    <Skeleton className="h-5 w-24 mb-2" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {Array(6)
                        .fill(0)
                        .map((_, i) => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
