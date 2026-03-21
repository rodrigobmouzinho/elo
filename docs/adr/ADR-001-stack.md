# ADR-001 - Stack de Plataforma

## Contexto
Precisamos entregar admin + PWA + API em 12 semanas com baixa friccao operacional.

## Problema
Escolher stack que maximize velocidade sem comprometer escalabilidade inicial.

## Opcoes
- Vercel + Supabase
- Vercel + Neon + Auth.js
- AWS Serverless

## Decisao
Adotar Vercel + Supabase no MVP.

## Consequencias
- Positivas: entrega rapida, menos infra para operar.
- Negativas: dependencia de vendor.
- Mitigacao: manter contratos de dominio em `@elo/core` para reduzir lock-in.
