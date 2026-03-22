import { projectIdeaSchema } from "@elo/core";
import { requireAuth, resolveMemberIdByAuthUser } from "../../../../lib/auth";
import { fail, ok, parseJson } from "../../../../lib/http";
import { createProject, listProjects } from "../../../../lib/repositories";
import { z } from "zod";

const legacyProjectIdeaSchema = z.object({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().min(20).max(2000),
  category: z.string().trim().min(2).max(80),
  lookingFor: z.string().trim().min(3).max(180)
});

function truncateSummary(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 140) {
    return trimmed;
  }

  return `${trimmed.slice(0, 137).trimEnd()}...`;
}

function parseProjectPayload(payload: unknown) {
  const parsed = projectIdeaSchema.safeParse(payload);

  if (parsed.success) {
    return parsed;
  }

  const legacyParsed = legacyProjectIdeaSchema.safeParse(payload);

  if (!legacyParsed.success) {
    return parsed;
  }

  return projectIdeaSchema.safeParse({
    title: legacyParsed.data.title,
    summary: truncateSummary(legacyParsed.data.description),
    businessAreas: [legacyParsed.data.category],
    vision: legacyParsed.data.description,
    needs: [
      {
        title: legacyParsed.data.lookingFor,
        description: "Perfil buscado para acelerar a proxima fase deste projeto."
      }
    ],
    galleryImageUrls: [],
    documentationFiles: []
  });
}

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
  const parsed = parseProjectPayload(payload);

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
