"use client";

import type { AlertVariant } from "@elo/ui";
import { Alert } from "@elo/ui";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
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

function mapAuthErrorMessage(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
  }

  if (
    normalized.includes("invalid") ||
    normalized.includes("credenciais") ||
    normalized.includes("login")
  ) {
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
            <Image
              src="/brand/elo-mark.png"
              alt="Elo Networking"
              width={120}
              height={120}
              priority
            />
          </div>
        </div>
      </header>

      <section className={styles.shell}>
        <article className={styles.heroPanel}>
          <div className={styles.heroGlow} />
          <div className={styles.heroContent}>
            <div className={styles.heroSymbol} aria-hidden="true" />
          </div>
        </article>

        <article className={styles.formPanel}>
          <div className={styles.formIntro}>
            <h2 className={styles.formTitle}>Acesso administrativo</h2>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field}>
              <span className={styles.label}>E-mail</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={styles.input}
                placeholder="admin@elo.com"
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
                  placeholder="••••••••"
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
              {busyAction === "login" ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {feedback ? (
            <Alert variant={feedback.variant} title={feedback.title}>
              {feedback.description}
            </Alert>
          ) : null}
        </article>
      </section>

      <footer className={styles.footer}>
        <span className={styles.footerCopy}>© 2026 Elo Networking</span>
      </footer>
    </main>
  );
}
