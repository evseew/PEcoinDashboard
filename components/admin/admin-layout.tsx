"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "@/components/auth/auth-provider"
import { CampIcon } from "@/components/camp-icons"
import { LogOut, Users, Rocket, UserCog, LayoutDashboard, ChevronRight, Menu, X, Moon, Sun, Palette, Settings } from "lucide-react"
import { useTheme } from "next-themes"

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Teams", href: "/admin/teams", icon: Users },
    { name: "Startups", href: "/admin/startups", icon: Rocket },
    { name: "Staff", href: "/admin/staff", icon: UserCog },
    { name: "NFT Minting", href: "/admin/nft-minting", icon: Palette },
    { name: "Integration", href: "/admin/integration-test", icon: Settings },
  ]

  const isActive = (path: string) => {
    if (path === "/admin/nft-minting") {
      return pathname.startsWith("/admin/nft-minting")
    }
    return pathname === path
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Admin Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/admin/dashboard" className="flex items-center space-x-2">
              <CampIcon type="camp-logo" size="sm" />
              <h1 className="text-xl font-display font-bold bg-gradient-to-r from-[#FF6B6B] to-[#06D6A0] bg-clip-text text-transparent hidden sm:block">
                Admin Panel
              </h1>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <div className="hidden md:block text-sm text-gray-600 dark:text-gray-300">{user?.email}</div>

            <motion.button
              onClick={signOut}
              className="hidden md:flex items-center text-gray-600 dark:text-gray-300 hover:text-[#FF6B6B] dark:hover:text-[#FF6B6B] text-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut className="w-4 h-4 mr-1" />
              Sign Out
            </motion.button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:block w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 sticky top-[61px] h-[calc(100vh-61px)]">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg text-left ${
                    active
                      ? "bg-[#FF6B6B]/10 text-[#FF6B6B]"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                  {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              )
            })}
          </nav>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link href="/dashboard">
              <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm">
                View Public Dashboard
              </button>
            </Link>
          </div>
        </aside>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-20 bg-gray-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3 }}
              className="fixed top-[61px] left-0 bottom-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto"
            >
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg text-left ${
                        active
                          ? "bg-[#FF6B6B]/10 text-[#FF6B6B]"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </Link>
                  )
                })}
              </nav>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                <div className="text-sm text-gray-600 dark:text-gray-300 px-4">{user?.email}</div>
                <button
                  onClick={signOut}
                  className="flex items-center text-gray-600 dark:text-gray-300 hover:text-[#FF6B6B] dark:hover:text-[#FF6B6B] text-sm px-4"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </button>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm">
                    View Public Dashboard
                  </button>
                </Link>
              </div>
            </motion.div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
