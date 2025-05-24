import type React from "react"
import { AuthProvider } from "@/components/auth/auth-provider"
import { AdminProtected } from "@/components/auth/admin-protected"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <AdminProtected>{children}</AdminProtected>
    </AuthProvider>
  )
}
