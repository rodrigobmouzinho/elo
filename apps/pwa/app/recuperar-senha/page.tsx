"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, AtSign } from "lucide-react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { FormEvent, useEffect, useState } from "react";
import { requestPasswordReset } from "../../lib/auth-client";
import styles from "./page.module.css";

const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--reset-font-display"
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--reset-font-body"
});

type FeedbackTone = "danger" | "success";

type FeedbackState = {
  title: string;
  description: string;
  tone: FeedbackTone;
};

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

const feedbackToneClassMap: Record<FeedbackTone, string> = {
  danger: styles.feedbackDanger,
  success: styles.feedbackSuccess
};

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialEmail = params.get("email")?.trim() ?? "";
    if (!initialEmail) return;

    setEmail((current) => current || initialEmail);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const result = await requestPasswordReset(email.trim());

      setFeedback({
        title: "Solicitação enviada",
        description: result.message,
        tone: "success"
      });
    } catch (submitError) {
      setFeedback({
        title: "Falha ao recuperar senha",
        description: normalizeApiError((submitError as Error).message),
        tone: "danger"
      });
    } finally {
      setLoading(false);
    }
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
            width={180}
            height={102}
            priority
            className={styles.brand}
          />

          <div className={styles.copy}>
            <h1 className={styles.headline}>Recuperar Senha</h1>
            <p className={styles.subtitle}>
              Informe seu e-mail cadastrado para receber as instruções de recuperação.
            </p>
          </div>
        </header>

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

            <div className={styles.fieldShell}>
              <AtSign size={18} strokeWidth={2} className={styles.fieldIcon} aria-hidden="true" />

              <input
                className={styles.input}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nome@visionary.com"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                disabled={loading}
                required
              />
            </div>
          </label>

          <button className={styles.submit} type="submit" disabled={loading}>
            <span>{loading ? "Enviando..." : "Enviar instruções"}</span>
            <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </form>

        <Link href="/login" className={styles.backLink}>
          <ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />
          <span>Voltar ao login</span>
        </Link>
      </section>
    </main>
  );
}
