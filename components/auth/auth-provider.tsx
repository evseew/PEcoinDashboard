"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

// Hardcoded admin credentials
const ADMIN_EMAIL = "evseew@gmail.com"
const ADMIN_PASSWORD = "superadmin"

type User = {
  id: string
  email: string
  role: string
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  isAdmin: boolean
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    error: any | null
    success: boolean
  }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Handle mounting state to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Skip localStorage check during SSR
    if (!mounted) return

    // Check if user is already logged in from localStorage
    try {
      const storedUser = localStorage.getItem("admin_user")
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        setIsAdmin(true)
      }
    } catch (error) {
      console.error("Error parsing stored user:", error)
      if (typeof window !== "undefined") {
        localStorage.removeItem("admin_user")
      }
    } finally {
      setIsLoading(false)
    }
  }, [mounted])

  const signIn = async (email: string, password: string) => {
    try {
      // Check against hardcoded credentials
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const adminUser = {
          id: "1",
          email: ADMIN_EMAIL,
          role: "admin",
        }

        // Store in localStorage for persistence
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_user", JSON.stringify(adminUser))
        }

        setUser(adminUser)
        setIsAdmin(true)
        return { error: null, success: true }
      }

      return {
        error: { message: "Invalid email or password" },
        success: false,
      }
    } catch (error) {
      return { error, success: false }
    }
  }

  const signOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_user")
    }
    setUser(null)
    setIsAdmin(false)
    router.push("/login/admin")
  }

  const value = {
    user,
    isLoading,
    isAdmin,
    signIn,
    signOut,
  }

  // Don't render children until mounted to avoid hydration mismatch
  if (!mounted) {
    return null
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
