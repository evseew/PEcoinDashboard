import { supabase } from "@/lib/supabaseClient"
import { signedUrlCache } from "@/lib/signed-url-cache"
import Link from "next/link"

// Используем общую утилиту кэширования signed URLs
async function getSignedUrl(storageKey: string | null) {
  return signedUrlCache.getSignedUrl(storageKey)
}

export default async function StaffPage() {
  const { data: staff, error } = await supabase.from("staff").select("*")

  if (error) {
    return <div className="text-red-500">Ошибка загрузки стаффа: {error.message}</div>
  }

  // Получаем signedUrl для всех логотипов
  const staffWithLogo = await Promise.all(
    (staff || []).map(async (person) => ({
      ...person,
      logoUrl: await getSignedUrl(person.logo_url),
    }))
  )

  return (
    <main className="container mx-auto py-8 px-4 md:px-8">
      <h1 className="text-3xl font-bold mb-6">Стафф</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staffWithLogo && staffWithLogo.length > 0 ? (
          staffWithLogo.map(person => (
            <Link
              key={person.id}
              href={`/staff/${person.id}`}
              className="block p-6 rounded-xl shadow bg-white dark:bg-gray-800 hover:shadow-lg transition"
            >
              <div className="flex items-center mb-3">
                {person.logoUrl ? (
                  <img src={person.logoUrl} alt={person.name} className="w-12 h-12 rounded-full mr-4 object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 mr-4 flex items-center justify-center text-xl font-bold">
                    {person.name.charAt(0)}
                  </div>
                )}
                <span className="text-xl font-semibold">{person.name}</span>
              </div>
              <div className="text-gray-500 text-sm mb-2 truncate">{person.wallet_address}</div>
              <div className="text-gray-700 dark:text-gray-300 text-base">{person.description}</div>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-gray-500">Нет стаффа</div>
        )}
      </div>
    </main>
  )
} 