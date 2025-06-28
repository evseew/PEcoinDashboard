"use client"

import React from "react"
import { Users } from "lucide-react"

interface AgeDisplayProps {
  ageDisplay?: string
  ageRangeMin?: number
  ageRangeMax?: number
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
}

// ✅ УПРОЩЕННЫЙ СТИЛЬ: Всегда серый цвет как было раньше

export function AgeDisplay({ 
  ageDisplay, 
  ageRangeMin, 
  ageRangeMax, 
  size = "sm", 
  showIcon = false 
}: AgeDisplayProps) {
  // ✅ ВЕРНУЛ ПРЕЖНИЙ ДИЗАЙН: Простой серый блок как было раньше
  if (!ageDisplay && !ageRangeMin && !ageRangeMax) {
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400 font-normal bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md whitespace-nowrap">
        н/д
      </span>
    )
  }

  // Всегда генерируем английский текст на основе возрастного диапазона
  const displayText = ageRangeMin && ageRangeMax 
    ? (ageRangeMin === ageRangeMax ? `${ageRangeMin} y.o.` : `${ageRangeMin}-${ageRangeMax} y.o.`)
    : ageDisplay || 'Age not set'

  return (
    <span 
      className="text-xs text-gray-500 dark:text-gray-400 font-normal bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md whitespace-nowrap"
      title={`Age: ${displayText}`}
    >
      {displayText}
    </span>
  )
} 