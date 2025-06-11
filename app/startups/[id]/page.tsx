import EntityDetailPage from "../../[entityType]/[entityId]/page"

export default async function StartupDetailWrapper({ params }: { params: { id: string } }) {
  const resolvedParams = await params
  return <EntityDetailPage params={{ entityType: "startups", entityId: resolvedParams.id }} />
} 