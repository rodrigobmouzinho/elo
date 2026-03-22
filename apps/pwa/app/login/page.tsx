"use client";

import Image from "next/image";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { login } from "../../lib/auth-client";
import styles from "./page.module.css";

const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--login-font-display"
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--login-font-body"
});

type FeedbackTone = "danger" | "warning" | "success";

type FeedbackState = {
  title: string;
  description: string;
  tone: FeedbackTone;
};

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "N\u00e3o foi poss\u00edvel conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

const feedbackToneClassMap: Record<FeedbackTone, string> = {
  danger: styles.feedbackDanger,
  warning: styles.feedbackWarning,
  success: styles.feedbackSuccess
};

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
      const auth = await login(email, password);
      router.replace(auth.user.mustChangePassword ? "/primeiro-acesso" : "/");
    } catch (submitError) {
      setFeedback({
        title: "Falha ao entrar",
        description: normalizeApiError((submitError as Error).message),
        tone: "danger"
      });
    } finally {
      setLoading(false);
    }
  }

  function handleResetNavigation() {
    const normalizedEmail = email.trim();
    const destination = normalizedEmail
      ? `/recuperar-senha?email=${encodeURIComponent(normalizedEmail)}`
      : "/recuperar-senha";

    router.push(destination);
  }

  return (
    <main className={`${styles.page} ${displayFont.variable} ${bodyFont.variable}`}>
      <div className={styles.glowPrimary} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />

      <section className={styles.content}>
        <header className={styles.header}>
          <Image
            src="/brand/elo-wordmark.png"
            alt="Elo Networking"
            width={220}
            height={124}
            priority
            className={styles.brand}
          />

          <div className={styles.copy}>
            <h1 className={styles.headline}>{"Bem-vindo, Vision\u00e1rio"}</h1>
            <p className={styles.subtitle}>{"Conecte-se com o futuro dos neg\u00f3cios."}</p>
          </div>
        </header>

        <section className={styles.panelShell}>
          <div className={styles.panel}>
            {feedback ? (
              <div
                className={`${styles.feedback} ${feedbackToneClassMap[feedback.tone]}`}
                role={feedback.tone === "danger" ? "alert" : "status"}
                aria-live="polite"
              >
                <span className={styles.feedbackTitle}>{feedback.title}</span>
                <span className={styles.feedbackDescription}>{feedback.description}</span>
              </div>
            ) : null}

            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>E-mail do membro</span>
                <input
                  className={styles.input}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nome@dominio.com"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={loading}
                  required
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Senha</span>
                <input
                  className={styles.input}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                  type="password"
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
              </label>

              <button className={styles.submit} type="submit" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className={styles.footerActions}>
              <button className={styles.textAction} type="button" onClick={handleResetNavigation} disabled={loading}>
                Esqueceu a senha?
              </button>

              <div className={styles.divider} aria-hidden="true" />

              <p className={styles.signup}>
                <span>Novo no nexo?</span>
                <button
                  className={styles.signupLink}
                  type="button"
                  onClick={() => router.push("/solicitar-adesao")}
                >
                  {"Solicitar Ades\u00e3o"}
                </button>
              </p>
            </div>
          </div>
        </section>

        <footer className={styles.footerMark} aria-hidden="true">
          <span className={styles.footerLine} />
          <span className={styles.infinity}>{"\u221e"}</span>
          <span className={styles.footerLine} />
        </footer>
      </section>
    </main>
  );
}
