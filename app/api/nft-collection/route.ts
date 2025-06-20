import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// Временно используем обычный клиент (RLS отключен для nft_collections)
// TODO: переключиться на createServerClient когда настроен SUPABASE_SERVICE_ROLE_KEY

interface NFTCollection {
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

// GET - получение всех коллекций
export async function GET() {
  try {
    console.log('[API] Получение списка коллекций')

    const { data: collections, error } = await supabase
      .from('nft_collections')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API] Ошибка получения коллекций:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API] ✅ Загружено ${collections?.length || 0} коллекций`)

    return NextResponse.json({
      success: true,
      collections: collections || [],
      total: collections?.length || 0
    })

  } catch (error: any) {
    console.error('[API] Критическая ошибка:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Не удалось загрузить коллекции' },
      { status: 500 }
    )
  }
}

// POST - создание новой коллекции
export async function POST(request: NextRequest) {
  try {
    const collectionData = await request.json()

    console.log('[API] Добавление новой коллекции:', {
      name: collectionData.name,
      treeAddress: collectionData.treeAddress,
      hasImage: !!collectionData.image,
      imageUrl: collectionData.image
    })

    // Валидация обязательных полей
    if (!collectionData.name || !collectionData.treeAddress) {
      return NextResponse.json(
        { success: false, error: 'Имя коллекции и адрес дерева обязательны' },
        { status: 400 }
      )
    }

    // Валидация формата tree address
    if (!/^[1-9A-HJ-NP-Za-km-z]{44}$/.test(collectionData.treeAddress)) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат адреса дерева Solana' },
        { status: 400 }
      )
    }

    // Проверка на дублирование tree address
    const { data: existingCollection } = await supabase
      .from('nft_collections')
      .select('id, name')
      .eq('tree_address', collectionData.treeAddress)
      .single()

    if (existingCollection) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Коллекция с адресом дерева ${collectionData.treeAddress} уже существует (${existingCollection.name})` 
        },
        { status: 409 }
      )
    }

    // Подготовка данных для вставки
    const insertData = {
      name: collectionData.name,
      description: collectionData.description || '',
      symbol: collectionData.symbol || 'cNFT',
      tree_address: collectionData.treeAddress,
      collection_address: collectionData.collectionAddress || null,
      creator_address: collectionData.creator || null,
      capacity: collectionData.capacity || 1024,
      minted: collectionData.minted || 0,
      depth: collectionData.depth || 20,
      buffer_size: collectionData.bufferSize || 64,
      image_url: collectionData.image || null,
      external_url: collectionData.externalUrl || null,
      metadata_json: collectionData.metadata || null,
      has_valid_tree: collectionData.hasValidTree || false,
      supports_das: collectionData.supportsDAS || false,
      rpc_used: collectionData.rpcUsed || null,
      status: collectionData.status || 'active',
      is_public: collectionData.isPublic !== undefined ? collectionData.isPublic : true,
      allow_minting: collectionData.allowMinting !== undefined ? collectionData.allowMinting : true,
      imported_at: new Date().toISOString(),
      last_sync_at: collectionData.minted > 0 ? new Date().toISOString() : null // Устанавливаем если есть NFT
    }

    // Вставка в базу данных
    const { data: newCollection, error } = await supabase
      .from('nft_collections')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('[API] Ошибка при добавлении коллекции:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API] ✅ Коллекция успешно добавлена:`, {
      id: newCollection.id,
      name: newCollection.name,
      treeAddress: newCollection.tree_address
    })

    return NextResponse.json({
      success: true,
      collection: newCollection,
      message: `Коллекция "${newCollection.name}" успешно добавлена`
    })

  } catch (error: any) {
    console.error('[API] Ошибка при добавлении коллекции:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Не удалось добавить коллекцию' },
      { status: 500 }
    )
  }
}

// PUT - обновление существующей коллекции
export async function PUT(request: NextRequest) {
  try {
    const { id, ...updateData } = await request.json()

    console.log('[API] Обновление коллекции:', { id, updates: Object.keys(updateData) })

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID коллекции обязателен для обновления' },
        { status: 400 }
      )
    }

    // Подготовка данных для обновления (убираем undefined значения)
    const cleanedUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    // Всегда обновляем updated_at при любом изменении
    cleanedUpdateData.updated_at = new Date().toISOString()

    // Если есть tree_address, проверяем на дублирование
    if (cleanedUpdateData.tree_address) {
      const { data: existingCollection } = await supabase
        .from('nft_collections')
        .select('id')
        .eq('tree_address', cleanedUpdateData.tree_address)
        .neq('id', id)
        .single()

      if (existingCollection) {
        return NextResponse.json(
          { success: false, error: 'Коллекция с таким адресом дерева уже существует' },
          { status: 409 }
        )
      }
    }

    // Обновление в базе данных
    const { data: updatedCollection, error } = await supabase
      .from('nft_collections')
      .update(cleanedUpdateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[API] Ошибка при обновлении коллекции:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    if (!updatedCollection) {
      return NextResponse.json(
        { success: false, error: 'Коллекция не найдена' },
        { status: 404 }
      )
    }

    console.log(`[API] ✅ Коллекция обновлена:`, {
      id: updatedCollection.id,
      name: updatedCollection.name
    })

    return NextResponse.json({
      success: true,
      collection: updatedCollection,
      message: `Коллекция "${updatedCollection.name}" успешно обновлена`
    })

  } catch (error: any) {
    console.error('[API] Ошибка при обновлении коллекции:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Не удалось обновить коллекцию' },
      { status: 500 }
    )
  }
}

// DELETE - удаление коллекции
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    console.log('[API] Удаление коллекции:', { id })

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID коллекции обязателен для удаления' },
        { status: 400 }
      )
    }

    // Получаем информацию о коллекции перед удалением
    const { data: collectionToDelete } = await supabase
      .from('nft_collections')
      .select('name, tree_address')
      .eq('id', id)
      .single()

    if (!collectionToDelete) {
      return NextResponse.json(
        { success: false, error: 'Коллекция не найдена' },
        { status: 404 }
      )
    }

    // Удаление из базы данных
    const { error } = await supabase
      .from('nft_collections')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[API] Ошибка при удалении коллекции:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API] ✅ Коллекция удалена:`, {
      id,
      name: collectionToDelete.name,
      treeAddress: collectionToDelete.tree_address
    })

    return NextResponse.json({
      success: true,
      message: `Коллекция "${collectionToDelete.name}" успешно удалена`
    })

  } catch (error: any) {
    console.error('[API] Ошибка при удалении коллекции:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Не удалось удалить коллекцию' },
      { status: 500 }
    )
  }
} 