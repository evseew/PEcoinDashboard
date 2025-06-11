import { EntityDetail } from "@/components/entity-detail"

export default function EntityDetailPage({
  params,
}: {
  params: { entityType: string; entityId: string }
}) {
  return <EntityDetail entityType={params.entityType} entityId={params.entityId} />
}
