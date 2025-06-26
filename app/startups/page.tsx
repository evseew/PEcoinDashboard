import { supabase } from "@/lib/supabaseClient"
import { signedUrlCache } from "@/lib/signed-url-cache"
import Link from "next/link"

// Используем общую утилиту кэширования signed URLs
async function getSignedUrl(storageKey: string | null) {
  return signedUrlCache.getSignedUrl(storageKey)
}

export default async function StartupsPage() {
  const { data: startups, error } = await supabase.from("startups").select("*")

  if (error) {
    return <div className="text-red-500">Ошибка загрузки стартапов: {error.message}</div>
  }

  // Получаем signedUrl для всех логотипов
  const startupsWithLogo = await Promise.all(
    (startups || []).map(async (startup) => ({
      ...startup,
      logoUrl: await getSignedUrl(startup.logo_url),
    }))
  )

  return (
    <main className="container mx-auto py-8 px-4 md:px-8">
      <h1 className="text-3xl font-bold mb-6">Стартапы</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {startupsWithLogo && startupsWithLogo.length > 0 ? (
          startupsWithLogo.map(startup => (
            <Link
              key={startup.id}
              href={`/startups/${startup.id}`}
              className="block p-6 rounded-xl shadow bg-white dark:bg-gray-800 hover:shadow-lg transition"
            >
              <div className="flex items-center mb-3">
                {startup.logoUrl ? (
                  <img src={startup.logoUrl} alt={startup.name} className="w-12 h-12 rounded-full mr-4 object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 mr-4 flex items-center justify-center text-xl font-bold">
                    {startup.name.charAt(0)}
                  </div>
                )}
                <span className="text-xl font-semibold">{startup.name}</span>
              </div>
              <div className="text-gray-500 text-sm mb-2 truncate">{startup.wallet_address}</div>
              {/* Age display */}
              {(startup.age_display || startup.age_range_min) && (
                <div className="mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md whitespace-nowrap">
                    {startup.age_range_min && startup.age_range_max 
                      ? (startup.age_range_min === startup.age_range_max 
                          ? `${startup.age_range_min} y.o.` 
                          : `${startup.age_range_min}-${startup.age_range_max} y.o.`)
                      : startup.age_display || 'Age not set'}
                  </span>
                </div>
              )}
              <div className="text-gray-700 dark:text-gray-300 text-base">{startup.description}</div>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-gray-500">Нет стартапов</div>
        )}
      </div>
    </main>
  )
} 