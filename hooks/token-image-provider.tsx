"use client"

import React, { createContext, useContext, useEffect, useRef, useState } from "react"
import { getTokenMetadata } from "@/lib/alchemy/solana"

interface TokenImageContextValue {
  getTokenImageUrl: (mint: string, fallbackUrl: string) => string
  fetchTokenImage: (mint: string, fallbackUrl: string) => void
}

const TokenImageContext = createContext<TokenImageContextValue | undefined>(undefined)

const imageCache = new Map<string, string>()

export const TokenImageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Для форс-обновления
  const [, forceUpdate] = useState(0)
  const loading = useRef(new Set<string>())

  const getTokenImageUrl = (mint: string, fallbackUrl: string) => {
    return imageCache.get(mint) || fallbackUrl
  }

  const fetchTokenImage = (mint: string, fallbackUrl: string) => {
    if (imageCache.has(mint) || loading.current.has(mint)) return
    loading.current.add(mint)
    getTokenMetadata(mint).then(meta => {
      imageCache.set(mint, meta.image || fallbackUrl)
      loading.current.delete(mint)
      forceUpdate(x => x + 1)
    }).catch(() => {
      imageCache.set(mint, fallbackUrl)
      loading.current.delete(mint)
      forceUpdate(x => x + 1)
    })
  }

  return (
    <TokenImageContext.Provider value={{ getTokenImageUrl, fetchTokenImage }}>
      {children}
    </TokenImageContext.Provider>
  )
}

export function useTokenImageUrl(mint: string, fallbackUrl: string) {
  const ctx = useContext(TokenImageContext)
  if (!ctx) throw new Error("useTokenImageUrl must be used within TokenImageProvider")
  useEffect(() => {
    ctx.fetchTokenImage(mint, fallbackUrl)
  }, [mint, fallbackUrl])
  return ctx.getTokenImageUrl(mint, fallbackUrl)
} 