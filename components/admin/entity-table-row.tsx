import { Edit, Trash2 } from "lucide-react"
import { useSplTokenBalance } from "@/hooks/use-spl-token-balance"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export function EntityTableRow({ entity, pecoinMint, pecoinImg, alchemyApiKey, extraColumns, handleEdit, handleDelete }) {
  const balance = useSplTokenBalance(entity.walletAddress, pecoinMint, alchemyApiKey)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLogoUrl() {
      if (entity.logo && typeof entity.logo === "string" && !entity.logo.startsWith("http")) {
        // Это storage key, получаем signedUrl
        const { data, error } = await supabase.storage.from("dashboard.logos").createSignedUrl(entity.logo, 60 * 60 * 24 * 7)
        if (data?.signedUrl) setLogoUrl(data.signedUrl)
        else setLogoUrl(null)
      } else if (entity.logo) {
        setLogoUrl(entity.logo)
      } else {
        setLogoUrl(null)
      }
    }
    fetchLogoUrl()
  }, [entity.logo])

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 mr-3 flex-shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl || "/placeholder.svg"}
                alt={entity.name}
                className="h-full w-full object-cover rounded-full"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400">
                {entity.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="font-medium">{entity.name}</div>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {entity.walletAddress.slice(0, 6)}...{entity.walletAddress.slice(-4)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-4 h-4 mr-1">
            <img src={pecoinImg} alt="PEcoin" className="w-full h-full object-cover rounded-full bg-transparent" />
          </div>
          <span className="text-sm">{balance !== null ? balance.toLocaleString() : "..."}</span>
        </div>
      </td>
      {extraColumns.map((column) => (
        <td key={column.key} className="px-4 py-3 whitespace-nowrap text-sm">
          {entity[column.key]}
        </td>
      ))}
      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => handleEdit(entity)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-[#FF6B6B] dark:hover:text-[#FF6B6B]"
            aria-label="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(entity)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-500"
            aria-label="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
} 