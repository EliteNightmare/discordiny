// Browser-only preview controls. Never use these flags to authorize API requests.
export const PREVIEW_REGULAR = "discordiny_beta_preview_regular";
export const PREVIEW_CLOSED = "discordiny_beta_preview_closed";
export function isPreviewEnabled(key: string): boolean {
  return window.sessionStorage.getItem(key) === "1";
}
export function setPreviewEnabled(key: string, enabled: boolean): void {
  if (enabled) window.sessionStorage.setItem(key, "1");
  else window.sessionStorage.removeItem(key);
  window.dispatchEvent(new Event("discordiny-preview-changed"));
}
