/**
 * Returns the base URL for the application, ensuring it works seamlessly for both
 * server-side rendering and client-side navigation, with automatic Vercel support.
 */
export function getBaseUrl(): string {
  // On the client, we can use the window object.
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // On the server, we check for the VERCEL_URL environment variable.
  // This is automatically set by Vercel deployments.
  if (process.env.VERCEL_URL) {
    // Vercel provides the URL without a protocol, so we add https.
    return `https://${process.env.VERCEL_URL}`
  }

  // As a fallback for local development, we use the NEXT_PUBLIC_APP_URL
  // or default to localhost. This is still needed for local server-side execution.
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
} 