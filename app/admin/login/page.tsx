"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()

  // Use useEffect for client-side navigation
  useEffect(() => {
    router.push("/login/admin")
  }, [router])

  // Return null or a loading indicator while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to login page...</p>
      </div>
    </div>
  )
}
