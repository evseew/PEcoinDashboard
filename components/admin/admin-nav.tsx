"use client"

import { useAuth } from "@/components/auth/auth-provider"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function AdminNav() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <Link href="/admin/dashboard" className="text-xl font-bold text-gray-900">
              Admin
            </Link>
            <nav className="flex space-x-4">
              <Link
                href="/admin/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/admin/dashboard")
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/admin/users"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/admin/users")
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Users
              </Link>
              <Link
                href="/admin/startups"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/admin/startups")
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Startups
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button onClick={signOut} className="text-sm text-red-600 hover:text-red-800">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
