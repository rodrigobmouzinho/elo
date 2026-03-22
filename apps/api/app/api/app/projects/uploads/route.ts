import { requireAuth, resolveMemberIdByAuthUser } from "../../../../../lib/auth";
import { fail, ok } from "../../../../../lib/http";
import { isProjectUploadKind, uploadProjectFiles } from "../../../../../lib/project-assets";

export async function POST(request: Request) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  try {
    const memberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!memberId) {
      return fail("Usuario autenticado sem vinculo de membro", 403);
    }

    const formData = await request.formData();
    const kind = formData.get("kind");

    if (!isProjectUploadKind(kind)) {
      return fail("Tipo de upload invalido", 422);
    }

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return fail("Selecione ao menos um arquivo para upload", 422);
    }

    const uploaded = await uploadProjectFiles({
      kind,
      files,
      memberId
    });

    return ok({ files: uploaded }, 201);
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (
      errorMessage.includes("Selecione ao menos um arquivo") ||
      errorMessage.includes("excede o limite") ||
      errorMessage.includes("Envie imagens") ||
      errorMessage.includes("Envie apenas arquivos PDF") ||
      errorMessage.includes("esta vazio ou invalido") ||
      errorMessage.includes("no maximo")
    ) {
      return fail(errorMessage, 422);
    }

    return fail(`Falha ao enviar arquivos do projeto: ${errorMessage}`, 500);
  }
}
