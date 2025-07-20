"use client"

import { Home, Dumbbell, LineChart, Utensils, Clipboard, TrendingUp, Database } from "lucide-react"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ModeToggle } from "@/components/mode-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { usePathname } from "next/navigation"

const items = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/dashboard/nutrition", label: "Nutrition", icon: Utensils },
  { href: "/dashboard/statistics", label: "Statistics", icon: LineChart },
  { href: "/dashboard/suggestions", label: "Suggestions", icon: TrendingUp },
  { href: "/dashboard/exercises", label: "Exercises", icon: Clipboard },
  { href: "/dashboard/admin/exercise-library", label: "Exercise Library", icon: Database },
  //{ href: "/dashboard/profile", label: "Profile", icon: User },
].map((item) => ({
  name: item.label,
  href: item.href,
  icon: item.icon,
}))

export function Navigation() {
  const pathname = usePathname()

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="inline-block h-6 w-6"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[280px] border-r pr-0">
        <ScrollArea className="h-[calc(100vh-10px)]">
          <div className="p-4">
            <Link href="/dashboard">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="inline-block h-6 w-6"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span className="font-bold text-2xl">Fitness App</span>
              </div>
            </Link>
            <Separator className="my-4" />
            <div className="mb-4">
              <p className="text-sm font-medium">Menu</p>
              <div className="grid gap-2 mt-2">
                {items.map((item) => (
                  <Link key={item.name} href={item.href}>
                    <Button variant="ghost" className="justify-start w-full gap-2" active={pathname === item.href}>
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <Separator />
          <div className="p-4">
            <p className="text-sm font-medium">Your profile</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 w-full justify-start mt-2">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>SC</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium leading-none">Sheldon Cooper</p>
                    <p className="text-xs text-muted-foreground">sheldon.cooper@gmail.com</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Separator />
          <div className="p-4">
            <ModeToggle />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
