"use client";

import { ArrowLeft } from "lucide-react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { submitMemberApplication } from "../../lib/auth-client";
import styles from "./page.module.css";

const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--application-font-display"
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--application-font-body"
});

type FeedbackState = {
  title: string;
  description: string;
  tone: "danger" | "info";
};

const areaOptions = [
  "Tecnologia",
  "Marketing",
  "Comercial",
  "Financeiro",
  "Operacoes",
  "Jurídico",
  "People",
  "Produto",
  "Outro"
];

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("conectar") || normalized.includes("network")) {
    return "Nao foi possivel conectar ao servidor agora. Tente novamente em instantes.";
  }

  return raw;
}

export default function SolicitarAdesaoPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [area, setArea] = useState(areaOptions[0]);
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const isAreaCustom = area === "Outro";
  const [customArea, setCustomArea] = useState("");

  const resolvedArea = useMemo(
    () => (isAreaCustom ? customArea.trim() : area),
    [area, customArea, isAreaCustom]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      await submitMemberApplication({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        area: resolvedArea,
        specialty: specialty.trim() || undefined,
        bio: bio.trim() || undefined
      });

      router.push("/solicitacao-enviada");
    } catch (error) {
      setFeedback({
        title: "Falha ao enviar solicitacao",
        description: normalizeApiError((error as Error).message),
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

      <div className={styles.appShell}>
        <header className={styles.topBar}>
          <Link className={styles.backButton} href="/login" aria-label="Voltar para o login">
            <ArrowLeft size={18} />
          </Link>
          <Image
            src="/brand/elo-wordmark.png"
            alt="Elo Networking"
            width={96}
            height={54}
            priority
            className={styles.brandMark}
          />
          <span className={styles.topSpacer} aria-hidden="true" />
        </header>

        <section className={styles.content}>
          <div className={styles.hero}>
            <h1 className={styles.headline}>
              Sejam <span>Visionarios.</span>
            </h1>
            <p className={styles.copy}>
              O acesso a ELO e exclusivo para fundadores e lideres. Preencha sua solicitacao para analise.
            </p>
          </div>

          {feedback ? (
            <div
              className={`${styles.feedback} ${feedback.tone === "danger" ? styles.feedbackDanger : styles.feedbackInfo}`}
              role="alert"
            >
              <strong>{feedback.title}</strong>
              <span>{feedback.description}</span>
            </div>
          ) : null}

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Nome completo</span>
              <input
                className={styles.input}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Como devemos chama-lo?"
                autoComplete="name"
                required
                disabled={loading}
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>E-mail corporativo</span>
              <input
                className={styles.input}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@empresa.com"
                type="email"
                autoComplete="email"
                required
                disabled={loading}
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>WhatsApp</span>
              <input
                className={styles.input}
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                placeholder="+55 00 00000-0000"
                autoComplete="tel"
                required
                disabled={loading}
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Celular para contato</span>
              <input
                className={styles.input}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+55 00 00000-0000"
                autoComplete="tel-national"
                disabled={loading}
              />
            </label>

            <div className={styles.row}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Cidade</span>
                <input
                  className={styles.input}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Sua cidade"
                  autoComplete="address-level2"
                  required
                  disabled={loading}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>UF</span>
                <input
                  className={styles.input}
                  value={state}
                  onChange={(event) => setState(event.target.value.replace(/\s/g, "").toUpperCase())}
                  placeholder="UF"
                  maxLength={2}
                  autoComplete="address-level1"
                  required
                  disabled={loading}
                />
              </label>
            </div>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Area de atuacao</span>
              <select
                className={styles.select}
                value={area}
                onChange={(event) => setArea(event.target.value)}
                required
                disabled={loading}
              >
                {areaOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            {isAreaCustom ? (
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Qual area representa melhor voce?</span>
                <input
                  className={styles.input}
                  value={customArea}
                  onChange={(event) => setCustomArea(event.target.value)}
                  placeholder="Ex: Consultoria estrategica"
                  required
                  disabled={loading}
                />
              </label>
            ) : null}

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>No que voce e bom?</span>
              <input
                className={styles.input}
                value={specialty}
                onChange={(event) => setSpecialty(event.target.value)}
                placeholder="Ex: Escalar times, M&A, cloud..."
                disabled={loading}
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Conte sua historia</span>
              <textarea
                className={styles.textarea}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Fale sobre seus desafios e conquistas..."
                rows={5}
                disabled={loading}
              />
            </label>

            <button className={styles.submit} type="submit" disabled={loading || !resolvedArea}>
              {loading ? "Enviando..." : "Enviar Solicitacao"}
            </button>
          </form>

          <p className={styles.note}>
            A adesao esta sujeita a curadoria interna da comunidade Elo.
          </p>

          <Link className={styles.backLink} href="/login">
            Voltar para o login
          </Link>
        </section>
      </div>
    </main>
  );
}
