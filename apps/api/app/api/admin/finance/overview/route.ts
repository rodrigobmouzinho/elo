import { requireAuth } from "../../../../../lib/auth";
import { fail, ok } from "../../../../../lib/http";
import { getFinanceOverview } from "../../../../../lib/repositories";

const PERIOD_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "365d": 365
};

function resolveDateRange(request: Request) {
  const url = new URL(request.url);
  const period = url.searchParams.get("period");
  const startAtParam = url.searchParams.get("startAt");
  const endAtParam = url.searchParams.get("endAt");

  if (startAtParam || endAtParam) {
    return {
      startAt: startAtParam ?? undefined,
      endAt: endAtParam ?? undefined
    };
  }

  const days = period ? PERIOD_DAYS[period] : undefined;
  if (!days) {
    return {};
  }

  const endAt = new Date();
  const startAt = new Date(endAt.getTime() - days * 24 * 3600 * 1000);

  return {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString()
  };
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const overview = await getFinanceOverview(resolveDateRange(request));
    return ok(overview);
  } catch (error) {
    return fail(`Falha ao consultar financeiro: ${(error as Error).message}`, 500);
  }
}
