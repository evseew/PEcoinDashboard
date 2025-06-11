import { EntityDetail } from "@/components/entity-detail"

export default async function EntityDetailPage({
  params,
}: {
  params: { entityType: string; entityId: string }
}) {
  const resolvedParams = await params
  return <EntityDetail entityType={resolvedParams.entityType} entityId={resolvedParams.entityId} />
}
