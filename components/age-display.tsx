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

// Function to get color style based on age range
const getAgeColorStyle = (minAge?: number, maxAge?: number) => {
  if (!minAge || !maxAge) {
    return {
      bg: "bg-gray-100 dark:bg-gray-700",
      text: "text-gray-600 dark:text-gray-300",
      border: "border-gray-300 dark:border-gray-600",
      icon: "text-gray-500"
    }
  }

  // Определяем основную возрастную группу по средней точке
  const avgAge = (minAge + maxAge) / 2

  if (avgAge <= 7) {
    // 🟢 Малыши (5-7 лет)
    return {
      bg: "bg-green-100 dark:bg-green-900/20",
      text: "text-green-700 dark:text-green-300",
      border: "border-green-300 dark:border-green-600",
      icon: "text-green-600"
    }
  } else if (avgAge <= 10) {
    // 🔵 Средняя группа (8-10 лет) 
    return {
      bg: "bg-blue-100 dark:bg-blue-900/20",
      text: "text-blue-700 dark:text-blue-300",
      border: "border-blue-300 dark:border-blue-600",
      icon: "text-blue-600"
    }
  } else if (avgAge <= 13) {
    // 🟡 Подростки (11-13 лет)
    return {
      bg: "bg-yellow-100 dark:bg-yellow-900/20",
      text: "text-yellow-700 dark:text-yellow-300",
      border: "border-yellow-300 dark:border-yellow-600",
      icon: "text-yellow-600"
    }
  } else {
    // 🟠 Старшие (14+ лет)
    return {
      bg: "bg-orange-100 dark:bg-orange-900/20",
      text: "text-orange-700 dark:text-orange-300",
      border: "border-orange-300 dark:border-orange-600",
      icon: "text-orange-600"
    }
  }
}

// Функция для получения эмодзи по возрастной группе
const getAgeEmoji = (minAge?: number, maxAge?: number) => {
  if (!minAge || !maxAge) return "👥"
  
  const avgAge = (minAge + maxAge) / 2
  
  if (avgAge <= 7) return "🟢"
  if (avgAge <= 10) return "🔵"
  if (avgAge <= 13) return "🟡"
  return "🟠"
}

export function AgeDisplay({ 
  ageDisplay, 
  ageRangeMin, 
  ageRangeMax, 
  size = "md", 
  showIcon = true 
}: AgeDisplayProps) {
  const colors = getAgeColorStyle(ageRangeMin, ageRangeMax)
  const emoji = getAgeEmoji(ageRangeMin, ageRangeMax)
  
  // Размеры в зависимости от пропа size
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base"
  }
  
  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4", 
    lg: "w-5 h-5"
  }

  if (!ageDisplay && !ageRangeMin && !ageRangeMax) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full ${sizeClasses[size]} ${colors.bg} ${colors.text} ${colors.border} border`}>
        {showIcon && <Users className={`${iconSizes[size]} ${colors.icon}`} />}
        <span className="font-medium">н/д</span>
      </span>
    )
  }

  // Всегда генерируем английский текст на основе возрастного диапазона
  const displayText = ageRangeMin && ageRangeMax 
    ? (ageRangeMin === ageRangeMax ? `${ageRangeMin} y.o.` : `${ageRangeMin}-${ageRangeMax} y.o.`)
    : ageDisplay || 'Age not set'

  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full ${sizeClasses[size]} ${colors.bg} ${colors.text} ${colors.border} border transition-all duration-200 hover:scale-105`}
      title={`Team age: ${displayText}`}
    >
      {showIcon && (
        <span className="text-sm" role="img" aria-label="age-indicator">
          {emoji}
        </span>
      )}
      <span className="font-medium">{displayText}</span>
    </span>
  )
} 