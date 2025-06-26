"use client"

import { useState } from "react"
import { Edit, Trash2, ArrowUpDown, Plus } from "lucide-react"
import { motion } from "framer-motion"
import { EntityFormModal } from "./entity-form-modal"
import { DeleteConfirmationModal } from "./delete-confirmation-modal"
import { useTokenImageUrl } from "@/hooks/token-image-provider"
import { useSplTokenBalance } from "@/hooks/use-spl-token-balance"
import { EntityTableRow } from "./entity-table-row"

interface Entity {
  id: string
  name: string
  walletAddress: string
  balance: number
  logo?: string | null
  description?: string
  [key: string]: any
}

interface EntityTableProps {
  title: string
  entities: Entity[]
  entityType: "team" | "startup" | "staff"
  onCreateEntity: (data: any) => Promise<void>
  onUpdateEntity: (id: string, data: any) => Promise<void>
  onDeleteEntity: (id: string) => Promise<void>
  extraColumns?: {
    key: string
    label: string
  }[]
  isLoading?: boolean
  showBalance?: boolean
}

export function EntityTable({
  title,
  entities,
  entityType,
  onCreateEntity,
  onUpdateEntity,
  onDeleteEntity,
  extraColumns = [],
  isLoading = false,
  showBalance = false,
}: EntityTableProps) {
  const [sortField, setSortField] = useState<string>((entityType === "startup" || entityType === "team") ? "ageRangeMin" : "name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)

  const pecoinMint = "FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r"
  const pecoinImg = useTokenImageUrl(pecoinMint, "/images/pecoin.png")
  const alchemyApiKey = "VYK2v9vubZLxKwE9-ASUeQC6b1-zaVb1"

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedEntities = [...entities].sort((a, b) => {
    let aValue = a[sortField]
    let bValue = b[sortField]

    // Для сортировки по возрасту, обрабатываем null/undefined как большие значения (в конец списка)
    if (sortField === "ageRangeMin") {
      aValue = aValue ?? 999
      bValue = bValue ?? 999
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  const handleEdit = (entity: Entity) => {
    setSelectedEntity(entity)
    setIsEditModalOpen(true)
  }

  const handleDelete = (entity: Entity) => {
    setSelectedEntity(entity)
    setIsDeleteModalOpen(true)
  }

  const handleUpdateEntity = async (data: any) => {
    if (selectedEntity) {
      await onUpdateEntity(selectedEntity.id, data)
    }
  }

  const handleDeleteEntity = async () => {
    if (selectedEntity) {
      await onDeleteEntity(selectedEntity.id)
    }
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-display font-bold">{title}</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#FF6B6B] text-white text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add {entityType === "team" ? "Team" : entityType === "startup" ? "Startup" : "Staff Member"}</span>
          </motion.button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    <span>Name</span>
                    <ArrowUpDown
                      className={`ml-1 h-3 w-3 ${
                        sortField === "name" ? "text-[#FF6B6B]" : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Wallet Address
                </th>
                {showBalance && (
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("balance")}
                  >
                    <div className="flex items-center">
                      <span>Balance</span>
                      <ArrowUpDown
                        className={`ml-1 h-3 w-3 ${
                          sortField === "balance" ? "text-[#FF6B6B]" : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                    </div>
                  </th>
                )}
                {extraColumns.map((column) => (
                  <th
                    key={column.key}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort(column.key)}
                  >
                    <div className="flex items-center">
                      <span>{column.label}</span>
                      <ArrowUpDown
                        className={`ml-1 h-3 w-3 ${
                          sortField === column.key ? "text-[#FF6B6B]" : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={(showBalance ? 4 : 3) + extraColumns.length}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex justify-center items-center">
                      <div className="w-6 h-6 border-2 border-[#FF6B6B] border-t-transparent rounded-full animate-spin mr-2"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : sortedEntities.length === 0 ? (
                <tr>
                  <td
                    colSpan={(showBalance ? 4 : 3) + extraColumns.length}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No {entityType === "team" ? "teams" : entityType === "startup" ? "startups" : "staff members"}{" "}
                    found.
                  </td>
                </tr>
              ) : (
                sortedEntities.map((entity) => (
                  <EntityTableRow
                    key={entity.id}
                    entity={entity}
                    pecoinMint={pecoinMint}
                    pecoinImg={pecoinImg}
                    alchemyApiKey={alchemyApiKey}
                    extraColumns={extraColumns}
                    showBalance={showBalance}
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EntityFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={onCreateEntity}
        title={`Create ${entityType === "team" ? "Team" : entityType === "startup" ? "Startup" : "Staff Member"}`}
        entityType={entityType}
      />

      <EntityFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateEntity}
        title={`Edit ${entityType === "team" ? "Team" : entityType === "startup" ? "Startup" : "Staff Member"}`}
        entity={selectedEntity}
        entityType={entityType}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteEntity}
        entityName={selectedEntity?.name || ""}
        entityType={entityType === "team" ? "team" : entityType === "startup" ? "startup" : "staff member"}
      />
    </>
  )
}
