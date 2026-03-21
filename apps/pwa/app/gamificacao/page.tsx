"use client";

import { Award, Crown, Medal, Rocket, Sparkles, TimerReset, TrendingUp, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MemberShell } from "../../components/member-shell";
import { apiRequest, getStoredAuth } from "../../lib/auth-client";
import styles from "./page.module.css";

type RankingEntry = {
  memberId: string;
  name: string;
  points: number;
  rank: number;
  medals: string[];
};

type SeasonChampionHistory = {
  seasonId: string;
  season: string;
  champion: string;
  classification: RankingEntry[];
};

type FeedbackTone = "danger" | "info";

type FeedbackState = {
  title: string;
  description: string;
  tone: FeedbackTone;
};

type AchievementCard = {
  title: string;
  description: string;
};

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "N\u00e3o foi poss\u00edvel conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatPoints(points: number) {
  return new Intl.NumberFormat("pt-BR").format(points);
}

function formatOrdinal(rank: number) {
  return `${rank}\u00ba`;
}

function buildAchievements(currentMemberRanking: RankingEntry | null, rankingLength: number): AchievementCard[] {
  if (!currentMemberRanking) {
    return [
      {
        title: "Temporada em Constru\u00e7\u00e3o",
        description: "Entre em eventos e intera\u00e7\u00f5es para destravar suas primeiras medalhas nesta temporada.",
      },
      {
        title: "Pontua\u00e7\u00e3o Inicial",
        description: "Seus primeiros pontos v\u00e3o aparecer aqui assim que a trilha competitiva come\u00e7ar.",
      },
      {
        title: "Rede em Movimento",
        description: "A partir do primeiro elo ativo, sua presen\u00e7a passa a gerar leitura social dentro do ranking.",
      }
    ];
  }

  const highlightMedal = currentMemberRanking.medals[0];

  return [
    {
      title:
        highlightMedal ??
        (currentMemberRanking.rank <= 3 ? "Vision\u00e1rio em Ascens\u00e3o" : "Ritmo Consistente"),
      description: highlightMedal
        ? "Seu desempenho nesta temporada j\u00e1 foi reconhecido com um selo vis\u00edvel de reputa\u00e7\u00e3o."
        : currentMemberRanking.rank <= 3
          ? "Sua posi\u00e7\u00e3o atual j\u00e1 coloca seu nome entre os protagonistas da temporada."
          : "A temporada mostra que sua presen\u00e7a j\u00e1 est\u00e1 acumulando valor competitivo na comunidade."
    },
    {
      title: currentMemberRanking.points > 0 ? `${formatPoints(currentMemberRanking.points)} pontos` : "Pontua\u00e7\u00e3o ativa",
      description: currentMemberRanking.points > 0 ? "Acumulados nesta temporada." : "Primeiros pontos chegando."
    },
    {
      title:
        currentMemberRanking.medals.length > 0
          ? `${currentMemberRanking.medals.length} medalha(s)`
          : `${formatOrdinal(currentMemberRanking.rank)} lugar`,
      description:
        currentMemberRanking.medals.length > 0
          ? "Reconhecimento social j\u00e1 liberado no ranking."
          : `Entre ${rankingLength.toLocaleString("pt-BR")} membros desta temporada.`
    }
  ];
}

function rankingDescriptor(entry: RankingEntry, isLeader: boolean) {
  if (entry.medals.length > 0) {
    return entry.medals[0];
  }

  if (isLeader) {
    return "Lideran\u00e7a da temporada";
  }

  if (entry.rank === 2) {
    return "Press\u00e3o no topo";
  }

  if (entry.rank === 3) {
    return "Fundador de momentum";
  }

  return "Em ascens\u00e3o";
}

export default function GamificacaoPage() {
  const [season, setSeason] = useState("-");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [champions, setChampions] = useState<SeasonChampionHistory[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    const auth = getStoredAuth();
    setMemberId(auth?.user.memberId ?? null);

    async function loadRanking() {
      setLoadingData(true);
      setFeedback(null);

      try {
        const data = await apiRequest<{
          season: string;
          ranking: RankingEntry[];
          champions: SeasonChampionHistory[];
        }>("/app/gamification/ranking");

        setSeason(data.season);
        setRanking(data.ranking);
        setChampions(data.champions ?? []);
      } catch (requestError) {
        setFeedback({
          title: "Falha ao carregar gamifica\u00e7\u00e3o",
          description: normalizeApiError((requestError as Error).message),
          tone: "danger"
        });
      } finally {
        setLoadingData(false);
      }
    }

    void loadRanking();
  }, []);

  const currentMemberRanking = useMemo(
    () => (memberId ? ranking.find((entry) => entry.memberId === memberId) ?? null : null),
    [memberId, ranking]
  );

  const topRanking = ranking.slice(0, 3);
  const achievements = useMemo(() => buildAchievements(currentMemberRanking, ranking.length), [currentMemberRanking, ranking.length]);
  const points = currentMemberRanking?.points ?? 0;
  const rankNarrative = currentMemberRanking
    ? `${formatOrdinal(currentMemberRanking.rank)} lugar entre ${ranking.length.toLocaleString("pt-BR")} membros`
    : ranking.length > 0
      ? "Ainda fora do ranking desta temporada"
      : "Temporada em aquecimento";
  const hallItems = champions.slice(0, 6);

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

        {loadingData ? (
          <section className={styles.statusCard} aria-live="polite">
            <h2 className={styles.statusTitle}>Atualizando a temporada</h2>
            <p className={styles.statusText}>Carregando pontua\u00e7\u00e3o, ranking e hist\u00f3rico do Hall da Fama.</p>
          </section>
        ) : null}

        <section className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroContent}>
            <span className={styles.heroEyebrow}>Posi\u00e7\u00e3o Atual</span>
            <div className={styles.heroPointsRow}>
              <h2 className={styles.heroPoints}>{formatPoints(points)}</h2>
              <span className={styles.heroPointsLabel}>PTS</span>
            </div>
            <p className={styles.heroRankLine}>
              <TrendingUp size={14} strokeWidth={2.1} />
              {rankNarrative}
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Conquistas</h3>
          <div className={styles.achievementsGrid}>
            <article className={styles.rareCard}>
              <div className={styles.rareCardGlow} aria-hidden="true" />
              <div className={styles.rareCardInner}>
                <div>
                  <span className={styles.rareEyebrow}>Conquista Rara</span>
                  <h4 className={styles.rareTitle}>{achievements[0].title}</h4>
                  <p className={styles.rareDescription}>{achievements[0].description}</p>
                </div>
                <div className={styles.rareIcon}>
                  <Rocket size={30} strokeWidth={2.1} />
                </div>
              </div>
            </article>

            <article className={styles.achievementCard}>
              <div className={`${styles.achievementIcon} ${styles.achievementIconPrimary}`}>
                <TimerReset size={24} strokeWidth={2.1} />
              </div>
              <div>
                <h4 className={styles.achievementTitle}>{achievements[1].title}</h4>
                <p className={styles.achievementCaption}>{achievements[1].description}</p>
              </div>
            </article>

            <article className={styles.achievementCard}>
              <div className={`${styles.achievementIcon} ${styles.achievementIconSecondary}`}>
                <Sparkles size={24} strokeWidth={2.1} />
              </div>
              <div>
                <h4 className={styles.achievementTitle}>{achievements[2].title}</h4>
                <p className={styles.achievementCaption}>{achievements[2].description}</p>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.rankingHeader}>
            <h3 className={styles.sectionTitle}>{"Principais Vision\u00e1rios"}</h3>
            <span className={styles.rankingSeason}>{season}</span>
          </div>

          {topRanking.length > 0 ? (
            <div className={styles.rankingList}>
              {topRanking.map((entry) => {
                const isLeader = entry.rank === 1;
                const isCurrentMember = entry.memberId === memberId;

                return (
                  <article
                    key={entry.memberId}
                    className={`${styles.rankRow} ${isCurrentMember ? styles.rankCurrent : ""} ${isLeader ? styles.rankLeader : ""}`}
                  >
                    <div className={isLeader ? styles.rankNumber : styles.rankMuted}>{entry.rank.toString().padStart(2, "0")}</div>

                    <div className={styles.rankAvatarWrap}>
                      <div className={styles.rankAvatar}>{initials(entry.name)}</div>
                      {isLeader ? (
                        <span className={styles.rankCrown} aria-hidden="true">
                          <Crown size={10} strokeWidth={2.4} />
                        </span>
                      ) : null}
                    </div>

                    <div className={styles.rankBody}>
                      <p className={styles.rankName}>{entry.name}</p>
                      <p className={styles.rankRole}>{rankingDescriptor(entry, isLeader)}</p>
                    </div>

                    <div className={styles.rankPoints}>
                      <p className={styles.rankPointsValue}>{formatPoints(entry.points)}</p>
                      <p className={styles.rankPointsLabel}>Pontos</p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <section className={styles.statusCard}>
              <h2 className={styles.statusTitle}>Ranking aguardando movimento</h2>
              <p className={styles.statusText}>Assim que os primeiros pontos entrarem, esta lista passa a mostrar o topo da temporada.</p>
            </section>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.hallHeader}>
            <h3 className={styles.sectionTitle}>Hall da Fama</h3>
            <span className={styles.hallLabel}>{"Hist\u00f3rico"}</span>
          </div>

          {hallItems.length > 0 ? (
            <div className={styles.hallRow}>
              {hallItems.map((seasonHistory, index) => (
                <article key={seasonHistory.seasonId} className={styles.hallCard}>
                  <div
                    className={`${styles.hallIcon} ${
                      index % 3 === 0 ? styles.hallIconPrimary : index % 3 === 1 ? styles.hallIconSecondary : styles.hallIconMuted
                    }`}
                  >
                    {index === 0 ? <Trophy size={20} strokeWidth={2.1} /> : index === 1 ? <Award size={20} strokeWidth={2.1} /> : <Medal size={20} strokeWidth={2.1} />}
                  </div>
                  <div>
                    <p className={styles.hallSeason}>{seasonHistory.season}</p>
                    <p className={styles.hallName}>{seasonHistory.champion}</p>
                  </div>
                  <div className={styles.hallBar}>
                    <div
                      className={`${styles.hallBarFill} ${
                        index % 3 === 0 ? styles.hallBarPrimary : index % 3 === 1 ? styles.hallBarSecondary : styles.hallBarMuted
                      }`}
                      style={{ width: "100%" }}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <section className={styles.statusCard}>
              <h2 className={styles.statusTitle}>{"Hall da Fama em forma\u00e7\u00e3o"}</h2>
              <p className={styles.statusText}>
                {"Quando as primeiras temporadas forem conclu\u00eddas, os campe\u00f5es aparecer\u00e3o aqui como mem\u00f3ria social da Elo."}
              </p>
            </section>
          )}
        </section>
      </div>
    </MemberShell>
  );
}
