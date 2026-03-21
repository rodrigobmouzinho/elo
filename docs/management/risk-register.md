# Registro de Riscos

| ID | Risco | Probabilidade | Impacto | Mitigacao | Dono |
|---|---|---|---|---|---|
| R-01 | Atraso por escopo amplo em 12 semanas | Media | Alto | Fatiar por milestone e bloquear scope creep | PM/TL |
| R-02 | Atraso na aprovacao manual de pagamento | Media | Alto | Fila clara no admin + SLA operacional + checklist de conciliacao diaria | Backend |
| R-03 | Queda de performance no PWA | Media | Medio/Alto | Orcamento de performance + auditoria Lighthouse quinzenal via `pnpm qa:pwa-performance` | Frontend |
| R-04 | Falhas de autorizacao | Baixa/Media | Alto | RLS + revisao de permissao por PR + testes de acesso | Backend |
| R-05 | Baixa adocao inicial do app | Media | Medio | Onboarding guiado + notificacoes + suporte proativo | Produto |
| R-06 | Bugs criticos escaparem do beta | Media | Alto | UAT guiado + template de bug critico + gate `pnpm qa:uat-gate` antes do fechamento | QA/Produto |
| R-07 | Rollback lento em incidente de producao | Baixa/Media | Alto | Playbook de rollback com gate de recuperacao `pnpm qa:rollback-gate` e meta <= 5 min | DevOps/Backend |
