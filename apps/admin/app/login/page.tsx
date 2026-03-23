"use client";

import type { AlertVariant } from "@elo/ui";
import { Alert, Badge, Button, Input, LogoMark, LogoWordmark } from "@elo/ui";
import { ArrowRight, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { login, requestPasswordReset } from "../../lib/auth-client";

type AuthFeedback = {
  title: string;
  description: string;
  variant: AlertVariant;
};

function mapAuthErrorMessage(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
  }

  if (normalized.includes("invalid") || normalized.includes("credenciais") || normalized.includes("login")) {
    return "E-mail ou senha inválidos. Verifique os dados e tente novamente.";
  }

  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busyAction, setBusyAction] = useState<"login" | "reset" | null>(null);
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);

  const isLoading = busyAction !== null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("login");
    setFeedback(null);

    try {
      await login(email, password);
      setFeedback({
        title: "Acesso autorizado",
        description: "Redirecionando para o painel administrativo...",
        variant: "success"
      });
      router.replace("/");
    } catch (submitError) {
      setFeedback({
        title: "Falha na autenticação",
        description: mapAuthErrorMessage((submitError as Error).message),
        variant: "danger"
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReset() {
    if (!email) {
      setFeedback({
        title: "E-mail obrigatório",
        description: "Informe o e-mail administrativo para enviar o reset de senha.",
        variant: "warning"
      });
      return;
    }

    setBusyAction("reset");
    setFeedback(null);

    try {
      const result = await requestPasswordReset(email);
      setFeedback({
        title: "Solicitação recebida",
        description: result.message,
        variant: "success"
      });
    } catch (resetError) {
      setFeedback({
        title: "Falha ao enviar reset",
        description: mapAuthErrorMessage((resetError as Error).message),
        variant: "danger"
      });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "radial-gradient(80% 60% at 0% 0%, rgba(134, 90, 255, 0.18), transparent 48%), radial-gradient(40% 30% at 100% 0%, rgba(134, 90, 255, 0.12), transparent 56%), linear-gradient(180deg, #101118 0%, #171A24 100%)"
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "1180px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(380px, 0.86fr)",
          gap: "18px",
          alignItems: "stretch"
        }}
      >
        <article
          style={{
            display: "grid",
            gap: "20px",
            padding: "28px",
            borderRadius: "28px",
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03)), linear-gradient(145deg, rgba(134, 90, 255, 0.14), rgba(17, 18, 26, 0.86) 44%, rgba(14, 16, 24, 0.96) 100%)",
            boxShadow: "0 24px 70px rgba(0, 0, 0, 0.34)",
            color: "#FFFFFF",
            alignContent: "space-between"
          }}
        >
          <div style={{ display: "grid", gap: "18px" }}>
            <LogoWordmark size="md" />
            <div style={{ display: "grid", gap: "12px", maxWidth: "560px" }}>
              <Badge variant="brand" style={{ justifySelf: "start" }}>
                Espaço administrativo
              </Badge>
              <h1 style={{ margin: 0, fontSize: "clamp(2.4rem, 5vw, 4.4rem)", lineHeight: 0.95 }}>
                Decisão rápida para operação, receita e comunidade.
              </h1>
              <p style={{ margin: 0, fontSize: "1.02rem", color: "rgba(255,255,255,0.72)", maxWidth: "52ch" }}>
                O painel administrativo da Elo foi redesenhado para leitura executiva: densidade certa, próximas ações em foco e menos ruído visual nas rotinas críticas.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            {[
              {
                icon: <ShieldCheck size={18} />,
                title: "Acesso protegido",
                description: "Entradas administrativas com feedback claro para login e recuperação."
              },
              {
                icon: <Workflow size={18} />,
                title: "Centro de decisão",
                description: "Membros, eventos, financeiro e gamificação sob a mesma linguagem operacional."
              },
              {
                icon: <Sparkles size={18} />,
                title: "Marca mais precisa",
                description: "Wordmark real da Elo e superfícies com identidade mais forte e contemporânea."
              }
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  display: "grid",
                  gap: "10px",
                  padding: "16px",
                  borderRadius: "20px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.05)"
                }}
              >
                <span
                  style={{
                    width: "36px",
                    height: "36px",
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "999px",
                    background: "rgba(134, 90, 255, 0.18)",
                    color: "#FFFFFF"
                  }}
                >
                  {item.icon}
                </span>
                <strong>{item.title}</strong>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.66)", fontSize: ".92rem" }}>{item.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article
          style={{
            display: "grid",
            gap: "18px",
            padding: "28px",
            borderRadius: "28px",
            border: "1px solid rgba(17, 17, 17, 0.08)",
            background: "rgba(255,255,255,0.96)",
            boxShadow: "0 24px 60px rgba(5, 7, 16, 0.22)",
            alignContent: "start"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <div style={{ display: "grid", gap: "8px" }}>
              <Badge variant="info" style={{ justifySelf: "start" }}>
                Acesso administrativo
              </Badge>
              <h2 style={{ margin: 0, fontSize: "clamp(1.8rem, 3vw, 2.5rem)", lineHeight: 0.96 }}>
                Entrar no centro de controle
              </h2>
              <p style={{ margin: 0, color: "var(--elo-text-secondary, #374151)", maxWidth: "34ch" }}>
                Use o seu e-mail administrativo para abrir o painel de controle da comunidade.
              </p>
            </div>
            <LogoMark size="md" />
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontWeight: 700, color: "var(--elo-text-secondary, #374151)" }}>E-mail</span>
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@elonetworking.com"
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
                placeholder="Digite sua senha"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>

            <div style={{ display: "grid", gap: "10px", marginTop: "4px" }}>
              <Button type="submit" disabled={isLoading} size="lg">
                {busyAction === "login" ? "Autenticando..." : "Entrar no painel"}
                {busyAction === "login" ? null : <ArrowRight size={16} />}
              </Button>
              <Button type="button" variant="secondary" size="lg" disabled={isLoading} onClick={handleReset}>
                {busyAction === "reset" ? "Enviando reset..." : "Enviar reset de senha"}
              </Button>
            </div>
          </form>

          {feedback ? (
            <Alert variant={feedback.variant} title={feedback.title}>
              {feedback.description}
            </Alert>
          ) : (
            <Alert variant="info" title="Boas práticas de acesso">
              Use credenciais de administrador, evite ambientes compartilhados e revise o reset apenas no e-mail corporativo autorizado.
            </Alert>
          )}
        </article>
      </section>
    </main>
  );
}
