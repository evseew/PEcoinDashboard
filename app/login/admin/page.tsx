"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { CampIcon } from "@/components/camp-icons"
import { AnimatedBackground } from "@/components/animated-background"
import { Eye, EyeOff, LogIn } from "lucide-react"
import Link from "next/link"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { signIn, isAdmin } = useAuth()
  const router = useRouter()

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (isAdmin) {
      router.push("/admin/dashboard")
    }
  }, [isAdmin, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { error, success } = await signIn(email, password)

      if (error) {
        setError(error.message || "Failed to sign in")
        setIsLoading(false)
        return
      }

      if (success) {
        router.push("/admin/dashboard")
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error(err)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-[#FF6B6B] dark:border-[#FF6B6B]/80"
      >
        <div className="flex flex-col items-center mb-6">
          <CampIcon type="camp-logo" size="lg" />
          <h1 className="text-2xl font-display font-bold mt-4 bg-gradient-to-r from-[#FF6B6B] to-[#06D6A0] bg-clip-text text-transparent">
            Admin Login
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to access the admin dashboard</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] dark:focus:ring-[#FF6B6B]/70 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] dark:focus:ring-[#FF6B6B]/70 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#FF6B6B] to-[#06D6A0] text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          <p>This page is restricted to admin users only.</p>
          <p className="mt-1">
            <Link href="/dashboard" className="text-[#FF6B6B] hover:underline">
              Return to public dashboard
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
