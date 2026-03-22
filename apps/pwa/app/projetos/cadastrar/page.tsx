"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { MemberShell } from "../../../components/member-shell";
import { apiRequest } from "../../../lib/auth-client";
import styles from "./page.module.css";

type FeedbackTone = "danger" | "info" | "success";

type FeedbackState = {
  title: string;
  description: string;
  tone: FeedbackTone;
};

type IdeaForm = {
  title: string;
  pitch: string;
  category: string;
  description: string;
};

const initialForm: IdeaForm = {
  title: "",
  pitch: "",
  category: "",
  description: ""
};

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Nao foi possivel conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function buildLookingFor(pitch: string) {
  if (pitch.length <= 120) return pitch;
  return `${pitch.slice(0, 117).trimEnd()}...`;
}

export default function CadastrarIdeiaPage() {
  const router = useRouter();
  const [form, setForm] = useState<IdeaForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        title: form.title.trim(),
        category: form.category.trim(),
        description: `${form.pitch.trim()}\n\n${form.description.trim()}`.trim(),
        lookingFor: buildLookingFor(form.pitch.trim())
      };

      await apiRequest("/app/projects", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      window.sessionStorage.setItem("elo-project-created", "1");
      router.replace("/projetos");
    } catch (submitError) {
      setFeedback({
        title: "Falha ao publicar projeto",
        description: normalizeApiError((submitError as Error).message),
        tone: "danger"
      });
      setSaving(false);
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

        <section className={styles.formCard}>
          <div className={styles.header}>
            <div className={styles.headerAccent} aria-hidden="true" />
            <h2 className={styles.title}>Cadastrar Ideia</h2>
            <p className={styles.subtitle}>Capture a atencao de inovadores e investidores de classe mundial.</p>
          </div>

          <form className={styles.formStack} onSubmit={handleSubmit}>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Nome da Startup</span>
              <input
                className={styles.fieldControl}
                placeholder="ex: Nexus AI"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                minLength={3}
                maxLength={80}
                required
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Pitch em uma frase</span>
              <input
                className={styles.fieldControl}
                placeholder="A primeira infraestrutura autonoma para fintechs..."
                value={form.pitch}
                onChange={(event) => setForm((current) => ({ ...current, pitch: event.target.value }))}
                minLength={3}
                maxLength={100}
                required
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Industria</span>
              <input
                className={styles.fieldControl}
                placeholder="ex: Fintech B2B para gestao de recebiveis"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                minLength={3}
                maxLength={80}
                required
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Descricao da Ideia</span>
              <textarea
                className={styles.storyInput}
                placeholder="Explique o problema que voce esta resolvendo e sua vantagem competitiva..."
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                minLength={20}
                maxLength={1800}
                required
              />
            </label>

            <div className={styles.actions}>
              <button className={styles.primaryButton} type="submit" disabled={saving}>
                {saving ? "Publicando..." : "Publicar Projeto"}
              </button>
              <Link href="/projetos" className={styles.secondaryButton}>
                Cancelar
              </Link>
            </div>
          </form>
        </section>

        <section className={styles.tipGrid}>
          <article className={styles.tipCard}>
            <Sparkles size={16} strokeWidth={2.1} className={styles.tipIconPrimary} />
            <p className={styles.tipText}>Projetos com descricoes de alta qualidade recebem mais interacao de investidores.</p>
          </article>

          <article className={styles.tipCard}>
            <Lock size={16} strokeWidth={2.1} className={styles.tipIconSecondary} />
            <p className={styles.tipText}>Sua propriedade intelectual e protegida pelo nosso acordo de adesao a comunidade.</p>
          </article>
        </section>
      </div>
    </MemberShell>
  );
}
