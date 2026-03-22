"use client";

import Image from "next/image";
import { CircleCheckBig, Clock3, Copy, ExternalLink, MapPin, Video } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { passthroughImageLoader } from "@elo/ui";
import { MemberShell } from "../../../components/member-shell";
import { apiRequest } from "../../../lib/auth-client";
import styles from "./page.module.css";

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

type FeedbackTone = "danger" | "info" | "success" | "warning";

type FeedbackState = {
  title: string;
  description: string;
  tone: FeedbackTone;
};

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20;

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Nao foi possivel conectar ao servidor. Tente novamente em instantes.";
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

function getEventTimingState(startsAt: string) {
  const startsAtMs = new Date(startsAt).getTime();
  const now = Date.now();

  if (startsAtMs > now) {
    return { label: "Summit 2026", detail: "Ao vivo em breve" };
  }

  const sixHoursMs = 6 * 60 * 60 * 1000;
  if (now - startsAtMs <= sixHoursMs) {
    return { label: "Ao vivo agora", detail: "Evento em andamento" };
  }

  return { label: "Edicao concluida", detail: "Evento encerrado" };
}

function statusLabel(status: CheckoutStatusResponse | null, isPaid: boolean, statusUnavailable: boolean) {
  if (statusUnavailable) return "Status temporariamente indisponivel";
  if (!status) return isPaid ? "Pagamento ainda nao iniciado" : "Aguardando sua confirmacao";
  if (status.presenceConfirmed) return "Presenca confirmada";
  if (status.paymentStatus === "pending") return "Pagamento pendente";
  if (status.paymentStatus === "paid") return "Pagamento aprovado";
  if (status.paymentStatus === "expired") return "Pagamento expirado";
  if (status.paymentStatus === "refunded") return "Pagamento estornado";
  return isPaid ? "Pagamento ainda nao iniciado" : "Aguardando sua confirmacao";
}

function formatManualPaymentMessage(eventTitle: string, checkout: CheckoutResponse) {
  if (!checkout.manualPayment) {
    return `Pagamento manual iniciado para ${eventTitle}. Envie o comprovante para aprovacao.`;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatTimeWindow(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(new Date(value));
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
  const attendeeTokens = useMemo(() => {
    if (!eventItem) return [];

    const gallery = eventItem.galleryImageUrls ?? [];
    return gallery.slice(0, 4).map((imageUrl, index) => ({
      id: `${eventItem.id}-attendee-${index}`,
      imageUrl,
      initials: `${index + 1}`
    }));
  }, [eventItem]);

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
        title: "Evento invalido",
        description: "Nao foi possivel identificar o evento solicitado.",
        tone: "danger"
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
          title: "Evento nao encontrado",
          description: "Este evento nao esta mais disponivel na agenda.",
          tone: "danger"
        });
        return;
      }

      setEventItem(targetEvent);
      await loadCheckoutStatus();
    } catch (requestError) {
      setFeedback({
        title: "Falha ao carregar detalhe do evento",
        description: normalizeApiError((requestError as Error).message),
        tone: "danger"
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
      description: `Aguardando confirmacao de pagamento para ${eventItem.title}.`,
      tone: "info"
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
            description: `Presenca validada automaticamente para ${eventItem.title}.`,
            tone: "success"
          });
          return;
        }

        if (status.paymentStatus === "expired") {
          setPolling(false);
          setFeedback({
            title: "Pagamento expirado",
            description: "Seu checkout expirou. Gere um novo pagamento para confirmar presenca.",
            tone: "danger"
          });
          return;
        }

        if (status.paymentStatus === "refunded") {
          setPolling(false);
          setFeedback({
            title: "Pagamento estornado",
            description: "Este pagamento foi estornado. Gere um novo checkout se necessario.",
            tone: "warning"
          });
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      if (pollTokenRef.current !== token) return;

      setPolling(false);
      setFeedback({
        title: "Pagamento em processamento",
        description: "O checkout ainda esta pendente. Voce pode consultar novamente em instantes.",
        tone: "info"
      });
    } catch (pollError) {
      if (pollTokenRef.current !== token) return;

      setPolling(false);
      setFeedback({
        title: "Falha ao consultar checkout",
        description: normalizeApiError((pollError as Error).message),
        tone: "danger"
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
        title: "Presenca confirmada",
        description: `Sua presenca no evento ${eventItem.title} foi confirmada.`,
        tone: "success"
      });
    } catch (confirmError) {
      setFeedback({
        title: "Falha ao confirmar presenca",
        description: normalizeApiError((confirmError as Error).message),
        tone: "danger"
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
          title: "Pagamento ja confirmado",
          description: `Este evento ja esta pago para ${eventItem.title}.`,
          tone: "success"
        });
        return;
      }

      if (checkout.gateway === "manual_pix") {
        setFeedback({
          title: "Checkout PIX manual",
          description: formatManualPaymentMessage(eventItem.title, checkout),
          tone: "warning"
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
        tone: "danger"
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
        title: "Codigo PIX copiado",
        description: "Cole o codigo no app do banco para concluir o pagamento.",
        tone: "success"
      });
    } catch (clipboardError) {
      setCopiedPixCode(false);
      setFeedback({
        title: "Falha ao copiar codigo PIX",
        description: normalizeApiError((clipboardError as Error).message),
        tone: "danger"
      });
    }
  }

  if (loadingEvent) {
    return (
      <MemberShell>
        <section className={styles.statusCard}>
          <h2 className={styles.statusTitle}>Carregando evento</h2>
          <p className={styles.statusText}>Preparando detalhe e jornada de confirmacao.</p>
        </section>
      </MemberShell>
    );
  }

  if (!eventItem) {
    return (
      <MemberShell>
        <section className={`${styles.statusCard} ${styles.statusDanger}`}>
          <h2 className={styles.statusTitle}>Evento indisponivel</h2>
          <p className={styles.statusText}>Nao foi possivel carregar este evento. Retorne para a agenda e tente novamente.</p>
        </section>
        <div className={styles.backAction}>
          <Link href="/" className={styles.backLink}>
            Voltar para agenda
          </Link>
        </div>
      </MemberShell>
    );
  }

  const isPaid = eventItem.accessType !== "free_members" && Number(eventItem.priceCents ?? 0) > 0;
  const timingState = getEventTimingState(eventItem.startsAt);
  const currentStatusLabel = statusLabel(checkoutStatus, isPaid, checkoutStatusUnavailable);
  const presenceConfirmed = checkoutStatus?.presenceConfirmed ?? false;

  return (
    <MemberShell>
      <div className={styles.page}>
        {feedback ? (
          <section
            className={`${styles.statusCard} ${feedback.tone === "danger" ? styles.statusDanger : ""}`}
            role={feedback.tone === "danger" ? "alert" : "status"}
            aria-live="polite"
          >
            <h2 className={styles.statusTitle}>{feedback.title}</h2>
            <p className={styles.statusText}>{feedback.description}</p>
          </section>
        ) : null}

        <section className={styles.heroCard}>
          <div className={styles.heroMedia}>
            <Image
              loader={passthroughImageLoader}
              unoptimized
              fill
              priority
              sizes="100vw"
              src={eventItem.heroImageUrl ?? "/event-placeholder.svg"}
              alt={`Imagem do evento ${eventItem.title}`}
              className={styles.heroImage}
            />
            <div className={styles.heroOverlay} aria-hidden="true" />
          </div>

          <div className={styles.heroContent}>
            <span className={styles.heroBadge}>{timingState.label}</span>
            <h1 className={styles.heroTitle}>{eventItem.title}</h1>

            <div className={styles.infoGrid}>
              <article className={styles.infoCard}>
                <div className={styles.infoIcon}>
                  <Clock3 size={15} strokeWidth={2.1} />
                </div>
                <div className={styles.infoMeta}>
                  <p className={styles.infoLabel}>Date &amp; Hour</p>
                  <p className={styles.infoPrimary}>{formatDate(eventItem.startsAt)}</p>
                  <p className={styles.infoSecondary}>{formatTimeWindow(eventItem.startsAt)}</p>
                </div>
              </article>

              <article className={styles.infoCard}>
                <div className={styles.infoIcon}>
                  <MapPin size={15} strokeWidth={2.1} />
                </div>
                <div className={styles.infoMeta}>
                  <p className={styles.infoLabel}>Local</p>
                  <p className={styles.infoPrimary}>{eventItem.location}</p>
                  <p className={styles.infoSecondary}>
                    {eventItem.onlineUrl ? "Presencial e online" : "Experiencia presencial"}
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Sobre o Evento</h2>
          <p className={styles.sectionText}>{eventItem.summary}</p>
          {eventItem.onlineUrl ? (
            <a href={eventItem.onlineUrl} target="_blank" rel="noreferrer" className={styles.inlineLink}>
              <Video size={15} strokeWidth={2.1} />
              Abrir link do evento
              <ExternalLink size={14} strokeWidth={2.1} />
            </a>
          ) : null}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Quem vai?</h2>
            <span className={styles.sectionLink}>Ver Todos (250)</span>
          </div>

          <div className={styles.attendeeRow}>
            {attendeeTokens.map((attendee) =>
              attendee.imageUrl ? (
                <Image
                  key={attendee.id}
                  loader={passthroughImageLoader}
                  unoptimized
                  src={attendee.imageUrl}
                  alt="Participante do evento"
                  width={36}
                  height={36}
                  className={styles.attendeeAvatar}
                />
              ) : (
                <div key={attendee.id} className={styles.attendeeFallback}>
                  {attendee.initials}
                </div>
              )
            )}
            <div className={styles.attendeeMore}>+124</div>
          </div>
        </section>

        <section className={styles.actionCard}>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={isPaid ? () => void handlePaidCheckout() : () => void handleFreeConfirm()}
            disabled={loadingAction || polling || presenceConfirmed}
          >
            {isPaid
              ? loadingAction
                ? "Processando..."
                : polling
                  ? "Aguardando pagamento..."
                  : presenceConfirmed
                    ? "Pagamento confirmado"
                    : checkoutStatus?.paymentStatus === "pending"
                      ? "Consultar confirmacao"
                      : "Confirmar Presenca"
              : loadingAction
                ? "Confirmando..."
                : presenceConfirmed
                  ? "Presenca confirmada"
                  : "Confirmar Presenca"}
          </button>

          <p className={styles.actionMeta}>
            {isPaid
              ? `${formatCurrency(eventItem.priceCents ?? 0)} · status: ${currentStatusLabel}`
              : `Vagas limitadas disponiveis · ${currentStatusLabel}`}
          </p>

          <div className={styles.timelineList}>
            {[
              { label: "Evento lido", active: true },
              {
                label: isPaid ? "Checkout gerado" : "Confirmacao iniciada",
                active: Boolean(checkoutStatus?.paymentStatus && checkoutStatus.paymentStatus !== "none") || presenceConfirmed
              },
              {
                label: isPaid ? "Pagamento validado" : "Presenca confirmada",
                active: isPaid ? checkoutStatus?.paymentStatus === "paid" || presenceConfirmed : presenceConfirmed
              }
            ].map((step) => (
              <div key={step.label} className={styles.timelineRow}>
                <span className={`${styles.timelineIcon} ${step.active ? styles.timelineIconActive : ""}`}>
                  <CircleCheckBig size={12} strokeWidth={2.1} />
                </span>
                <span className={styles.timelineText}>{step.label}</span>
              </div>
            ))}
          </div>
        </section>

        {manualPaymentData ? (
          <section className={styles.pixCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Pagamento PIX</h2>
              <span className={styles.txid}>TXID: {manualPaymentData.txId}</span>
            </div>

            <div className={styles.pixQrWrap}>
              <Image
                loader={passthroughImageLoader}
                unoptimized
                src={manualPaymentData.pixQrCodeImage}
                alt="QR Code PIX para pagamento do evento"
                width={220}
                height={220}
                className={styles.pixQr}
              />
            </div>

            <p className={styles.pixAmount}>{formatCurrency(manualPaymentData.amountCents)}</p>
            <p className={styles.pixKey}>Chave PIX: {manualPaymentData.pixKey}</p>

            <div className={styles.pixCodeBox}>{manualPaymentData.pixCopyPaste}</div>

            <button className={styles.secondaryButton} type="button" onClick={() => void copyPixCode()}>
              <Copy size={14} strokeWidth={2.1} />
              {copiedPixCode ? "Codigo PIX copiado" : "Copiar codigo PIX"}
            </button>
          </section>
        ) : null}
      </div>
    </MemberShell>
  );
}
