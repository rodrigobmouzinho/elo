"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { MemberShell } from "../../components/member-shell";
import { apiRequest } from "../../lib/auth-client";
import {
  normalizeApiError,
  type ProjectNotification,
  type ProjectNotificationsFeed
} from "../../lib/project-ideas";
import styles from "./page.module.css";

type FeedbackState = {
  title: string;
  description: string;
  tone: "danger" | "success";
};

function notificationLabel(type: ProjectNotification["type"]) {
  return type === "project_application_accepted" ? "Aprovação" : "Atualização privada";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function dispatchNotificationsRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("elo-notifications-updated"));
}

function isUnavailableInCurrentApi(error: unknown) {
  const message = normalizeApiError((error as Error).message);
  return message.includes("HTTP 405") || message.includes("HTTP 404");
}

export default function NotificacoesPage() {
  const router = useRouter();
  const [feed, setFeed] = useState<ProjectNotificationsFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  async function loadNotifications() {
    setLoading(true);

    try {
      const response = await apiRequest<ProjectNotificationsFeed>("/app/notifications");
      setFeed(response);
    } catch (requestError) {
      setFeedback({
        title: "Falha ao carregar notificações",
        description: isUnavailableInCurrentApi(requestError)
          ? "A nova caixa de notificações depende da versão mais recente do elo-api. Assim que ela for promovida, o sino passa a refletir as aprovações e recusas."
          : normalizeApiError((requestError as Error).message),
        tone: "danger"
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function markAsRead(notificationId: string, projectId?: string) {
    setMarkingId(notificationId);
    setFeedback(null);

    try {
      await apiRequest(`/app/notifications/${notificationId}/read`, {
        method: "POST"
      });

      dispatchNotificationsRefresh();
      await loadNotifications();

      if (projectId) {
        router.push(`/projetos/${projectId}`);
        return;
      }

      setFeedback({
        title: "Notificação atualizada",
        description: "A notificação foi marcada como lida.",
        tone: "success"
      });
    } catch (markError) {
      setFeedback({
        title: "Falha ao atualizar notificação",
        description: normalizeApiError((markError as Error).message),
        tone: "danger"
      });
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <MemberShell detailHeader={{ title: "Notificações", backHref: "/", showShareButton: false }}>
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
          <div className={styles.heroIcon}>
            <Bell size={18} strokeWidth={2.1} />
          </div>
          <div className={styles.heroCopy}>
            <h2 className={styles.heroTitle}>Sua caixa privada</h2>
            <p className={styles.heroText}>
              Atualizações sobre aprovações e recusas de projetos chegam aqui sem expor
              outros membros publicamente.
            </p>
          </div>
          <span className={styles.unreadBadge}>{feed?.unreadCount ?? 0} não lidas</span>
        </section>

        {loading ? (
          <section className={styles.statusCard} aria-live="polite">
            <h2 className={styles.statusTitle}>Carregando notificações</h2>
            <p className={styles.statusText}>Buscando as atualizações privadas do seu perfil.</p>
          </section>
        ) : null}

        {!loading && (feed?.items.length ?? 0) === 0 ? (
          <section className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>Nenhuma notificação por aqui</h2>
            <p className={styles.emptyText}>
              Quando houver resposta para candidaturas de projetos, ela aparecerá aqui.
            </p>
          </section>
        ) : null}

        <section className={styles.feedStack}>
          {(feed?.items ?? []).map((notification) => {
            const projectId =
              typeof notification.metadata?.projectId === "string"
                ? notification.metadata.projectId
                : undefined;
            const isUnread = notification.readAt === null;

            return (
              <article
                key={notification.id}
                className={`${styles.notificationCard} ${isUnread ? styles.notificationUnread : ""}`}
              >
                <div className={styles.notificationHeader}>
                  <span className={styles.notificationType}>
                    {notificationLabel(notification.type)}
                  </span>
                  <span className={styles.notificationDate}>
                    {formatDate(notification.createdAt)}
                  </span>
                </div>

                <h3 className={styles.notificationTitle}>{notification.title}</h3>
                <p className={styles.notificationBody}>{notification.body}</p>

                <div className={styles.notificationActions}>
                  {projectId ? (
                    <button
                      className={styles.primaryButton}
                      type="button"
                      onClick={() => void markAsRead(notification.id, projectId)}
                      disabled={markingId === notification.id}
                    >
                      {markingId === notification.id ? "Abrindo..." : "Abrir projeto"}
                      <ArrowUpRight size={16} strokeWidth={2.1} />
                    </button>
                  ) : null}

                  {isUnread ? (
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={() => void markAsRead(notification.id)}
                      disabled={markingId === notification.id}
                    >
                      Marcar como lida
                      <CheckCheck size={16} strokeWidth={2.1} />
                    </button>
                  ) : (
                    <span className={styles.readBadge}>Lida</span>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </MemberShell>
  );
}
