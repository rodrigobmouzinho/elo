import { projectIdeaSchema } from "@elo/core";
import { requireAuth, resolveMemberIdByAuthUser } from "../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../lib/http";
import { createProject, listProjects } from "../../../../lib/repositories";

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  try {
    const viewerMemberId = await resolveMemberIdByAuthUser(auth.auth.userId);
    const projects = await listProjects(viewerMemberId);
    return ok(projects);
  } catch (error) {
    return fail(`Falha ao listar projetos: ${(error as Error).message}`, 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  const payload = await parseJson<unknown>(request);
  const parsed = projectIdeaSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Payload inválido", 422);
  }

  try {
    const ownerMemberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!ownerMemberId) {
      return fail("Usuário autenticado sem vínculo de membro", 403);
    }

    const project = await createProject(parsed.data, ownerMemberId);
    return ok(project, 201);
  } catch (error) {
    return fail(`Falha ao criar projeto: ${(error as Error).message}`, 500);
  }
}
