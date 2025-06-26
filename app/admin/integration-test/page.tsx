import { AdminLayout } from '@/components/admin/admin-layout'
import BackendIntegrationTest from '@/components/admin/backend-integration-test'

export default function IntegrationTestPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔗 Backend Integration</h1>
          <p className="text-gray-600 mt-2">
            Тестирование интеграции между Next.js API и внешним Express.js бэкендом
          </p>
        </div>
        
        <BackendIntegrationTest />
      </div>
    </AdminLayout>
  )
} 