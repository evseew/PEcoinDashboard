import EntityDetailPage from "../../[entityType]/[entityId]/page"

export default function TeamDetailWrapper({ params }: { params: { id: string } }) {
  return <EntityDetailPage params={{ entityType: "teams", entityId: params.id }} />
} 