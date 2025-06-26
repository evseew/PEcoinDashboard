"use client"

import { useState } from "react"
import { ArrowUpDown, Plus } from "lucide-react"
import { motion } from "framer-motion"
import { EntityFormModal } from "./entity-form-modal"
import { DeleteConfirmationModal } from "./delete-confirmation-modal"
import { EntityTableRow } from "./entity-table-row"

interface Entity {
  id: string
  name: string
  walletAddress: string
  balance: number
  logo?: string | null
  description?: string
  [key: string]: unknown
}

interface EntityTableProps {
  title: string
  entities: Entity[]
  entityType: "team" | "startup" | "staff"
  onCreateEntity: (data: Partial<Entity>) => Promise<void>
  onUpdateEntity: (id: string, data: Partial<Entity>) => Promise<void>
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
  const [sortField, setSortField] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedEntities = [...entities].sort((a, b) => {
    let aValue: unknown = a[sortField]
    let bValue: unknown = b[sortField]

    // Для сортировки по возрасту, обрабатываем null/undefined как большие значения (в конец списка)
    if (sortField === "ageRangeMin") {
      aValue = aValue ?? 999
      bValue = bValue ?? 999
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    }

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

  const handleUpdateEntity = async (data: Partial<Entity>) => {
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
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    <div className="flex items-center">
                      <span>PEcoin Balance</span>
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
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 mr-3"></div>
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    </td>
                    {showBalance && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      </td>
                    )}
                    {extraColumns.map((column) => (
                      <td key={column.key} className="px-4 py-3 whitespace-nowrap">
                        <div className="h-4 w-12 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      </td>
                    ))}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <div className="h-6 w-6 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        <div className="h-6 w-6 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                sortedEntities.map(entity => (
                  <EntityTableRow
                    key={entity.id}
                    entity={entity}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    showBalance={showBalance}
                    extraColumns={extraColumns}
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
