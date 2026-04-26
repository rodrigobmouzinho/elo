export function isGamificationEnabled() {
  return process.env.GAMIFICATION_ENABLED === "true";
}

export function disabledGamificationError() {
  return {
    status: 404,
    message: "Gamificacao indisponivel nesta versao do sistema"
  } as const;
}
