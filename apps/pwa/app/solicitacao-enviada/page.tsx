"use client";

import { Check, Menu, UserCircle2 } from "lucide-react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--feedback-font-display"
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--feedback-font-body"
});

export default function SolicitacaoEnviadaPage() {
  const router = useRouter();

  return (
    <main className={`${styles.page} ${displayFont.variable} ${bodyFont.variable}`}>
      <div className={styles.glowPrimary} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />

      <div className={styles.appShell}>
        <header className={styles.topBar}>
          <button className={styles.topIcon} type="button" aria-label="Abrir menu" disabled>
            <Menu size={17} />
          </button>
          <span className={styles.brand}>ELO</span>
          <span className={styles.topAvatar} aria-hidden="true">
            <UserCircle2 size={20} />
          </span>
        </header>

        <section className={styles.content}>
          <div className={styles.signal}>
            <span className={styles.signalHalo} />
            <span className={styles.signalCore}>
              <Check size={32} strokeWidth={2.8} />
            </span>
          </div>

          <div className={styles.copyBlock}>
            <h1 className={styles.headline}>Solicitacao enviada!</h1>
            <p className={styles.copy}>
              Seus dados foram enviados aos administradores. Em breve, entraremos em contato via{" "}
              <strong>WhatsApp</strong> para concluir sua adesao a comunidade Elo.
            </p>
          </div>

          <button className={styles.primaryAction} type="button" onClick={() => router.replace("/login")}>
            Entendi
            <span aria-hidden="true">→</span>
          </button>

          <Link className={styles.secondaryAction} href="/login">
            Voltar para o inicio
          </Link>
        </section>
      </div>
    </main>
  );
}
