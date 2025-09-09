"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"

const navigation = [
  { name: "Home", href: "/" },
  { name: "Events", href: "/events" },
  // { name: "Rankings", href: "/rankings" },
  { name: "About", href: "/about" },
  { name: "Register", href: "/register" },
  { name: "Login", href: "/parent/login" },
  // { name: "Admin", href: "/admin" },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left - Club Name */}
        <Link href="/" className="flex items-center">
          <div className="hidden md:block">
            <span className="font-heading font-bold text-lg text-[#1C1F33]">
              Central NL Scholastic Chess Club
            </span> {/* TODO: make this a link to the home page */}
          </div>
        </Link>

        {/* Center - Logo */}
        <Link href="/" className="flex items-center">
          <div className="relative h-12 w-12">
            <Image
              src="/Logo.png"
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
            <div className="pt-2">
              <Button variant="secondary" size="sm" className="w-full">
                Join Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
