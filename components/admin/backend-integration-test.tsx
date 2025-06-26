'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { apiClient } from '@/lib/api-strategy'

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error'
  data?: any
  error?: string
  timestamp?: string
}

interface TestResults {
  [key: string]: TestResult
}

export default function BackendIntegrationTest() {
  const [results, setResults] = useState<TestResults>({})
  const [activeTests, setActiveTests] = useState<Set<string>>(new Set())

  const updateResult = (testName: string, result: Partial<TestResult>) => {
    setResults(prev => ({
      ...prev,
      [testName]: {
        ...prev[testName],
        ...result,
        timestamp: new Date().toISOString()
      }
    }))
  }

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setActiveTests(prev => new Set(prev).add(testName))
    updateResult(testName, { status: 'loading' })

    try {
      const data = await testFn()
      updateResult(testName, { status: 'success', data, error: undefined })
    } catch (error: any) {
      updateResult(testName, { status: 'error', error: error.message, data: undefined })
    } finally {
      setActiveTests(prev => {
        const newSet = new Set(prev)
        newSet.delete(testName)
        return newSet
      })
    }
  }

  // Тесты базовой связности
  const testHealthCheck = () => runTest('health', async () => {
    // Попробуем внешний API health check
    const response = await fetch(process.env.NEXT_PUBLIC_EXTERNAL_API_URL + '/health')
    return await response.json()
  })

  const testInternalApi = () => runTest('internal', async () => {
    // Тест текущего internal API
    const response = await apiClient.getCollections()
    return response
  })

  const testIPFSService = () => runTest('ipfs', async () => {
    // Тест статуса IPFS сервиса через detailed health check
    const response = await fetch(process.env.NEXT_PUBLIC_EXTERNAL_API_URL + '/health/detailed', {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_EXTERNAL_API_KEY || ''
      }
    })
    const healthData = await response.json()
    return healthData.checks?.services?.ipfs || { status: 'unknown', message: 'IPFS status not found in health check' }
  })

  // Тесты NFT операций
  const testExternalCollections = () => runTest('external-collections', async () => {
    // Тест получения коллекций через внешний API
    const response = await fetch(process.env.NEXT_PUBLIC_EXTERNAL_API_URL + '/api/collections', {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_EXTERNAL_API_KEY || ''
      }
    })
    return await response.json()
  })

  const testHybridCollection = () => runTest('hybrid-collections', async () => {
    // Тест гибридного API клиента
    return await apiClient.getCollections()
  })

  const testWalletNFTs = () => runTest('wallet-nfts', async () => {
    // Тест получения NFT кошелька (тестовый адрес)
    const testWallet = 'A27VztuDLCA3FwnELbCnoGQW83Rk5xfrL7A79A8xbDTP'
    return await apiClient.getWalletNFTs(testWallet)
  })

  // Запускаем базовые тесты при загрузке
  useEffect(() => {
    testInternalApi()
    testHealthCheck()
    testIPFSService()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading': return <Clock className="h-4 w-4 animate-spin" />
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <div className="h-4 w-4 bg-gray-300 rounded-full" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      loading: 'secondary',
      success: 'default',
      error: 'destructive',
      idle: 'outline'
    } as const
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Backend Integration Testing
          </CardTitle>
          <CardDescription>
            Тестирование интеграции между текущим Next.js API и внешним Express.js бэкендом
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="connectivity" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="connectivity">Связность</TabsTrigger>
              <TabsTrigger value="operations">Операции</TabsTrigger>
              <TabsTrigger value="results">Результаты</TabsTrigger>
            </TabsList>

            <TabsContent value="connectivity" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Internal API Health
                      {getStatusIcon(results.internal?.status || 'idle')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {getStatusBadge(results.internal?.status || 'idle')}
                    <Button 
                      onClick={testInternalApi}
                      disabled={activeTests.has('internal')}
                      size="sm"
                      className="w-full"
                    >
                      Тест Internal API
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      External API Health
                      {getStatusIcon(results.health?.status || 'idle')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {getStatusBadge(results.health?.status || 'idle')}
                    <Button 
                      onClick={testHealthCheck}
                      disabled={activeTests.has('health')}
                      size="sm"
                      className="w-full"
                    >
                      Тест External API
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      IPFS Service
                      {getStatusIcon(results.ipfs?.status || 'idle')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {getStatusBadge(results.ipfs?.status || 'idle')}
                    <Button 
                      onClick={testIPFSService}
                      disabled={activeTests.has('ipfs')}
                      size="sm"
                      className="w-full"
                    >
                      Тест IPFS сервиса
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="operations" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      External Collections
                      {getStatusIcon(results['external-collections']?.status || 'idle')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={testExternalCollections}
                      disabled={activeTests.has('external-collections')}
                      size="sm"
                      className="w-full"
                    >
                      Тест
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Hybrid Collections
                      {getStatusIcon(results['hybrid-collections']?.status || 'idle')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={testHybridCollection}
                      disabled={activeTests.has('hybrid-collections')}
                      size="sm"
                      className="w-full"
                    >
                      Тест
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Wallet NFTs
                      {getStatusIcon(results['wallet-nfts']?.status || 'idle')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={testWalletNFTs}
                      disabled={activeTests.has('wallet-nfts')}
                      size="sm"
                      className="w-full"
                    >
                      Тест
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              {Object.entries(results).map(([testName, result]) => (
                <Card key={testName}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      {testName}
                      <div className="flex items-center gap-2">
                        {result.timestamp && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                        {getStatusBadge(result.status)}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.error && (
                      <div className="text-sm text-red-600 mb-2">
                        Error: {result.error}
                      </div>
                    )}
                    {result.data && (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium mb-2">Response Data</summary>
                        <pre className="bg-gray-50 p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 