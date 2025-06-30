/**
 * Единые типы данных для NFT коллекций
 * Используется во всем приложении для обеспечения типобезопасности
 */

export interface NFTCollection {
  id: string
  name: string
  description: string
  symbol: string
  tree_address: string
  collection_address?: string
  creator_address?: string
  capacity: number
  minted: number
  depth?: number
  buffer_size?: number
  image_url?: string
  external_url?: string
  metadata_json?: any
  has_valid_tree: boolean
  supports_das: boolean
  rpc_used?: string
  status: 'active' | 'paused' | 'completed'
  is_public: boolean
  allow_minting: boolean
  created_at: string
  updated_at: string
  imported_at: string
  last_sync_at?: string
} 