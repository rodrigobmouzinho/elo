import { requireAuth, resolveMemberIdByAuthUser } from "../../../../../lib/auth";
import { fail, ok } from "../../../../../lib/http";
import { uploadMemberAvatarFile } from "../../../../../lib/member-avatar-assets";

export async function POST(request: Request) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  try {
    const memberId = await resolveMemberIdByAuthUser(auth.auth.userId);

    if (!memberId) {
      return fail("Usuário autenticado sem vínculo de membro", 403);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return fail("Selecione uma imagem para enviar", 422);
    }

    const uploaded = await uploadMemberAvatarFile({
      file,
      memberId
    });

    return ok({ file: uploaded }, 201);
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (
      errorMessage.includes("Selecione uma imagem") ||
      errorMessage.includes("excede o limite") ||
      errorMessage.includes("Envie uma imagem") ||
      errorMessage.includes("está vazio ou inválido")
    ) {
      return fail(errorMessage, 422);
    }

    return fail(`Falha ao enviar foto do perfil: ${errorMessage}`, 500);
  }
}
