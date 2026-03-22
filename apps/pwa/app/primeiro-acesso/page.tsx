"use client";

import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  clearStoredAuth,
  fetchMe,
  getStoredAuth,
  submitFirstAccessPassword
} from "../../lib/auth-client";
import styles from "./page.module.css";

const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--first-access-font-display"
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--first-access-font-body"
});

type FeedbackState = {
  title: string;
  description: string;
  tone: "danger" | "info" | "success";
};

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("sessao")) {
    return "Sua sessao nao esta mais valida. Entre novamente com a senha temporaria.";
  }

  return raw;
}

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    const stored = getStoredAuth();

    if (!stored?.session?.accessToken) {
      router.replace("/login");
      return;
    }

    fetchMe()
      .then((profile) => {
        if (!profile.mustChangePassword) {
          router.replace("/");
          return;
        }

        setReady(true);
      })
      .catch(() => {
        clearStoredAuth();
        router.replace("/login");
      });
  }, [router]);

  const helperChecks = useMemo(
    () => [
      { label: "Pelo menos 10 caracteres", ok: password.length >= 10 },
      { label: "Uma letra maiuscula", ok: /[A-Z]/.test(password) },
      { label: "Uma letra minuscula", ok: /[a-z]/.test(password) },
      { label: "Um numero", ok: /[0-9]/.test(password) },
      { label: "Um caractere especial", ok: /[^A-Za-z0-9]/.test(password) }
    ],
    [password]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setFeedback({
        title: "As senhas nao conferem",
        description: "Revise a confirmacao antes de concluir o primeiro acesso.",
        tone: "danger"
      });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      await submitFirstAccessPassword(password);
      setFeedback({
        title: "Senha definida com sucesso",
        description: "Seu acesso esta pronto. Vamos entrar no app.",
        tone: "success"
      });
      router.replace("/");
    } catch (error) {
      setFeedback({
        title: "Falha ao concluir primeiro acesso",
        description: normalizeApiError((error as Error).message),
        tone: "danger"
      });
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <main className={`${styles.page} ${displayFont.variable} ${bodyFont.variable}`}>
        <div className={styles.centeredStatus}>Preparando seu primeiro acesso...</div>
      </main>
    );
  }

  return (
    <main className={`${styles.page} ${displayFont.variable} ${bodyFont.variable}`}>
      <div className={styles.glowPrimary} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />

      <section className={styles.panel}>
        <span className={styles.badge}>
          <ShieldCheck size={16} />
          Primeiro acesso
        </span>

        <div className={styles.copyBlock}>
          <h1 className={styles.headline}>Crie sua senha definitiva</h1>
          <p className={styles.copy}>
            Voce entrou com uma senha temporaria. Antes de acessar a comunidade, precisamos registrar uma senha forte e exclusiva para a sua conta.
          </p>
        </div>

        {feedback ? (
          <div
            className={`${styles.feedback} ${
              feedback.tone === "danger"
                ? styles.feedbackDanger
                : feedback.tone === "success"
                  ? styles.feedbackSuccess
                  : styles.feedbackInfo
            }`}
            role={feedback.tone === "danger" ? "alert" : "status"}
          >
            <strong>{feedback.title}</strong>
            <span>{feedback.description}</span>
          </div>
        ) : null}

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Nova senha</span>
            <div className={styles.inputWrap}>
              <LockKeyhole size={16} />
              <input
                className={styles.input}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Defina uma senha forte"
                autoComplete="new-password"
                required
                disabled={loading}
              />
            </div>
          </label>

          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Confirmar senha</span>
            <div className={styles.inputWrap}>
              <LockKeyhole size={16} />
              <input
                className={styles.input}
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
                required
                disabled={loading}
              />
            </div>
          </label>

          <div className={styles.rules}>
            {helperChecks.map((rule) => (
              <div
                key={rule.label}
                className={`${styles.rule} ${rule.ok ? styles.ruleOk : ""}`}
              >
                <span className={styles.ruleBullet} aria-hidden="true" />
                <span>{rule.label}</span>
              </div>
            ))}
          </div>

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Concluir primeiro acesso"}
          </button>
        </form>
      </section>
    </main>
  );
}
