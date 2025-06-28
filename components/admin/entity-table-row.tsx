import { Edit, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { signedUrlCache } from "@/lib/signed-url-cache"
import { globalBalanceCache } from "@/hooks/use-dashboard-balances"
import Image from "next/image"

interface EntityTableRowProps {
  entity: {
    id: string
    name: string
    walletAddress: string
    logo?: string | null
    balance?: number
    nftCount?: number
    [key: string]: unknown
  }
  extraColumns: { key: string; label: string }[]
  showBalance?: boolean
  onEdit: (entity: EntityTableRowProps['entity']) => void
  onDelete: (entity: EntityTableRowProps['entity']) => void
}

export function EntityTableRow({ 
  entity, 
  extraColumns, 
  showBalance = true, 
  onEdit, 
  onDelete 
}: EntityTableRowProps) {
  // Константы для PEcoin
  const pecoinImg = "/images/pecoin.png"
  
  // ✅ ИСПРАВЛЕНО: Убрал дублирующие индивидуальные запросы useSplTokenBalance и useNftCount
  // Используем только переданные данные и globalBalanceCache как fallback
  const finalBalance = entity.balance !== undefined 
    ? entity.balance 
    : (globalBalanceCache.balances[entity.walletAddress] || 0)
  
  // ✅ Используем переданный NFT count или 0 (batch NFT данные должны передаваться из родительского компонента)
  const finalNFTCount = entity.nftCount !== undefined ? entity.nftCount : 0
  
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLogoUrl() {
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
              <Image
                src={logoUrl || "/placeholder.svg"}
                alt={entity.name}
                width={32}
                height={32}
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
              <Image 
                src={pecoinImg} 
                alt="PEcoin" 
                width={16}
                height={16}
                className="w-full h-full object-cover rounded-full bg-transparent" 
              />
            </div>
            <span className="text-sm">
              {finalBalance.toLocaleString()}
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
                  {finalNFTCount}
                </span>
              </div>
            )
            : column.key === 'achievements' 
            ? String(entity[column.key] || 0)
            : String(entity[column.key] || "")
          }
        </td>
      ))}
      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => onEdit(entity)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-[#FF6B6B] dark:hover:text-[#FF6B6B]"
            aria-label="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(entity)}
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