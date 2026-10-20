/**
 * The player profile is the onboarding's last step: offered once, right after the first
 * list validated, when the player has seen the game and the profile has a use (comparing
 * with friends). A profile already there (made in Profil, or back after a reinstall): never.
 */
export function asksProfile(settings: { profileAsked: boolean }, profile: unknown): boolean {
  return !settings.profileAsked && !profile;
}
