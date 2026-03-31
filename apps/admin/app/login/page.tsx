"use client";

import type { AlertVariant } from "@elo/ui";
import { Alert } from "@elo/ui";
import { Eye, EyeOff, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { login, requestPasswordReset } from "../../lib/auth-client";
import styles from "./page.module.css";

type AuthFeedback = {
  title: string;
  description: string;
  variant: AlertVariant;
};

const metrics = [
  {
    icon: <Workflow size={18} />,
    value: "99,9%",
    label: "Uptime da rede"
  },
  {
    icon: <ShieldCheck size={18} />,
    value: "AES-256",
    label: "Criptografia"
  },
  {
    icon: <Sparkles size={18} />,
    value: "24/7",
    label: "Monitoramento"
  }
];

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
  const [showPassword, setShowPassword] = useState(false);

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
        title: "Falha ao entrar",
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
        description: "Informe o e-mail administrativo para enviar a redefinição de senha.",
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
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.logoWrap}>
            <Image src="/brand/elo-wordmark.png" alt="Elo Networking" width={160} height={48} priority />
          </div>

          <nav className={styles.topnav} aria-label="Links institucionais">
            <span className={styles.topnavCurrent}>Acesso</span>
            <a className={styles.topnavLink} href="mailto:suporte@elonetworking.com">
              Suporte
            </a>
          </nav>
        </div>
      </header>

      <section className={styles.shell}>
        <article className={styles.heroPanel}>
          <div className={styles.heroGlowPrimary} />
          <div className={styles.heroGlowSecondary} />
          <div className={styles.heroOrbit} aria-hidden="true" />

          <div className={styles.heroContent}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              <span>Central de comando</span>
            </div>

            <div className={styles.heroCopy}>
              <h1 className={styles.heroTitle}>
                O futuro do <span>networking</span> gerenciado com precisão.
              </h1>
              <p className={styles.heroText}>
                Monitore conexões, gerencie acessos e acompanhe o ritmo operacional da Elo em um painel administrativo
                desenhado para leitura executiva.
              </p>
            </div>

            <div className={styles.metricsGrid}>
              {metrics.map((item) => (
                <div key={item.label} className={styles.metricCard}>
                  <span className={styles.metricIcon}>{item.icon}</span>
                  <strong className={styles.metricValue}>{item.value}</strong>
                  <span className={styles.metricLabel}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className={styles.formPanel}>
          <div className={styles.formIntro}>
            <h2 className={styles.formTitle}>Acesso administrativo</h2>
            <p className={styles.formText}>Entre com suas credenciais para gerenciar a comunidade Elo.</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field}>
              <span className={styles.label}>E-mail do usuário</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={styles.input}
                placeholder="nome@elo.com"
                type="email"
                autoComplete="email"
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldHeader}>
                <span className={styles.label}>Senha</span>
                <button
                  type="button"
                  className={styles.inlineAction}
                  onClick={handleReset}
                  disabled={isLoading}
                >
                  {busyAction === "reset" ? "Enviando..." : "Esqueci minha senha"}
                </button>
              </span>

              <span className={styles.passwordField}>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={styles.input}
                  placeholder="Digite sua senha"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            <button type="submit" className={styles.primaryButton} disabled={isLoading}>
              {busyAction === "login" ? "Entrando..." : "Entrar no painel"}
            </button>
          </form>

          <div className={styles.securityLine}>
            <span className={styles.rule} />
            <span className={styles.securityLabel}>Elo Security</span>
            <span className={styles.rule} />
          </div>

          {feedback ? (
            <Alert variant={feedback.variant} title={feedback.title}>
              {feedback.description}
            </Alert>
          ) : (
            <p className={styles.securityText}>
              Este sistema é monitorado. Acessos não autorizados estão sujeitos a auditoria interna e penalidades
              legais.
            </p>
          )}
        </article>
      </section>

      <footer className={styles.footer}>
        <Link href="/login" className={styles.footerLink}>
          Política de privacidade
        </Link>
        <Link href="/login" className={styles.footerLink}>
          Termos de serviço
        </Link>
        <a className={styles.footerLink} href="mailto:suporte@elonetworking.com">
          Suporte
        </a>
        <span className={styles.footerCopy}>© 2026 Elo Networking. Todos os direitos reservados.</span>
      </footer>
    </main>
  );
}
