"use client";

import Image from "next/image";
import { Alert, Badge, Button, Card, passthroughImageLoader } from "@elo/ui";
import type { AlertVariant, BadgeVariant } from "@elo/ui";
import { CircleCheckBig, Clock3, Copy, ExternalLink, MapPin, Video } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MemberShell } from "../../../components/member-shell";
import { apiRequest } from "../../../lib/auth-client";

type EventItem = {
  id: string;
  title: string;
  summary: string;
  startsAt: string;
  location: string;
  onlineUrl?: string;
  accessType: "free_members" | "paid_members" | "public_with_member_discount";
  priceCents?: number;
  heroImageUrl?: string;
  galleryImageUrls?: string[];
};

type CheckoutResponse = {
  gateway: "manual_pix";
  checkoutUrl: string | null;
  pixQrCode: string | null;
  manualPayment: {
    pixKey: string;
    keyType: string | null;
    beneficiaryName: string | null;
    proofContact: string | null;
    instructions: string;
    txId: string;
    pixCopyPaste: string;
    pixQrCodeImage: string;
    amountCents: number;
    externalReference: string;
  } | null;
  amountCents: number;
  paymentStatus: "pending" | "paid" | "expired" | "refunded";
};

type CheckoutStatusResponse = {
  paymentStatus: "none" | "pending" | "paid" | "expired" | "refunded";
  presenceConfirmed: boolean;
};

type FeedbackState = {
  title: string;
  description: string;
  variant: AlertVariant;
};

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20;

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(cents / 100);
}

function getAccessLabel(accessType: EventItem["accessType"]) {
  if (accessType === "free_members") return "Gratuito para membros";
  if (accessType === "paid_members") return "Pago para membros";
  return "Público com desconto para membros";
}

function getAccessVariant(accessType: EventItem["accessType"]): BadgeVariant {
  if (accessType === "free_members") return "info";
  if (accessType === "paid_members") return "brand";
  return "warning";
}

function getEventTimingState(startsAt: string): { label: string; variant: BadgeVariant } {
  const startsAtMs = new Date(startsAt).getTime();
  const now = Date.now();

  if (startsAtMs > now) {
    return { label: "Programado", variant: "info" };
  }

  const sixHoursMs = 6 * 60 * 60 * 1000;
  if (now - startsAtMs <= sixHoursMs) {
    return { label: "Acontecendo", variant: "success" };
  }

  return { label: "Encerrado", variant: "neutral" };
}

function checkoutStatusBadge(
  status: CheckoutStatusResponse | null,
  isPaid: boolean,
  statusUnavailable: boolean
): { label: string; variant: BadgeVariant } {
  if (statusUnavailable) {
    return { label: "Status indisponível", variant: "neutral" };
  }

  if (!status) {
    return isPaid
      ? { label: "Sem checkout", variant: "neutral" }
      : { label: "Confirmação pendente", variant: "neutral" };
  }

  if (status.presenceConfirmed) {
    return { label: "Presença confirmada", variant: "success" };
  }

  if (status.paymentStatus === "pending") {
    return { label: "Pagamento pendente", variant: "warning" };
  }

  if (status.paymentStatus === "paid") {
    return { label: "Pagamento aprovado", variant: "success" };
  }

  if (status.paymentStatus === "expired") {
    return { label: "Pagamento expirado", variant: "danger" };
  }

  if (status.paymentStatus === "refunded") {
    return { label: "Pagamento estornado", variant: "danger" };
  }

  return isPaid
    ? { label: "Sem checkout", variant: "neutral" }
    : { label: "Confirmação pendente", variant: "neutral" };
}

function formatManualPaymentMessage(eventTitle: string, checkout: CheckoutResponse) {
  if (!checkout.manualPayment) {
    return `Pagamento manual iniciado para ${eventTitle}. Envie o comprovante para aprovação.`;
  }

  const keyType = checkout.manualPayment.keyType ? ` (${checkout.manualPayment.keyType})` : "";
  const beneficiary = checkout.manualPayment.beneficiaryName
    ? `Favorecido: ${checkout.manualPayment.beneficiaryName}. `
    : "";
  const proofContact = checkout.manualPayment.proofContact
    ? `Contato para comprovante: ${checkout.manualPayment.proofContact}. `
    : "";

  return [
    `PIX manual para ${eventTitle}.`,
    `Valor: ${formatCurrency(checkout.amountCents)}.`,
    `Chave${keyType}: ${checkout.manualPayment.pixKey}.`,
    beneficiary,
    proofContact,
    checkout.manualPayment.instructions
  ]
    .filter(Boolean)
    .join(" ");
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [eventItem, setEventItem] = useState<EventItem | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [polling, setPolling] = useState(false);
  const [manualPaymentData, setManualPaymentData] = useState<CheckoutResponse["manualPayment"]>(null);
  const [copiedPixCode, setCopiedPixCode] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatusResponse | null>(null);
  const [checkoutStatusUnavailable, setCheckoutStatusUnavailable] = useState(false);
  const pollTokenRef = useRef(0);

  const loadCheckoutStatus = useCallback(async () => {
    if (!eventId) return null;

    try {
      const status = await apiRequest<CheckoutStatusResponse>(`/app/events/${eventId}/checkout-status`);
      setCheckoutStatusUnavailable(false);
      setCheckoutStatus(status);
      return status;
    } catch {
      setCheckoutStatusUnavailable(true);
      return null;
    }
  }, [eventId]);

  const loadEventDetails = useCallback(async () => {
    if (!eventId) {
      setFeedback({
        title: "Evento inválido",
        description: "Não foi possível identificar o evento solicitado.",
        variant: "danger"
      });
      setLoadingEvent(false);
      return;
    }

    setLoadingEvent(true);

    try {
      const events = await apiRequest<EventItem[]>("/app/events");
      const targetEvent = events.find((event) => event.id === eventId) ?? null;

      if (!targetEvent) {
        setEventItem(null);
        setFeedback({
          title: "Evento não encontrado",
          description: "Este evento não está mais disponível na agenda.",
          variant: "danger"
        });
        return;
      }

      setEventItem(targetEvent);
      await loadCheckoutStatus();
    } catch (requestError) {
      setFeedback({
        title: "Falha ao carregar detalhe do evento",
        description: normalizeApiError((requestError as Error).message),
        variant: "danger"
      });
    } finally {
      setLoadingEvent(false);
    }
  }, [eventId, loadCheckoutStatus]);

  useEffect(() => {
    void loadEventDetails();
  }, [loadEventDetails]);

  useEffect(() => {
    return () => {
      pollTokenRef.current += 1;
    };
  }, []);

  async function pollCheckoutStatus() {
    if (!eventId || !eventItem) return;

    const token = pollTokenRef.current + 1;
    pollTokenRef.current = token;

    setPolling(true);
    setFeedback({
      title: "Checkout iniciado",
      description: `Aguardando confirmação de pagamento para ${eventItem.title}.`,
      variant: "info"
    });

    try {
      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
        const status = await apiRequest<CheckoutStatusResponse>(`/app/events/${eventId}/checkout-status`);

        if (pollTokenRef.current !== token) return;
        setCheckoutStatusUnavailable(false);
        setCheckoutStatus(status);

        if (status.paymentStatus === "paid" || status.presenceConfirmed) {
          setPolling(false);
          setFeedback({
            title: "Pagamento confirmado",
            description: `Presença validada automaticamente para ${eventItem.title}.`,
            variant: "success"
          });
          return;
        }

        if (status.paymentStatus === "expired") {
          setPolling(false);
          setFeedback({
            title: "Pagamento expirado",
            description: "Seu checkout expirou. Gere um novo pagamento para confirmar presença.",
            variant: "danger"
          });
          return;
        }

        if (status.paymentStatus === "refunded") {
          setPolling(false);
          setFeedback({
            title: "Pagamento estornado",
            description: "Este pagamento foi estornado. Gere um novo checkout se necessário.",
            variant: "warning"
          });
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      if (pollTokenRef.current !== token) return;

      setPolling(false);
      setFeedback({
        title: "Pagamento em processamento",
        description: "O checkout ainda está pendente. Você pode consultar novamente em instantes.",
        variant: "info"
      });
    } catch (pollError) {
      if (pollTokenRef.current !== token) return;

      setPolling(false);
      setFeedback({
        title: "Falha ao consultar checkout",
        description: normalizeApiError((pollError as Error).message),
        variant: "danger"
      });
      setCheckoutStatusUnavailable(true);
    }
  }

  async function handleFreeConfirm() {
    if (!eventItem || !eventId) return;

    setLoadingAction(true);
    setFeedback(null);

    try {
      await apiRequest(`/app/events/${eventId}/confirm`, {
        method: "POST",
        body: JSON.stringify({})
      });

      setCheckoutStatus((previous) => ({
        paymentStatus: previous?.paymentStatus ?? "none",
        presenceConfirmed: true
      }));

      setFeedback({
        title: "Presença confirmada",
        description: `Sua presença no evento ${eventItem.title} foi confirmada.`,
        variant: "success"
      });
    } catch (confirmError) {
      setFeedback({
        title: "Falha ao confirmar presença",
        description: normalizeApiError((confirmError as Error).message),
        variant: "danger"
      });
    } finally {
      setLoadingAction(false);
    }
  }

  async function handlePaidCheckout() {
    if (!eventItem || !eventId) return;

    setLoadingAction(true);
    setFeedback(null);
    setCopiedPixCode(false);

    try {
      const checkout = await apiRequest<CheckoutResponse>(`/app/events/${eventId}/checkout`, {
        method: "POST",
        body: JSON.stringify({})
      });

      if (checkout.paymentStatus === "paid") {
        await loadCheckoutStatus();
        setFeedback({
          title: "Pagamento já confirmado",
          description: `Este evento já está pago para ${eventItem.title}.`,
          variant: "success"
        });
        return;
      }

      if (checkout.gateway === "manual_pix") {
        setFeedback({
          title: "Checkout PIX manual",
          description: formatManualPaymentMessage(eventItem.title, checkout),
          variant: "warning"
        });
        setManualPaymentData(checkout.manualPayment);
      }

      setCheckoutStatus({
        paymentStatus: checkout.paymentStatus === "pending" ? "pending" : "none",
        presenceConfirmed: false
      });
      setCheckoutStatusUnavailable(false);

      void pollCheckoutStatus();
    } catch (checkoutError) {
      setFeedback({
        title: "Falha ao iniciar checkout",
        description: normalizeApiError((checkoutError as Error).message),
        variant: "danger"
      });
      setPolling(false);
    } finally {
      setLoadingAction(false);
    }
  }

  async function copyPixCode() {
    if (!manualPaymentData?.pixCopyPaste) return;

    try {
      await navigator.clipboard.writeText(manualPaymentData.pixCopyPaste);
      setCopiedPixCode(true);
      setFeedback({
        title: "Código PIX copiado",
        description: "Cole o código no app do banco para concluir o pagamento.",
        variant: "success"
      });
    } catch (clipboardError) {
      setCopiedPixCode(false);
      setFeedback({
        title: "Falha ao copiar código PIX",
        description: normalizeApiError((clipboardError as Error).message),
        variant: "danger"
      });
    }
  }

  if (loadingEvent) {
    return (
      <MemberShell>
        <Alert variant="info" title="Carregando evento">
          Preparando detalhe e jornada de confirmação.
        </Alert>
      </MemberShell>
    );
  }

  if (!eventItem) {
    return (
      <MemberShell>
        <Alert variant="danger" title="Evento indisponível">
          Não foi possível carregar este evento. Retorne para a agenda e tente novamente.
        </Alert>
        <div style={{ marginTop: "12px" }}>
          <Link href="/">
            <Button>Voltar para agenda</Button>
          </Link>
        </div>
      </MemberShell>
    );
  }

  const isPaid = eventItem.accessType !== "free_members" && Number(eventItem.priceCents ?? 0) > 0;
  const timingState = getEventTimingState(eventItem.startsAt);
  const statusBadge = checkoutStatusBadge(checkoutStatus, isPaid, checkoutStatusUnavailable);
  const presenceConfirmed = checkoutStatus?.presenceConfirmed ?? false;

  return (
    <MemberShell>
      <div style={{ display: "grid", gap: "18px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/">
            <Button variant="secondary" size="sm">Voltar para agenda</Button>
          </Link>
          <Badge variant="brand">Detalhe do evento</Badge>
        </div>

        {feedback ? (
          <Alert variant={feedback.variant} title={feedback.title}>
            {feedback.description}
          </Alert>
        ) : null}

        <section style={{ display: "grid", gap: "18px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <div style={{ display: "grid", gap: "14px" }}>
            <article
              style={{
                display: "grid",
                gap: "16px",
                padding: "20px",
                borderRadius: "30px",
                border: "1px solid rgba(134, 90, 255, 0.12)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.8)), radial-gradient(80% 80% at 0% 0%, rgba(134, 90, 255, 0.16), transparent 52%)",
                boxShadow: "0 18px 44px rgba(76, 59, 120, 0.12)"
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "300px",
                  borderRadius: "24px",
                  overflow: "hidden",
                  position: "relative"
                }}
              >
                <Image
                  loader={passthroughImageLoader}
                  unoptimized
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 52vw"
                  src={eventItem.heroImageUrl ?? "/event-placeholder.svg"}
                  alt={`Imagem do evento ${eventItem.title}`}
                  style={{ objectFit: "cover" }}
                />
              </div>

              <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Badge variant={timingState.variant}>{timingState.label}</Badge>
                  <Badge variant={getAccessVariant(eventItem.accessType)}>{getAccessLabel(eventItem.accessType)}</Badge>
                  <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                </div>
                <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 5vw, 3rem)", lineHeight: 0.96 }}>{eventItem.title}</h1>
                <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)" }}>{eventItem.summary}</p>
              </div>

              <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <div
                  style={{
                    display: "grid",
                    gap: "4px",
                    padding: "14px 16px",
                    borderRadius: "18px",
                    border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                    background: "rgba(255,255,255,0.72)"
                  }}
                >
                  <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".76rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Quando
                  </span>
                  <strong>{new Date(eventItem.startsAt).toLocaleString("pt-BR")}</strong>
                </div>
                <div
                  style={{
                    display: "grid",
                    gap: "4px",
                    padding: "14px 16px",
                    borderRadius: "18px",
                    border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                    background: "rgba(255,255,255,0.72)"
                  }}
                >
                  <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".76rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Onde
                  </span>
                  <strong>{eventItem.location}</strong>
                </div>
                <div
                  style={{
                    display: "grid",
                    gap: "4px",
                    padding: "14px 16px",
                    borderRadius: "18px",
                    border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                    background: "rgba(255,255,255,0.72)"
                  }}
                >
                  <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".76rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Formato
                  </span>
                  <strong>{eventItem.onlineUrl ? "Presencial + online" : "Presencial"}</strong>
                </div>
              </div>
            </article>

            {eventItem.galleryImageUrls && eventItem.galleryImageUrls.length > 0 ? (
              <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                {eventItem.galleryImageUrls.slice(0, 6).map((imageUrl, index) => (
                  <div
                    key={`${eventItem.id}-gallery-${index}`}
                    style={{ width: "100%", height: "90px", borderRadius: "16px", overflow: "hidden", position: "relative" }}
                  >
                    <Image
                      loader={passthroughImageLoader}
                      unoptimized
                      fill
                      sizes="120px"
                      src={imageUrl}
                      alt={`Galeria ${index + 1} - ${eventItem.title}`}
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <Card title="Sobre o encontro" subtitle="Tudo que você precisa para decidir e agir sem sair da página.">
              <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <Clock3 size={16} />
                  <span>{new Date(eventItem.startsAt).toLocaleString("pt-BR")}</span>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <MapPin size={16} />
                  <span>{eventItem.location}</span>
                </div>
                {eventItem.onlineUrl ? (
                  <a href={eventItem.onlineUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", gap: "8px", alignItems: "center", color: "var(--elo-orbit, #865AFF)", fontWeight: 700 }}>
                    <Video size={16} />
                    Abrir link do evento
                    <ExternalLink size={14} />
                  </a>
                ) : null}
              </div>
            </Card>
          </div>

          <div style={{ display: "grid", gap: "14px", alignContent: "start" }}>
            <Card
              title={isPaid ? "Reserve seu lugar" : "Confirmar presença"}
              subtitle={isPaid ? "Fluxo PIX manual com leitura de status na mesma tela." : "Evento gratuito para membros ativos."}
              tone="panel"
            >
              <div style={{ display: "grid", gap: "12px" }}>
                <div
                  style={{
                    display: "grid",
                    gap: "6px",
                    padding: "16px",
                    borderRadius: "18px",
                    border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                    background: "rgba(255,255,255,0.78)"
                  }}
                >
                  <span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".76rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Investimento
                  </span>
                  <strong style={{ fontFamily: "var(--elo-font-mono)", fontSize: "1.4rem" }}>
                    {isPaid ? formatCurrency(eventItem.priceCents ?? 0) : "Gratuito"}
                  </strong>
                  <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                    {isPaid
                      ? "Você gera o PIX, envia o comprovante e acompanha a validação sem sair desta tela."
                      : "Sua vaga é confirmada em um único passo, com status imediato."}
                  </span>
                </div>

                <div style={{ display: "grid", gap: "8px" }}>
                  {isPaid ? (
                    <>
                      <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>1. Gere o PIX manual.</span>
                      <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>2. Pague e envie o comprovante.</span>
                      <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>3. Aguarde a validação para confirmar a presença.</span>
                    </>
                  ) : (
                    <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                      Sua confirmação acontece em um único passo e o status fica visível imediatamente.
                    </span>
                  )}
                </div>

                {checkoutStatusUnavailable ? (
                  <Alert variant="warning" title="Status temporariamente indisponível">
                    A consulta do checkout oscilou agora. A jornada continua disponível, mas a confirmação pode levar alguns instantes para reaparecer.
                  </Alert>
                ) : null}

                <Badge variant={statusBadge.variant} style={{ justifySelf: "start" }}>
                  {statusBadge.label}
                </Badge>

                <Button
                  type="button"
                  onClick={isPaid ? () => void handlePaidCheckout() : () => void handleFreeConfirm()}
                  disabled={loadingAction || polling || presenceConfirmed}
                  size="lg"
                >
                  {isPaid
                    ? loadingAction
                      ? "Processando..."
                      : polling
                        ? "Aguardando pagamento..."
                        : presenceConfirmed
                          ? "Pagamento confirmado"
                          : checkoutStatus?.paymentStatus === "pending"
                            ? "Consultar confirmação"
                            : `Gerar PIX ${formatCurrency(eventItem.priceCents ?? 0)}`
                    : loadingAction
                      ? "Confirmando..."
                      : presenceConfirmed
                        ? "Presença confirmada"
                        : "Confirmar presença"}
                </Button>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                  <Badge variant={eventItem.onlineUrl ? "info" : "neutral"}>
                    {eventItem.onlineUrl ? "Link online disponível" : "Experiência presencial"}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card title="Linha do status" subtitle="Acompanhe como a jornada deste evento está evoluindo.">
              <div style={{ display: "grid", gap: "10px" }}>
                {[
                  {
                    label: "Evento lido",
                    active: true
                  },
                  {
                    label: isPaid ? "Checkout gerado" : "Presença iniciada",
                    active: Boolean(checkoutStatus?.paymentStatus && checkoutStatus.paymentStatus !== "none") || presenceConfirmed
                  },
                  {
                    label: isPaid ? "Pagamento validado" : "Presença confirmada",
                    active: isPaid ? checkoutStatus?.paymentStatus === "paid" || presenceConfirmed : presenceConfirmed
                  }
                ].map((step) => (
                  <div key={step.label} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span
                      style={{
                        width: "24px",
                        height: "24px",
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "999px",
                        background: step.active ? "rgba(22, 101, 52, 0.14)" : "rgba(17, 19, 24, 0.08)",
                        color: step.active ? "var(--elo-semantic-success, #166534)" : "var(--elo-text-tertiary, #6B7280)"
                      }}
                    >
                      <CircleCheckBig size={12} />
                    </span>
                    <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>{step.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Confiança da jornada" subtitle="Clareza operacional para evitar dúvida na hora de pagar ou confirmar.">
              <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                  Seu status fica visível nesta página o tempo todo, sem precisar voltar para a agenda.
                </div>
                <div style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>
                  Em eventos pagos, o fluxo deixa explícito quando o checkout foi gerado, quando o pagamento entrou e quando a presença foi validada.
                </div>
              </div>
            </Card>

            {manualPaymentData ? (
              <Card title="Pagamento PIX" subtitle={`TXID: ${manualPaymentData.txId}`}>
                <div style={{ display: "grid", gap: "12px", justifyItems: "center", textAlign: "center" }}>
                  <div
                    style={{
                      width: "220px",
                      maxWidth: "100%",
                      aspectRatio: "1 / 1",
                      borderRadius: "18px",
                      border: "1px solid var(--elo-border-soft, rgba(17, 17, 17, 0.06))",
                      overflow: "hidden",
                      position: "relative"
                    }}
                  >
                    <Image
                      loader={passthroughImageLoader}
                      unoptimized
                      fill
                      sizes="220px"
                      src={manualPaymentData.pixQrCodeImage}
                      alt="QR Code PIX para pagamento do evento"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <Badge variant="brand">{formatCurrency(manualPaymentData.amountCents)}</Badge>
                  <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".9rem" }}>Chave PIX: {manualPaymentData.pixKey}</span>
                  <div
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "16px",
                      background: "var(--elo-panel, #F4F6FF)",
                      color: "var(--elo-text-secondary, #374151)",
                      wordBreak: "break-all",
                      fontFamily: "var(--elo-font-mono)",
                      fontSize: ".82rem"
                    }}
                  >
                    {manualPaymentData.pixCopyPaste}
                  </div>
                  <Button type="button" variant="secondary" onClick={() => void copyPixCode()}>
                    <Copy size={14} />
                    {copiedPixCode ? "Código PIX copiado" : "Copiar código PIX"}
                  </Button>
                </div>
              </Card>
            ) : null}
          </div>
        </section>
      </div>
    </MemberShell>
  );
}
