"use client"

import type React from "react"

import { useAuth } from "./auth-provider"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { LoadingOverlay } from "@/components/loading-overlay"

export function AdminProtected({ children }: { children: React.ReactNode }) {
  const { isLoading, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Only run this effect after component is mounted and auth is checked
    if (!mounted || isLoading) return

    // Don't redirect if we're already on the login page
    if (pathname === "/login/admin") return

    // Redirect to login if not admin
    if (!isAdmin) {
      router.push("/login/admin")
    }
  }, [isLoading, isAdmin, router, pathname, mounted])

  // Show loading state while checking auth
  if (isLoading || !mounted) {
    return <LoadingOverlay />
  }

  // Always render children for login page
  if (pathname === "/login/admin") {
    return <>{children}</>
  }

  // For admin routes, only render if user is admin
  if (!isAdmin) {
    return null
  }

  return <>{children}</>
}
