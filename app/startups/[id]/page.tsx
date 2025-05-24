import EntityDetailPage from "../../[entityType]/[entityId]/page"

export default function StartupDetailWrapper({ params }: { params: { id: string } }) {
  return <EntityDetailPage params={{ entityType: "startups", entityId: params.id }} />
} 