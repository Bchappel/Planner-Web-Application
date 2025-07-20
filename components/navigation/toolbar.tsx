"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Home, Dumbbell, Utensils, User, LogOut, BarChart, Menu, X } from "lucide-react"
import { RemindersDropdown } from "@/components/navigation/reminders-dropdown"
import { getTestUserId } from "@/lib/actions/profile-actions"
import { Button } from "@/components/ui/button"

const navItems = [
  {
    name: "Home",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "Workouts",
    href: "/dashboard/workouts",
    icon: Dumbbell,
  },
  {
    name: "Nutrition",
    href: "/dashboard/nutrition",
    icon: Utensils,
  },
  {
    name: "Statistics",
    href: "/dashboard/statistics",
    icon: BarChart,
  },
  {
    name: "Profile",
    href: "/dashboard/profile",
    icon: User,
  },
]

export default function Toolbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userId, setUserId] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Fetch test user ID on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const id = await getTestUserId()
        if (id) {
          setUserId(id)
        }
      } catch (error) {
        console.error("Error fetching user ID:", error)
      }
    }

    fetchUserId()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated")
    router.push("/")
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo/Brand */}
        <div className="flex items-center">
          <span className="font-bold text-lg sm:text-xl">Braedan Chappel</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center text-sm font-medium transition-colors hover:text-primary",
                  isActive ? "text-primary font-semibold" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.name}
              </Link>
            )
          })}
          {userId && <RemindersDropdown userId={userId} />}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-2">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center space-x-2">
          {userId && <RemindersDropdown userId={userId} />}
          <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={cn(
                    "flex items-center py-3 px-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
            <Button
              variant="ghost"
              onClick={() => {
                handleLogout()
                closeMobileMenu()
              }}
              className="w-full justify-start py-3 px-2 mt-4"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
