import { requireAuth } from "../../../../lib/auth";
import { fail, ok } from "../../../../lib/http";
import { listMembers } from "../../../../lib/repositories";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["member"]);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() ?? "";
    const members = await listMembers();
    const activeMembers = members.filter((member) => member.active);

    if (!search) {
      return ok(activeMembers);
    }

    const normalizedSearch = normalizeSearch(search);
    const filteredMembers = activeMembers.filter((member) =>
      normalizeSearch(member.fullName).includes(normalizedSearch)
    );

    return ok(filteredMembers);
  } catch (error) {
    return fail(`Falha ao listar membros: ${(error as Error).message}`, 500);
  }
}
