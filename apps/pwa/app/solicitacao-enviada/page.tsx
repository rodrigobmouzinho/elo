"use client";

import { ArrowLeft, Check } from "lucide-react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Image from "next/image";
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
          <div className={styles.signal}>
            <span className={styles.signalHalo} />
            <span className={styles.signalCore}>
              <Check size={32} strokeWidth={2.8} />
            </span>
          </div>

          <div className={styles.copyBlock}>
            <h1 className={styles.headline}>Solicitação enviada!</h1>
            <p className={styles.copy}>
              Seus dados foram enviados aos administradores. Em breve, entraremos em contato via{" "}
              <strong>WhatsApp</strong> para concluir sua adesão à comunidade Elo.
            </p>
          </div>

          <button className={styles.primaryAction} type="button" onClick={() => router.replace("/login")}>
            Entendi
            <span aria-hidden="true">→</span>
          </button>

          <Link className={styles.secondaryAction} href="/login">
            Voltar para o início
          </Link>
        </section>
      </div>
    </main>
  );
}
