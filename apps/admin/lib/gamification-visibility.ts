export function isGamificationEnabled() {
  return process.env.NEXT_PUBLIC_GAMIFICATION_ENABLED === "true";
}
