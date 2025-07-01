"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, AlertCircle } from "lucide-react"
import { AgeRangeSelector } from "@/components/age-range-selector"
import { signedUrlCache } from "@/lib/signed-url-cache"

interface EntityFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  title: string
  entity?: any
  entityType: "team" | "startup" | "staff"
}

export function EntityFormModal({ isOpen, onClose, onSave, title, entity, entityType }: EntityFormModalProps) {
  const [name, setName] = useState(entity?.name || "")
  const [walletAddress, setWalletAddress] = useState(entity?.walletAddress || "")
  const [description, setDescription] = useState(entity?.description || "")
  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [ageRange, setAgeRange] = useState({
    min: entity?.ageRangeMin || 8,
    max: entity?.ageRangeMax || 10,
    display: entity?.ageDisplay || "8-10 y.o."
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ✅ НОРМАЛИЗАЦИЯ wallet address для iPhone (убирает проблемные символы)
  const normalizeWalletAddressForValidation = (address: string): string => {
    if (typeof window === 'undefined') return address
    
    // Детекция iPhone/iOS
    const isiPhone = /iPhone|iPad|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    
    if (!isiPhone) return address // Для не-iPhone устройств не меняем
    
    // ✅ iPhone-специфичная очистка
    return address
      .replace(/\u00A0/g, '') // Неразрывный пробел (часто добавляется iPhone)
      .replace(/\u200B/g, '') // Zero-width space
      .replace(/\u200C/g, '') // Zero-width non-joiner  
      .replace(/\u200D/g, '') // Zero-width joiner
      .replace(/\uFEFF/g, '') // Byte order mark
      .replace(/[\r\n\t]/g, '') // Переносы строк и табы
      .replace(/\s+/g, '') // Все остальные пробелы
      .trim()
  }

  useEffect(() => {
    async function loadExistingLogo() {
      if (entity?.logo && typeof entity.logo === 'string') {
        console.log('[EntityFormModal] 🔗 Получаю signed URL для:', entity.logo)
        const signedUrl = await signedUrlCache.getSignedUrl(entity.logo)
        if (signedUrl) {
          setLogoPreview(signedUrl)
          console.log('[EntityFormModal] ✅ Signed URL получен')
        } else {
          console.warn('[EntityFormModal] ⚠️ Не удалось получить signed URL для:', entity.logo)
          setLogoPreview(null)
        }
      } else {
        setLogoPreview(null)
      }
    }

    setName(entity?.name || "")
    setWalletAddress(entity?.walletAddress || "")
    setDescription(entity?.description || "")
    setLogo(null)
    setAgeRange({
      min: entity?.ageRangeMin || 8,
      max: entity?.ageRangeMax || 10,
      display: entity?.ageDisplay || "8-10 y.o."
    })
    
    if (isOpen) {
      loadExistingLogo()
    }
  }, [entity, isOpen])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogo(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!walletAddress.trim()) {
      newErrors.walletAddress = "Wallet address is required"
    } else {
      const normalizedAddress = normalizeWalletAddressForValidation(walletAddress)
      
      if (!/^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(normalizedAddress)) {
        newErrors.walletAddress = "Invalid Solana wallet address format"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSave({
        name,
        walletAddress,
        description,
        logo: logo || entity?.logo,
        ageRangeMin: ageRange.min,
        ageRangeMax: ageRange.max,
        ageDisplay: ageRange.display,
      })
      onClose()
    } catch (error) {
      console.error("Error saving entity:", error)
      setErrors({
        submit: "Failed to save. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-display font-bold">{title}</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              <div className="space-y-4">
                {/* Logo Upload */}
                <div className="flex flex-col items-center mb-4">
                  <div
                    className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#FF6B6B] dark:hover:border-[#FF6B6B]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {logoPreview ? (
                      <img
                        src={logoPreview || "/placeholder.svg"}
                        alt="Логотип"
                        className="w-20 h-20 object-cover rounded-full"
                      />
                    ) : (
                      <Upload className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">Click to upload logo</span>
                </div>

                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 ${
                      errors.name
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 dark:border-gray-600 focus:ring-[#FF6B6B] dark:focus:ring-[#FF6B6B]/70"
                    }`}
                    placeholder={`${entityType === "team" ? "Team" : entityType === "startup" ? "Startup" : "Staff"} name`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-500 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Wallet Address */}
                <div>
                  <label
                    htmlFor="walletAddress"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Wallet Address
                  </label>
                  <input
                    id="walletAddress"
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 ${
                      errors.walletAddress
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 dark:border-gray-600 focus:ring-[#FF6B6B] dark:focus:ring-[#FF6B6B]/70"
                    }`}
                    placeholder="Solana wallet address"
                  />
                  {errors.walletAddress && (
                    <p className="mt-1 text-xs text-red-500 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errors.walletAddress}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] dark:focus:ring-[#FF6B6B]/70 bg-white dark:bg-gray-700"
                    placeholder={`${
                      entityType === "team"
                        ? "Team description"
                        : entityType === "startup"
                          ? "Startup description or slogan"
                          : "Staff role and description"
                    }`}
                  />
                </div>

                {/* Age Range - для команд и стартапов */}
                {(entityType === "team" || entityType === "startup") && (
                  <AgeRangeSelector
                    value={ageRange}
                    onChange={setAgeRange}
                    error={errors.ageRange}
                  />
                )}

                {errors.submit && (
                  <p className="mt-1 text-sm text-red-500 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.submit}
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#06D6A0] text-white rounded-lg hover:opacity-90 disabled:opacity-70 flex items-center justify-center min-w-[80px]"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}


