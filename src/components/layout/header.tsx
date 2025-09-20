"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Dropdown } from "@/components/ui/dropdown"
import { Menu, X, LogOut, LayoutDashboard, Gamepad2, Settings } from "lucide-react"
import { clientAuthService } from "@/lib/clientAuth"
import { useAdmin } from "@/hooks/useAdmin"

const navigation = [
  { name: "Home", href: "/" },
  { name: "Events", href: "/events" },
  // { name: "Rankings", href: "/rankings" },
  { name: "About", href: "/about" },
  // { name: "Admin", href: "/admin" },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [parentEmail, setParentEmail] = React.useState("")
  const [parentName, setParentName] = React.useState("")
  const { isAdmin } = useAdmin()

  // Fetch parent details from API
  const fetchParentDetails = async (email: string) => {
    try {
      const response = await fetch(`/api/parent/account?email=${encodeURIComponent(email)}`)
      if (response.ok) {
        const parentData = await response.json()
        setParentName(parentData.name || email) // Fallback to email if name is empty
      } else {
        setParentName(email) // Fallback to email if API fails
      }
    } catch (error) {
      console.error('Failed to fetch parent details:', error)
      setParentName(email) // Fallback to email on error
    }
  }

  // Check authentication status on component mount
  React.useEffect(() => {
    const checkAuth = () => {
      const authenticated = clientAuthService.isParentAuthenticated()
      setIsAuthenticated(authenticated)
      
      if (authenticated) {
        const session = clientAuthService.getCurrentParentSession()
        if (session) {
          setParentEmail(session.email)
          fetchParentDetails(session.email)
        }
      } else {
        setParentEmail("")
        setParentName("")
      }
    }

    checkAuth()
    
    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = () => {
      checkAuth()
    }
    
    // Listen for custom auth state changes (when user logs in/out in same tab)
    const handleAuthStateChange = (event: CustomEvent) => {
      const { authenticated, session } = event.detail
      setIsAuthenticated(authenticated)
      
      if (authenticated && session) {
        setParentEmail(session.email)
        fetchParentDetails(session.email)
      } else {
        setParentEmail("")
        setParentName("")
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('authStateChanged', handleAuthStateChange as EventListener)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('authStateChanged', handleAuthStateChange as EventListener)
    }
  }, [])

  const handleLogout = () => {
    clientAuthService.logoutParent()
    setIsAuthenticated(false)
    setParentEmail("")
    setParentName("")
    // Redirect to home page after logout
    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left - Club Name */}
        <Link href="/" className="flex items-center">
          <div className="hidden md:block">
            <span className="font-heading font-bold text-lg text-[#1C1F33]">
              Central NL Scholastic Chess Club
            </span>
          </div>
        </Link>

        {/* Center - Logo */}
        <Link href="/" className="flex items-center">
          <div className="relative h-38 w-38">
            <Image
              src="/Logo-NoBorder.png"
              alt="Central NL Scholastic Chess Club Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Right Navigation - Desktop only */}
        <nav className="hidden md:flex items-center space-x-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-[--color-text-primary] transition-colors hover:text-[--color-primary]"
            >
              {item.name}
            </Link>
          ))}
          
          {/* Authentication Section */}
          {isAuthenticated ? (
            <Dropdown
              trigger={
                <span className="text-sm font-medium text-[--color-text-primary] hover:text-[--color-primary] cursor-pointer">
                  {parentName || parentEmail}
                </span>
              }
              items={[
                {
                  label: "Dashboard",
                  href: "/parent/dashboard",
                  icon: <LayoutDashboard className="h-4 w-4" />
                },
                ...(isAdmin ? [
                  {
                    label: "Game Management",
                    href: "/admin/games",
                    icon: <Gamepad2 className="h-4 w-4" />
                  },
                  {
                    label: "Admin Panel",
                    href: "/admin",
                    icon: <Settings className="h-4 w-4" />
                  }
                ] : []),
                {
                  label: "Logout",
                  onClick: handleLogout,
                  icon: <LogOut className="h-4 w-4" />
                }
              ]}
            />
          ) : (
            <div className="flex items-center space-x-4">
              <Link href="/register">
                <Button variant="outline" size="sm">
                  Register
                </Button>
              </Link>
              <Link href="/parent/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="sr-only">Open main menu</span>
          {mobileMenuOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2 bg-white border-t">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block px-3 py-2 text-base font-medium text-[--color-text-primary] hover:bg-[--color-neutral-light] hover:text-[--color-primary] rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Mobile Authentication Section */}
            <div className="pt-2 border-t">
              {isAuthenticated ? (
                <div className="space-y-2">
                  <div className="px-3 py-2 text-sm text-[--color-text-primary] font-medium">
                    {parentName || parentEmail}
                  </div>
                  <Link href="/parent/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full flex items-center justify-center space-x-1">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Button>
                  </Link>
                  {isAdmin && (
                    <>
                      <Link href="/admin/games" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" size="sm" className="w-full flex items-center justify-center space-x-1">
                          <Gamepad2 className="h-4 w-4" />
                          <span>Game Management</span>
                        </Button>
                      </Link>
                      <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" size="sm" className="w-full flex items-center justify-center space-x-1">
                          <Settings className="h-4 w-4" />
                          <span>Admin Panel</span>
                        </Button>
                      </Link>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center justify-center space-x-1"
                    onClick={() => {
                      handleLogout()
                      setMobileMenuOpen(false)
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      Register
                    </Button>
                  </Link>
                  <Link href="/parent/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      Login
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
