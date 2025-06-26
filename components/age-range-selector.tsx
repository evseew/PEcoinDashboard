"use client"

import React, { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"

interface AgeRangeSelectorProps {
  value?: {
    min?: number
    max?: number
    display?: string
  }
  onChange: (ageRange: { min: number; max: number; display: string }) => void
  error?: string
}

const presetRanges = [
  { min: 5, max: 7, label: "5-7 y.o.", color: "bg-green-100 hover:bg-green-200 border-green-300" },
  { min: 7, max: 8, label: "7-8 y.o.", color: "bg-blue-100 hover:bg-blue-200 border-blue-300" },
  { min: 8, max: 9, label: "8-9 y.o.", color: "bg-purple-100 hover:bg-purple-200 border-purple-300" },
  { min: 9, max: 10, label: "9-10 y.o.", color: "bg-orange-100 hover:bg-orange-200 border-orange-300" },
  { min: 7, max: 9, label: "7-9 y.o.", color: "bg-cyan-100 hover:bg-cyan-200 border-cyan-300" },
  { min: 10, max: 12, label: "10-12 y.o.", color: "bg-yellow-100 hover:bg-yellow-200 border-yellow-300" },
]

export function AgeRangeSelector({ value, onChange, error }: AgeRangeSelectorProps) {
  const [minAge, setMinAge] = useState(value?.min || 7)
  const [maxAge, setMaxAge] = useState(value?.max || 9)
  const [isCustom, setIsCustom] = useState(false)

  // Проверяем, является ли текущий диапазон одним из предустановленных
  useEffect(() => {
    const isPreset = presetRanges.some(preset => preset.min === minAge && preset.max === maxAge)
    setIsCustom(!isPreset)
  }, [minAge, maxAge])

  // Генерируем отображаемый текст
  const generateDisplay = (min: number, max: number) => {
      if (min === max) return `${min} y.o.`
  return `${min}-${max} y.o.`
  }

  // Обновляем значения при изменении
  useEffect(() => {
    if (minAge >= 5 && maxAge <= 18 && minAge <= maxAge) {
      onChange({
        min: minAge,
        max: maxAge,
        display: generateDisplay(minAge, maxAge)
      })
    }
  }, [minAge, maxAge, onChange])

  const handlePresetClick = (preset: typeof presetRanges[0]) => {
    setMinAge(preset.min)
    setMaxAge(preset.max)
    setIsCustom(false)
  }

  const handleCustomClick = () => {
    setIsCustom(true)
  }

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Users className="w-4 h-4" />
        Age range
      </Label>
      
      {/* Предустановленные варианты */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {presetRanges.map((preset, index) => (
          <Button
            key={index}
            type="button"
            variant={minAge === preset.min && maxAge === preset.max ? "default" : "outline"}
            size="sm"
            className={`${preset.color} text-gray-700 font-medium`}
            onClick={() => handlePresetClick(preset)}
          >
            {preset.label}
          </Button>
        ))}
        
        <Button
          type="button"
          variant={isCustom ? "default" : "outline"}
          size="sm"
          className="bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700 font-medium"
          onClick={handleCustomClick}
        >
          Custom range
        </Button>
      </div>

      {/* Кастомный ввод */}
      {isCustom && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
          <div>
            <Label htmlFor="minAge" className="text-xs text-gray-600">
              Min age
            </Label>
            <Input
              id="minAge"
              type="number"
              min="5"
              max="18"
              value={minAge}
              onChange={(e) => setMinAge(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="maxAge" className="text-xs text-gray-600">
              Max age
            </Label>
            <Input
              id="maxAge"
              type="number"
              min="5"
              max="18"
              value={maxAge}
              onChange={(e) => setMaxAge(Number(e.target.value))}
              className="mt-1"
            />
          </div>
        </div>
      )}

      {/* Предварительный просмотр */}
      <div className="p-3 bg-lime-50 border border-lime-200 rounded-lg">
        <div className="text-sm text-lime-700">
          <strong>Display:</strong> {generateDisplay(minAge, maxAge)}
        </div>
      </div>

      {/* Ошибка валидации */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      {/* Валидация в реальном времени */}
      {(minAge < 5 || maxAge > 18 || minAge > maxAge) && (
        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
          {minAge < 5 && "Minimum age should be at least 5 years"}
          {maxAge > 18 && "Maximum age should be no more than 18 years"}
          {minAge > maxAge && "Minimum age cannot be greater than maximum age"}
        </div>
      )}
    </div>
  )
} 