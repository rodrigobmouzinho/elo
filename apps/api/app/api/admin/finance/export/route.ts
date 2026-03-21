import { requireAuth } from "../../../../../lib/auth";
import { fail } from "../../../../../lib/http";
import {
  getFinanceOverview,
  listMembershipFinanceRows,
  listPendingEventPayments
} from "../../../../../lib/repositories";

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

function csvEscape(value: string | number | null | undefined) {
  const raw = value === null || value === undefined ? "" : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function toCurrency(cents: number) {
  return (cents / 100).toFixed(2);
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const range = resolveDateRange(request);
    const overview = await getFinanceOverview(range);
    const memberships = await listMembershipFinanceRows();
    const pendingEventPayments = await listPendingEventPayments(200);

    const lines: string[] = [];
    const addRow = (columns: Array<string | number | null | undefined>) => {
      lines.push(columns.map((column) => csvEscape(column)).join(","));
    };

    addRow(["secao", "campo", "valor"]);
    addRow(["resumo", "period_start", range.startAt ?? ""]);
    addRow(["resumo", "period_end", range.endAt ?? ""]);
    addRow(["resumo", "membership_revenue_brl", toCurrency(overview.membershipRevenueCents)]);
    addRow(["resumo", "event_revenue_brl", toCurrency(overview.eventRevenueCents)]);
    addRow(["resumo", "pending_membership_payments", overview.pendingMembershipPayments]);
    addRow(["resumo", "pending_event_payments", overview.pendingEventPayments]);
    addRow(["resumo", "overdue_memberships", overview.overduePayments]);
    addRow(["", "", ""]);

    addRow([
      "anuidades",
      "membership_id",
      "member_id",
      "member_name",
      "membership_status",
      "expires_at",
      "latest_payment_status",
      "latest_payment_amount_brl"
    ]);
    for (const membership of memberships) {
      addRow([
        "anuidades",
        membership.membershipId,
        membership.memberId,
        membership.memberName,
        membership.status,
        membership.expiresAt,
        membership.latestPaymentStatus,
        toCurrency(membership.latestPaymentAmountCents)
      ]);
    }
    addRow(["", "", ""]);

    addRow([
      "eventos_pendentes",
      "payment_id",
      "event_id",
      "event_title",
      "member_id",
      "member_name",
      "status",
      "amount_brl",
      "created_at"
    ]);
    for (const payment of pendingEventPayments) {
      addRow([
        "eventos_pendentes",
        payment.paymentId,
        payment.eventId,
        payment.eventTitle,
        payment.memberId,
        payment.memberName,
        payment.status,
        toCurrency(payment.amountCents),
        payment.createdAt
      ]);
    }

    const now = new Date();
    const filename = `finance-dashboard-${now.toISOString().slice(0, 10)}.csv`;

    return new Response(`${lines.join("\n")}\n`, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    return fail(`Falha ao exportar dashboard financeiro: ${(error as Error).message}`, 500);
  }
}
