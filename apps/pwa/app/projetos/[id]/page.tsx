import { ProjectDetailClient } from "./project-detail-client";

export default async function ProjetoDetalhePage({
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  return <ProjectDetailClient projectId={id} />;
}
