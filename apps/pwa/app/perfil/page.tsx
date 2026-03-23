"use client";

import {
  formatBrazilianPhoneInput,
  normalizeBrazilianPhone
} from "@elo/core";
import Image from "next/image";
import { Camera, Edit3, LogOut, Mail, MapPin, Phone, Sparkles, Star, Zap } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { passthroughImageLoader, useBrazilLocations } from "@elo/ui";
import { MemberShell } from "../../components/member-shell";
import { apiRequest, clearStoredAuth } from "../../lib/auth-client";
import styles from "./page.module.css";

type EditableProfile = {
  fullName: string;
  city: string;
  state: string;
  area: string;
  bio: string;
  specialty: string;
  avatarUrl: string;
};

type ProfileResponse = EditableProfile & {
  id: string;
  email: string;
  phone: string;
  whatsapp: string;
  active: boolean;
};

type FeedbackTone = "danger" | "info" | "success";

type FeedbackState = {
  title: string;
  description: string;
  tone: FeedbackTone;
};

type EditorSection = "identity" | "avatar" | "expertise" | "story" | null;

const initialDraft: EditableProfile = {
  fullName: "",
  city: "",
  state: "",
  area: "",
  bio: "",
  specialty: "",
  avatarUrl: ""
};

function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao") || normalized.includes("conexão")) {
    return "N\u00e3o foi poss\u00edvel conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function toWhatsappUrl(value: string) {
  const digits = normalizeBrazilianPhone(value);
  if (!digits) return null;

  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  if (normalized.length < 12 || normalized.length > 13) return null;

  return `https://wa.me/${normalized}`;
}

function createPatchFromDraft(draft: EditableProfile, keys: Array<keyof EditableProfile>) {
  const patch: Partial<EditableProfile> = {};

  keys.forEach((key) => {
    patch[key] = draft[key];
  });

  return patch;
}

export default function PerfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [draft, setDraft] = useState<EditableProfile>(initialDraft);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeEditor, setActiveEditor] = useState<EditorSection>(null);
  const [savingSection, setSavingSection] = useState<EditorSection>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const identityEditorRef = useRef<HTMLElement | null>(null);
  const identityNameInputRef = useRef<HTMLInputElement | null>(null);
  const avatarEditorRef = useRef<HTMLElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const expertiseEditorRef = useRef<HTMLElement | null>(null);
  const expertiseInputRef = useRef<HTMLInputElement | null>(null);
  const storyEditorRef = useRef<HTMLElement | null>(null);
  const storyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const {
    states,
    cities,
    loadingCities,
    loadingStates,
    statesError,
    citiesError
  } = useBrazilLocations({
    selectedState: draft.state,
    selectedCity: draft.city
  });

  useEffect(() => {
    async function loadProfile() {
      setLoadingProfile(true);

      try {
        const loadedProfile = await apiRequest<ProfileResponse>("/app/profile");
        setProfile(loadedProfile);
        setDraft({
          fullName: loadedProfile.fullName ?? "",
          city: loadedProfile.city ?? "",
          state: loadedProfile.state ?? "",
          area: loadedProfile.area ?? "",
          bio: loadedProfile.bio ?? "",
          specialty: loadedProfile.specialty ?? "",
          avatarUrl: loadedProfile.avatarUrl ?? ""
        });
      } catch (requestError) {
        setFeedback({
          title: "Falha ao carregar perfil",
          description: normalizeApiError((requestError as Error).message),
          tone: "danger"
        });
      } finally {
        setLoadingProfile(false);
      }
    }

    void loadProfile();
  }, []);

  useEffect(() => {
    if (!activeEditor) return;

    const editorTargets: Record<Exclude<EditorSection, null>, { container: HTMLElement | null; field: HTMLElement | null }> = {
      identity: {
        container: identityEditorRef.current,
        field: identityNameInputRef.current
      },
      avatar: {
        container: avatarEditorRef.current,
        field: avatarInputRef.current
      },
      expertise: {
        container: expertiseEditorRef.current,
        field: expertiseInputRef.current
      },
      story: {
        container: storyEditorRef.current,
        field: storyInputRef.current
      }
    };

    const target = editorTargets[activeEditor];
    target.container?.scrollIntoView({ behavior: "smooth", block: "start" });

    const timer = window.setTimeout(() => {
      target.field?.focus();
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeEditor]);

  const whatsappUrl = toWhatsappUrl(profile?.whatsapp ?? "");

  const profileBadges = useMemo(
    () => [
      {
        icon: <Star size={18} strokeWidth={2.1} />,
        label: draft.area || "Área em definição",
        tone: styles.chipPrimary
      },
      {
        icon: <Zap size={18} strokeWidth={2.1} />,
        label: draft.specialty || "Influenciador",
        tone: styles.chipSecondary
      },
      {
        icon: <Sparkles size={18} strokeWidth={2.1} />,
        label: profile?.active ? "Visionário" : "Perfil pausado",
        tone: styles.chipTertiary
      }
    ],
    [draft.area, draft.specialty, profile?.active]
  );

  function openEditor(section: EditorSection) {
    setFeedback(null);
    setActiveEditor(section);
  }

  function cancelEditor(section: EditorSection) {
    if (!profile) {
      setActiveEditor(null);
      return;
    }

    if (section === "identity") {
      setDraft((current) => ({
        ...current,
        fullName: profile.fullName ?? "",
        city: profile.city ?? "",
        state: profile.state ?? ""
      }));
    }

    if (section === "avatar") {
      setDraft((current) => ({
        ...current,
        avatarUrl: profile.avatarUrl ?? ""
      }));
    }

    if (section === "expertise") {
      setDraft((current) => ({
        ...current,
        area: profile.area ?? "",
        specialty: profile.specialty ?? ""
      }));
    }

    if (section === "story") {
      setDraft((current) => ({
        ...current,
        bio: profile.bio ?? ""
      }));
    }

    setActiveEditor(null);
  }

  async function savePatch(section: EditorSection, patch: Partial<EditableProfile>, successMessage: string) {
    if (!section) return;

    setSavingSection(section);
    setFeedback(null);

    try {
      const updated = await apiRequest<ProfileResponse>("/app/profile", {
        method: "PATCH",
        body: JSON.stringify(patch)
      });

      setProfile(updated);
      setDraft({
        fullName: updated.fullName ?? "",
        city: updated.city ?? "",
        state: updated.state ?? "",
        area: updated.area ?? "",
        bio: updated.bio ?? "",
        specialty: updated.specialty ?? "",
        avatarUrl: updated.avatarUrl ?? ""
      });
      setActiveEditor(null);
      setFeedback({
        title: "Perfil atualizado",
        description: successMessage,
        tone: "success"
      });
    } catch (submitError) {
      setFeedback({
        title: "Falha ao salvar alterações",
        description: normalizeApiError((submitError as Error).message),
        tone: "danger"
      });
    } finally {
      setSavingSection(null);
    }
  }

  async function handleIdentitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await savePatch(
      "identity",
      createPatchFromDraft(draft, ["fullName", "city", "state"]),
      "Seu nome e sua localização principal foram atualizados."
    );
  }

  async function handleAvatarSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await savePatch("avatar", createPatchFromDraft(draft, ["avatarUrl"]), "Sua foto do perfil foi atualizada.");
  }

  async function handleExpertiseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await savePatch(
      "expertise",
      createPatchFromDraft(draft, ["area", "specialty"]),
      "Sua área de atuação e sua especialidade já refletem seu posicionamento atual."
    );
  }

  async function handleStorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await savePatch("story", createPatchFromDraft(draft, ["bio"]), "Sua narrativa foi atualizada com sucesso.");
  }

  const avatarContent =
    draft.avatarUrl.trim() !== "" ? (
      <Image
        loader={passthroughImageLoader}
        unoptimized
        src={draft.avatarUrl}
        alt={draft.fullName || "Membro Elo"}
        width={128}
        height={128}
        className={styles.avatar}
      />
    ) : (
      <div className={styles.avatarFallback}>{initials(draft.fullName || "Elo")}</div>
    );

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

        {loadingProfile ? (
          <section className={styles.statusCard} aria-live="polite">
            <h2 className={styles.statusTitle}>Carregando perfil</h2>
            <p className={styles.statusText}>Preparando seus dados para exibição e edição.</p>
          </section>
        ) : null}

        <section className={styles.hero}>
          <div className={styles.heroAura} aria-hidden="true" />

          <div className={styles.avatarShell}>
            {avatarContent}
            <button className={styles.avatarAction} type="button" onClick={() => openEditor("avatar")} aria-label="Editar foto">
              <Camera size={18} strokeWidth={2.1} />
            </button>
          </div>

          <div className={styles.heroIdentity}>
            <h2 className={styles.heroName}>{draft.fullName || "Membro Elo"}</h2>
            <div className={styles.heroLocation}>
              <MapPin size={14} strokeWidth={2.1} />
              <span>{draft.city && draft.state ? `${draft.city}, ${draft.state}` : "Cidade não informada"}</span>
            </div>
          </div>

          <div className={styles.heroActions}>
            <button className={styles.ghostButton} type="button" onClick={() => openEditor("identity")}>
              <Edit3 size={16} strokeWidth={2.1} />
              Editar perfil
            </button>
            {whatsappUrl ? (
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className={styles.accentButton}>
                <Phone size={16} strokeWidth={2.1} />
                Abrir WhatsApp
              </a>
            ) : null}
          </div>
        </section>

        <section className={styles.chips}>
          {profileBadges.map((badge, index) => (
            <article key={`${badge.label}-${index}`} className={styles.chipCard}>
              <div className={`${styles.chipIcon} ${badge.tone}`}>{badge.icon}</div>
              <p className={styles.chipLabel}>{badge.label}</p>
            </article>
          ))}
        </section>

        <section className={styles.panel} ref={expertiseEditorRef}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Sincronização de contato</p>
              <h3 className={styles.panelTitle}>Contato oficial do membro</h3>
            </div>
            <span className={styles.panelBadge}>Sincronizado</span>
          </div>

          <div className={styles.panelRows}>
            <div className={styles.contactRow}>
              <div className={styles.contactIcon}>
                <Phone size={16} strokeWidth={2.1} />
              </div>
              <div className={styles.contactMeta}>
                <p className={styles.contactLabel}>Celular e WhatsApp</p>
                <p className={styles.contactValue}>
                  {formatBrazilianPhoneInput(profile?.whatsapp || profile?.phone || "") || "Não disponível"}
                </p>
              </div>
            </div>

            <div className={styles.contactRow}>
              <div className={`${styles.contactIcon} ${styles.contactIconMuted}`}>
                <Mail size={16} strokeWidth={2.1} />
              </div>
              <div className={styles.contactMeta}>
                <p className={styles.contactLabel}>E-mail oficial</p>
                <p className={styles.contactStatic}>{profile?.email || "Não disponível"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Especialidade</p>
              <h3 className={styles.panelTitle}>Como você quer ser encontrado</h3>
            </div>
            <button className={styles.ghostButton} type="button" onClick={() => openEditor("expertise")}>
              <Edit3 size={16} strokeWidth={2.1} />
              Editar
            </button>
          </div>

          {activeEditor === "expertise" ? (
            <form className={styles.fieldStack} onSubmit={handleExpertiseSubmit}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Área de atuação</span>
                <input
                  ref={expertiseInputRef}
                  className={styles.fieldControl}
                  value={draft.area}
                  onChange={(event) => setDraft((current) => ({ ...current, area: event.target.value }))}
                  placeholder="ex: Disruptor Fintech"
                  minLength={2}
                  maxLength={40}
                  required
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Especialidade</span>
                <input
                  className={styles.fieldControl}
                  value={draft.specialty}
                  onChange={(event) => setDraft((current) => ({ ...current, specialty: event.target.value }))}
                  placeholder="Seu foco principal"
                  maxLength={120}
                />
              </label>

              <div className={styles.actionsRow}>
                <button className={styles.accentButton} type="submit" disabled={savingSection === "expertise"}>
                  {savingSection === "expertise" ? "Salvando..." : "Salvar especialidade"}
                </button>
                <button className={styles.ghostButton} type="button" onClick={() => cancelEditor("expertise")} disabled={savingSection === "expertise"}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div>
              <p className={styles.plainValue}>{draft.area || "Qual sua área?"}</p>
              <p className={styles.supportValue}>
                {draft.specialty || "Defina seu recorte profissional para que a comunidade entenda rapidamente onde você gera valor."}
              </p>
            </div>
          )}
        </section>

        <section className={styles.panel} ref={storyEditorRef}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>A história</p>
              <h3 className={styles.panelTitle}>Sua narrativa dentro da Elo</h3>
            </div>
            <button className={styles.ghostButton} type="button" onClick={() => openEditor("story")}>
              <Edit3 size={16} strokeWidth={2.1} />
              Editar
            </button>
          </div>

          {activeEditor === "story" ? (
            <form className={styles.fieldStack} onSubmit={handleStorySubmit}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Biografia</span>
                <textarea
                  ref={storyInputRef}
                  className={styles.storyInput}
                  value={draft.bio}
                  onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}
                  placeholder="Compartilhe sua jornada com a comunidade Elo..."
                  maxLength={500}
                />
              </label>

              <div className={styles.actionsRow}>
                <button className={styles.accentButton} type="submit" disabled={savingSection === "story"}>
                  {savingSection === "story" ? "Salvando..." : "Salvar história"}
                </button>
                <button className={styles.ghostButton} type="button" onClick={() => cancelEditor("story")} disabled={savingSection === "story"}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <p className={styles.supportValue}>
              {draft.bio ||
                "Conte sua jornada, o tipo de conversa que você quer abrir e o contexto que ajuda outros membros a se aproximarem com mais clareza."}
            </p>
          )}
        </section>

        <section
          className={`${styles.panel} ${activeEditor === "identity" || activeEditor === "avatar" ? "" : styles.hidden}`}
          ref={activeEditor === "identity" ? identityEditorRef : avatarEditorRef}
        >
          {activeEditor === "identity" ? (
            <form className={styles.fieldStack} onSubmit={handleIdentitySubmit}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Identidade</p>
                  <h3 className={styles.panelTitle}>Atualize seu nome e sua localização</h3>
                </div>
              </div>

              {statesError || citiesError ? (
                <p className={styles.fieldHintError}>{statesError ?? citiesError}</p>
              ) : null}

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Nome completo</span>
                <input
                  ref={identityNameInputRef}
                  className={styles.fieldControl}
                  value={draft.fullName}
                  onChange={(event) => setDraft((current) => ({ ...current, fullName: event.target.value }))}
                  minLength={3}
                  required
                />
              </label>

              <div className={styles.gridFields}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>UF</span>
                  <select
                    className={styles.fieldControl}
                    value={draft.state}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        state: event.target.value,
                        city: ""
                      }))
                    }
                    required
                    disabled={loadingStates || savingSection === "identity"}
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
                    className={styles.fieldControl}
                    value={draft.city}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        city: event.target.value
                      }))
                    }
                    required
                    disabled={!draft.state || loadingCities || savingSection === "identity" || Boolean(citiesError)}
                  >
                    <option value="" disabled>
                      {!draft.state ? "Selecione a UF primeiro" : loadingCities ? "Carregando..." : "Selecione a cidade"}
                    </option>
                    {cities.map((currentCity) => (
                      <option key={currentCity.name} value={currentCity.name}>
                        {currentCity.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.actionsRow}>
                <button className={styles.accentButton} type="submit" disabled={savingSection === "identity"}>
                  {savingSection === "identity" ? "Salvando..." : "Salvar perfil"}
                </button>
                <button className={styles.ghostButton} type="button" onClick={() => cancelEditor("identity")} disabled={savingSection === "identity"}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : null}

          {activeEditor === "avatar" ? (
            <form className={styles.fieldStack} onSubmit={handleAvatarSubmit}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Foto do perfil</p>
                  <h3 className={styles.panelTitle}>Atualize sua imagem principal</h3>
                </div>
              </div>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>URL pública da imagem</span>
                <input
                  ref={avatarInputRef}
                  className={styles.fieldControl}
                  value={draft.avatarUrl}
                  onChange={(event) => setDraft((current) => ({ ...current, avatarUrl: event.target.value }))}
                  placeholder="https://..."
                  type="url"
                />
              </label>

              <div className={styles.actionsRow}>
                <button className={styles.accentButton} type="submit" disabled={savingSection === "avatar"}>
                  {savingSection === "avatar" ? "Salvando..." : "Salvar foto"}
                </button>
                <button className={styles.ghostButton} type="button" onClick={() => cancelEditor("avatar")} disabled={savingSection === "avatar"}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : null}
        </section>

        <button
          className={styles.dangerButton}
          type="button"
          onClick={() => {
            clearStoredAuth();
            router.replace("/login");
          }}
        >
          <LogOut size={18} strokeWidth={2.1} />
          Encerrar sessão
        </button>
      </div>
    </MemberShell>
  );
}
