// This file is no longer needed for authentication, but we'll keep it empty
// in case other parts of the application still reference it

export const createServerClient = () => {
  console.warn("Supabase server client is no longer used for authentication")
  return null
}
