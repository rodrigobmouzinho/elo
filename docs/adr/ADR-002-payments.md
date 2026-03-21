# ADR-002 - Fluxo de Pagamento Manual PIX

## Contexto
Plataforma depende de anuidade e eventos pagos.

## Problema
Definir um fluxo simples, auditavel e rapido de pagamento para o MVP sem dependencia de gateway externo.

## Opcoes
- PIX manual com aprovacao admin
- Gateway externo dedicado
- Fluxo hibrido (gateway + fallback manual)

## Decisao
Adotar `manual_pix` como fluxo unico no MVP.

## Consequencias
- Positivas: menor complexidade operacional, menos dependencia externa e implementacao mais previsivel.
- Negativas: reconciliacao depende de aprovacao administrativa.
- Mitigacao: fila de pendencias no admin vinculada por `external_reference`, QR dinamico por cobranca e polling de status no app.
