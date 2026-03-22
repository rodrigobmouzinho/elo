import { ProjectEditClient } from "./project-edit-client";

export default async function EditarProjetoPage({
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  return <ProjectEditClient projectId={id} />;
}
