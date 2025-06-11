import EntityDetailPage from "../../[entityType]/[entityId]/page"

export default async function TeamDetailWrapper({ params }: { params: { id: string } }) {
  const resolvedParams = await params
  return <EntityDetailPage params={{ entityType: "teams", entityId: resolvedParams.id }} />
} 