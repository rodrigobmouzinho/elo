"use client";

import Image from "next/image";
import { MessageCircleMore, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { passthroughImageLoader } from "@elo/ui";
import { MemberShell } from "../../components/member-shell";
import { apiRequest, getStoredAuth } from "../../lib/auth-client";
import styles from "./page.module.css";

type Member = {
  id: string;
  fullName: string;
  city: string;
  state: string;
  area: string;
  specialty?: string;
  whatsapp: string;
  avatarUrl?: string;
};

type FeedbackTone = "danger" | "info" | "success";

type FeedbackState = {
  title: string;
  description: string;
  tone: FeedbackTone;
};

type ConnectionState = "created" | "existing";

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Nao foi possivel conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function toWhatsappUrl(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;

  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  if (normalized.length < 12 || normalized.length > 13) return null;

  return `https://wa.me/${normalized}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function memberSearchIndex(member: Member) {
  return normalizeSearchValue([member.fullName, member.area, member.specialty ?? "", member.city, member.state].join(" "));
}

function buttonLabelFor(memberId: string, currentMemberId: string | null, loadingId: string | null, state?: ConnectionState) {
  if (memberId === currentMemberId) return "Seu perfil";
  if (loadingId === memberId) return "Criando...";
  if (state === "created") return "Elo criado";
  if (state === "existing") return "Seguindo";
  return "Elo";
}

export default function MembrosPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [connectionStateById, setConnectionStateById] = useState<Record<string, ConnectionState>>({});

  useEffect(() => {
    const auth = getStoredAuth();
    setCurrentMemberId(auth?.user.memberId ?? null);
  }, []);

  useEffect(() => {
    async function loadMembers() {
      setLoadingMembers(true);

      try {
        const response = await apiRequest<Member[]>("/app/members");
        setMembers(response);
      } catch (requestError) {
        setFeedback({
          title: "Falha ao carregar diretorio",
          description: normalizeApiError((requestError as Error).message),
          tone: "danger"
        });
      } finally {
        setLoadingMembers(false);
      }
    }

    void loadMembers();
  }, []);

  const quickFilters = useMemo(() => {
    const frequencyByArea = members.reduce<Record<string, number>>((accumulator, member) => {
      const key = member.area.trim() || "Sem area";
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});

    return [
      "Todos",
      ...Object.entries(frequencyByArea)
        .sort((first, second) => second[1] - first[1])
        .slice(0, 4)
        .map(([area]) => area)
    ];
  }, [members]);

  useEffect(() => {
    if (!quickFilters.includes(activeFilter)) {
      setActiveFilter("Todos");
    }
  }, [activeFilter, quickFilters]);

  const filteredMembers = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(search.trim());

    return members.filter((member) => {
      const matchesFilter = activeFilter === "Todos" || (member.area.trim() || "Sem area") === activeFilter;
      const matchesSearch = normalizedSearch === "" || memberSearchIndex(member).includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, members, search]);

  const visibleMembers = useMemo(
    () => filteredMembers.filter((member) => member.id !== currentMemberId),
    [currentMemberId, filteredMembers]
  );

  const insightMembers = useMemo(() => visibleMembers.slice(0, 3), [visibleMembers]);

  const insightArea = useMemo(() => {
    if (activeFilter !== "Todos") return activeFilter;

    const topArea = quickFilters.find((entry) => entry !== "Todos");
    return topArea ?? "Networking";
  }, [activeFilter, quickFilters]);

  async function createElo(memberId: string) {
    const targetMember = members.find((member) => member.id === memberId);

    setLoadingId(memberId);
    setFeedback(null);

    try {
      const result = await apiRequest<{ message: string; created: boolean }>(`/app/members/${memberId}/elo`, {
        method: "POST",
        body: JSON.stringify({})
      });

      setConnectionStateById((previous) => ({
        ...previous,
        [memberId]: result.created ? "created" : "existing"
      }));

      setFeedback({
        title: result.created ? "Elo criado com sucesso" : "Elo ja existente",
        description: result.created
          ? `${targetMember?.fullName ?? "Este membro"} agora faz parte da sua rede de conexoes.`
          : `Voce ja possui conexao com ${targetMember?.fullName ?? "este membro"}.`,
        tone: result.created ? "success" : "info"
      });
    } catch (actionError) {
      setFeedback({
        title: "Falha ao criar elo",
        description: normalizeApiError((actionError as Error).message),
        tone: "danger"
      });
    } finally {
      setLoadingId(null);
    }
  }

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

        <section className={styles.hero}>
          <h2 className={styles.title}>Forme Elos</h2>
          <p className={styles.description}>Conecte-se com a comunidade e transforme descoberta em relacionamento.</p>
        </section>

        <section className={styles.controls}>
          <label className={styles.searchField}>
            <Search size={18} strokeWidth={2.1} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar por nome ou especialidade..."
              type="search"
            />
          </label>

          <div className={styles.filters} aria-label="Filtros rapidos por area">
            {quickFilters.map((filter) => {
              const active = filter === activeFilter;

              return (
                <button
                  key={filter}
                  className={`${styles.filterChip} ${active ? styles.filterChipActive : ""}`}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </section>

        {loadingMembers ? (
          <section className={styles.statusCard} aria-live="polite">
            <h2 className={styles.statusTitle}>Atualizando diretorio</h2>
            <p className={styles.statusText}>Carregando membros ativos para voce formar novos elos.</p>
          </section>
        ) : null}

        {!loadingMembers && filteredMembers.length === 0 ? (
          <section className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>Nenhum membro encontrado</h3>
            <p className={styles.emptyText}>Ajuste sua busca ou troque o filtro para ampliar as conexoes disponiveis.</p>
          </section>
        ) : null}

        <section className={styles.membersList}>
          {filteredMembers.map((member, index) => {
            const whatsappUrl = toWhatsappUrl(member.whatsapp);
            const isSelf = member.id === currentMemberId;
            const connectionState = connectionStateById[member.id];
            const highlightMember = !isSelf && index === 0;
            const disableConnectAction = isSelf || loadingId === member.id || connectionState === "created" || connectionState === "existing";

            return (
              <article key={member.id} className={`${styles.memberCard} ${highlightMember ? styles.memberCardFeatured : ""}`}>
                <div className={styles.memberIdentity}>
                  <div className={styles.avatarWrap}>
                    {member.avatarUrl ? (
                      <Image
                        loader={passthroughImageLoader}
                        unoptimized
                        src={member.avatarUrl}
                        alt={member.fullName}
                        width={56}
                        height={56}
                        className={styles.avatar}
                      />
                    ) : (
                      <div className={styles.avatarFallback}>{initials(member.fullName)}</div>
                    )}
                  </div>

                  <div className={styles.memberMeta}>
                    <div className={styles.nameRow}>
                      <h3 className={styles.memberName}>{member.fullName}</h3>
                      {highlightMember ? <ShieldCheck size={14} strokeWidth={2.1} className={styles.verifiedIcon} /> : null}
                    </div>

                    <div className={styles.memberTags}>
                      <span className={styles.areaBadge}>{member.area || "Sem area"}</span>
                      <span className={styles.specialty}>{member.specialty || `${member.city}/${member.state}`}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.memberActions}>
                  {whatsappUrl ? (
                    <a href={whatsappUrl} target="_blank" rel="noreferrer" className={styles.chatButton} aria-label={`Chamar ${member.fullName} no WhatsApp`}>
                      <MessageCircleMore size={17} strokeWidth={2.1} />
                    </a>
                  ) : (
                    <span className={`${styles.chatButton} ${styles.chatButtonMuted}`} aria-hidden="true">
                      <MessageCircleMore size={17} strokeWidth={2.1} />
                    </span>
                  )}

                  <button
                    className={`${styles.eloButton} ${connectionState ? styles.eloButtonActive : ""}`}
                    type="button"
                    onClick={() => void createElo(member.id)}
                    disabled={disableConnectAction}
                  >
                    {buttonLabelFor(member.id, currentMemberId, loadingId, connectionState)}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <section className={styles.insightsCard}>
          <div className={styles.insightAura} aria-hidden="true" />
          <p className={styles.insightEyebrow}>Insights de Membros</p>
          <h3 className={styles.insightTitle}>
            Voce tem <span>{visibleMembers.length}</span> novas conexoes potenciais em {insightArea} hoje.
          </h3>
          <div className={styles.insightFaces}>
            {insightMembers.map((member) =>
              member.avatarUrl ? (
                <Image
                  key={member.id}
                  loader={passthroughImageLoader}
                  unoptimized
                  src={member.avatarUrl}
                  alt={member.fullName}
                  width={32}
                  height={32}
                  className={styles.insightAvatar}
                />
              ) : (
                <div key={member.id} className={styles.insightAvatarFallback}>
                  {initials(member.fullName)}
                </div>
              )
            )}

            {visibleMembers.length > insightMembers.length ? (
              <div className={styles.insightMore}>+{visibleMembers.length - insightMembers.length}</div>
            ) : null}
          </div>
          <div className={styles.insightTag}>
            <Sparkles size={14} strokeWidth={2.1} />
            Direcao editorial do seu networking
          </div>
        </section>
      </div>
    </MemberShell>
  );
}
