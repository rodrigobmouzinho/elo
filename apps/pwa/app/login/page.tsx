"use client";

import { Alert, Badge, Button, FeedCard, Input, LogoMark, LogoWordmark, SocialStatPill } from "@elo/ui";
import type { AlertVariant } from "@elo/ui";
import { ArrowRight, CalendarDays, Gem, UsersRound, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { login, requestPasswordReset } from "../../lib/auth-client";

type FeedbackState = {
  title: string;
  description: string;
  variant: AlertVariant;
};

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      await login(email, password);
      router.replace("/");
    } catch (submitError) {
      setFeedback({
        title: "Falha ao entrar",
        description: normalizeApiError((submitError as Error).message),
        variant: "danger"
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!email) {
      setFeedback({
        title: "E-mail obrigatório",
        description: "Informe o e-mail para recuperar sua senha.",
        variant: "warning"
      });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const result = await requestPasswordReset(email);
      setFeedback({
        title: "Solicitação enviada",
        description: result.message,
        variant: "success"
      });
    } catch (resetError) {
      setFeedback({
        title: "Falha ao solicitar reset",
        description: normalizeApiError((resetError as Error).message),
        variant: "danger"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "20px",
        background:
          "radial-gradient(70% 50% at 0% 0%, rgba(134, 90, 255, 0.22), transparent 48%), radial-gradient(45% 35% at 100% 0%, rgba(134, 90, 255, 0.14), transparent 56%), linear-gradient(180deg, #FAF8FF 0%, #EEF3FF 100%)"
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "1160px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.08fr) minmax(360px, 0.92fr)",
          gap: "18px",
          alignItems: "stretch"
        }}
      >
        <article
          style={{
            display: "grid",
            gap: "18px",
            padding: "24px",
            borderRadius: "30px",
            border: "1px solid rgba(134, 90, 255, 0.12)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.72)), radial-gradient(80% 80% at 0% 0%, rgba(134, 90, 255, 0.16), transparent 52%)",
            boxShadow: "0 24px 56px rgba(76, 59, 120, 0.12)",
            alignContent: "space-between"
          }}
        >
          <div style={{ display: "grid", gap: "18px" }}>
            <LogoWordmark size="md" />
            <div style={{ display: "grid", gap: "10px", maxWidth: "560px" }}>
              <Badge variant="brand" style={{ justifySelf: "start" }}>
                Feed de networking
              </Badge>
              <h1 style={{ margin: 0, fontSize: "clamp(2.2rem, 5vw, 4.2rem)", lineHeight: 0.95 }}>
                Entre para descobrir eventos, pessoas e oportunidades em um só fluxo.
              </h1>
              <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)", fontSize: "1rem", maxWidth: "48ch" }}>
                O app da Elo foi redesenhado como uma experiência social de descoberta: menos ruído, mais contexto e ações rápidas para gerar conexões reais.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <SocialStatPill label="eventos em destaque" value="Agenda viva" icon={<CalendarDays size={16} />} />
              <SocialStatPill label="membros para conhecer" value="Rede ativa" icon={<UsersRound size={16} />} />
              <SocialStatPill label="ranking em movimento" value="Pulso Elo" icon={<Gem size={16} />} />
            </div>
          </div>

          <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <FeedCard
              eyebrow={<Badge variant="info">Descobrir</Badge>}
              title="Encontre o próximo encontro certo"
              description="Eventos destacados com contexto de acesso, local e confirmação muito mais clara."
              footer={<span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".84rem" }}>Experiência editorial e transacional no mesmo lugar.</span>}
            />
            <FeedCard
              eyebrow={<Badge variant="success">Conectar</Badge>}
              title="Pessoas relevantes aparecem antes"
              description="O diretório agora funciona como uma vitrine social com atalhos de conexão e WhatsApp."
              footer={<span style={{ color: "var(--elo-text-tertiary, #6B7280)", fontSize: ".84rem" }}>Foco em velocidade para criar novos elos.</span>}
            />
          </div>
        </article>

        <article
          style={{
            display: "grid",
            gap: "18px",
            padding: "24px",
            borderRadius: "30px",
            border: "1px solid rgba(17, 17, 17, 0.08)",
            background: "rgba(255,255,255,0.96)",
            boxShadow: "0 18px 44px rgba(22, 24, 40, 0.12)",
            alignContent: "start"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <div style={{ display: "grid", gap: "8px" }}>
              <Badge variant="info" style={{ justifySelf: "start" }}>
                Conta de membro
              </Badge>
              <h2 style={{ margin: 0, fontSize: "clamp(1.7rem, 3vw, 2.4rem)", lineHeight: 0.96 }}>Entrar na sua conta</h2>
              <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)" }}>
                Use seu e-mail para continuar no ambiente da comunidade.
              </p>
            </div>
            <LogoMark size="md" />
          </div>

          {feedback ? (
            <Alert variant={feedback.variant} title={feedback.title}>
              {feedback.description}
            </Alert>
          ) : (
            <Alert variant="info" title="Acesso de membro">
              Seu login libera agenda, diretório, perfil, projetos e ranking com a nova experiência visual da Elo.
            </Alert>
          )}

          <form style={{ display: "grid", gap: "14px" }} onSubmit={handleSubmit}>
            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>E-mail</span>
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nome@dominio.com"
                type="email"
                autoComplete="email"
                required
              />
            </label>

            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>Senha</span>
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sua senha"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>

            <div style={{ display: "grid", gap: "10px", marginTop: "4px" }}>
              <Button type="submit" disabled={loading} size="lg">
                {loading ? "Entrando..." : "Entrar agora"}
                {loading ? null : <ArrowRight size={16} />}
              </Button>
              <Button type="button" variant="secondary" size="lg" onClick={handleReset} disabled={loading}>
                {loading ? "Processando..." : "Esqueci minha senha"}
              </Button>
            </div>
          </form>

          <div style={{ display: "grid", gap: "10px", paddingTop: "6px" }}>
            {[
              "Eventos e encontros exclusivos com confirmação mais clara.",
              "Diretório de membros com atalhos rápidos para criar elos.",
              "Ranking, histórico e presença da comunidade em leitura social."
            ].map((item) => (
              <div key={item} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span
                  style={{
                    width: "26px",
                    height: "26px",
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "999px",
                    background: "rgba(134, 90, 255, 0.12)",
                    color: "var(--elo-orbit, #865AFF)",
                    flexShrink: 0
                  }}
                >
                  <Zap size={13} />
                </span>
                <span style={{ color: "var(--elo-text-secondary, #374151)", fontSize: ".92rem" }}>{item}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
