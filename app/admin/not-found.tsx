import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-lg text-gray-600 mb-6">Page not found</p>
        <Link href="/admin/dashboard">
          <span className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Return to Dashboard
          </span>
        </Link>
      </div>
    </div>
  )
}
