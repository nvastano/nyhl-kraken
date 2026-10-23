// The legacy team is whichever one owned this Sheet before multi-team
// support existed — it keeps using the original unsuffixed tabs on the
// Apps Script side, so it's also the safe default here.
export const LEGACY_TEAM_SLUG = "sabres";

const CURRENT_TEAM_KEY = "current-team-slug";

export function getCurrentTeamSlug(): string {
  try {
    return localStorage.getItem(CURRENT_TEAM_KEY) || LEGACY_TEAM_SLUG;
  } catch {
    return LEGACY_TEAM_SLUG;
  }
}

export function setCurrentTeamSlug(slug: string) {
  try {
    localStorage.setItem(CURRENT_TEAM_KEY, slug);
  } catch {
    // ignore — storage may be unavailable (private browsing, etc.)
  }
}
