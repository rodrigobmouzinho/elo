"use client";

import {
  formatBrazilianPhoneInput,
  isValidBrazilianMobile
} from "@elo/core";
import { useBrazilLocations } from "@elo/ui";
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
  "Operações",
  "Jurídico",
  "Pessoas",
  "Produto",
  "Outro"
];

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("conectar") || normalized.includes("network")) {
    return "Não foi possível conectar ao servidor agora. Tente novamente em instantes.";
  }

  return raw;
}

export default function SolicitarAdesaoPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [customArea, setCustomArea] = useState("");

  const isAreaCustom = area === "Outro";
  const resolvedArea = useMemo(
    () => (isAreaCustom ? customArea.trim() : area),
    [area, customArea, isAreaCustom]
  );
  const {
    states,
    cities,
    loadingStates,
    loadingCities,
    statesError,
    citiesError
  } = useBrazilLocations({
    selectedState: state,
    selectedCity: city
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!isValidBrazilianMobile(whatsapp)) {
      setFeedback({
        title: "WhatsApp inválido",
        description: "Informe um número de celular válido no padrão brasileiro.",
        tone: "danger"
      });
      return;
    }

    setLoading(true);

    try {
      await submitMemberApplication({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
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
        title: "Falha ao enviar solicitação",
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
        </header>

        <section className={styles.content}>
          <div className={styles.hero}>
            <h1 className={styles.headline}>
              Seja <span>Visionário.</span>
            </h1>
            <p className={styles.copy}>
              O acesso à Elo é exclusivo para fundadores e líderes. Preencha sua solicitação para análise.
            </p>
          </div>

          {statesError || citiesError ? (
            <div className={`${styles.feedback} ${styles.feedbackInfo}`} role="status">
              <strong>Localização indisponível</strong>
              <span>{statesError ?? citiesError}</span>
            </div>
          ) : null}

          {feedback ? (
            <div
              className={`${styles.feedback} ${
                feedback.tone === "danger" ? styles.feedbackDanger : styles.feedbackInfo
              }`}
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
                placeholder="Como devemos chamá-lo?"
                autoComplete="name"
                required
                disabled={loading}
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>E-mail</span>
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
                onChange={(event) => setWhatsapp(formatBrazilianPhoneInput(event.target.value))}
                placeholder="(11) 91234-5678"
                autoComplete="tel"
                inputMode="numeric"
                required
                disabled={loading}
              />
            </label>

            <div className={styles.row}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>UF</span>
                <select
                  className={`${styles.select} ${!state ? styles.selectPlaceholder : ""}`}
                  value={state}
                  onChange={(event) => {
                    setState(event.target.value);
                    setCity("");
                  }}
                  autoComplete="address-level1"
                  required
                  disabled={loading || loadingStates}
                >
                  <option value="" disabled>
                    {loadingStates ? "Carregando..." : "Selecione a UF"}
                  </option>
                  {states.map((currentState) => (
                    <option key={currentState.code} value={currentState.code}>
                      {currentState.code}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Cidade</span>
                <select
                  className={`${styles.select} ${!city ? styles.selectPlaceholder : ""}`}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  autoComplete="address-level2"
                  required
                  disabled={loading || !state || loadingCities || Boolean(citiesError)}
                >
                  <option value="" disabled>
                    {!state ? "Selecione a UF primeiro" : loadingCities ? "Carregando..." : "Selecione a cidade"}
                  </option>
                  {cities.map((currentCity) => (
                    <option key={currentCity.name} value={currentCity.name}>
                      {currentCity.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Área de atuação</span>
              <select
                className={`${styles.select} ${!area ? styles.selectPlaceholder : ""}`}
                value={area}
                onChange={(event) => setArea(event.target.value)}
                required
                disabled={loading}
              >
                <option value="" disabled>
                  Selecione a área
                </option>
                {areaOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            {isAreaCustom ? (
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Qual área representa melhor você?</span>
                <input
                  className={styles.input}
                  value={customArea}
                  onChange={(event) => setCustomArea(event.target.value)}
                  placeholder="Ex.: Consultoria estratégica"
                  required
                  disabled={loading}
                />
              </label>
            ) : null}

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>No que você é bom?</span>
              <input
                className={styles.input}
                value={specialty}
                onChange={(event) => setSpecialty(event.target.value)}
                placeholder="Ex.: Escalar times, M&A, cloud..."
                disabled={loading}
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Conte sua história</span>
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
              {loading ? "Enviando..." : "Enviar solicitação"}
            </button>
          </form>

          <p className={styles.note}>
            A adesão está sujeita à curadoria interna da comunidade Elo.
          </p>

          <Link className={styles.backLink} href="/login">
            Voltar para o login
          </Link>
        </section>
      </div>
    </main>
  );
}
