import { Edit, Trash2 } from "lucide-react"
// import { useSplTokenBalance } from "@/hooks/use-spl-token-balance" // УДАЛЕНО: используем централизованную загрузку
import { useNftCount } from "@/hooks/use-nft-count"
import { useEffect, useState } from "react"
import { signedUrlCache } from "@/lib/signed-url-cache"

interface EntityTableRowProps {
  entity: {
    id: string
    name: string
    walletAddress: string
    logo?: string | null
    balance?: number // Баланс теперь приходит как пропс
    [key: string]: any
  }
  pecoinMint: string
  pecoinImg: string
  alchemyApiKey: string
  extraColumns: { key: string; label: string }[]
  showBalance?: boolean
  balanceLoading?: boolean // Статус загрузки баланса
  handleEdit: (entity: any) => void
  handleDelete: (entity: any) => void
}

export function EntityTableRow({ 
  entity, 
  pecoinMint, 
  pecoinImg, 
  alchemyApiKey, 
  extraColumns, 
  showBalance = true, 
  balanceLoading = false,
  handleEdit, 
  handleDelete 
}: EntityTableRowProps) {
  // const { balance, loading } = useSplTokenBalance(entity.walletAddress, pecoinMint, alchemyApiKey) // УДАЛЕНО
  const { nftCount, loading: nftLoading } = useNftCount(entity.walletAddress)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLogoUrl() {
      // Используем общую утилиту кэширования signed URLs
      const url = await signedUrlCache.getSignedUrl(entity.logo || null)
      setLogoUrl(url)
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
      {showBalance && (
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1">
              <img src={pecoinImg} alt="PEcoin" className="w-full h-full object-cover rounded-full bg-transparent" />
            </div>
            <span className="text-sm">
              {balanceLoading ? "..." : entity.balance !== undefined ? entity.balance.toLocaleString() : "0"}
            </span>
          </div>
        </td>
      )}
      {extraColumns.map((column: { key: string; label: string }) => (
        <td key={column.key} className="px-4 py-3 whitespace-nowrap text-sm">
          {column.key === 'nftCount' 
            ? (
              <div className="flex items-center">
                <span className="text-purple-500 mr-1">🖼️</span>
                <span>
                  {nftLoading ? "..." : nftCount !== null ? nftCount : "0"}
                </span>
              </div>
            )
            : column.key === 'achievements' 
            ? (entity[column.key] || 0)
            : entity[column.key]
          }
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