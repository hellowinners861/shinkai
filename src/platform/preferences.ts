export const AUDIO_MUTED_STORAGE_KEY = "shinkai.audioMuted";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function readAudioMuted(): boolean {
  try {
    return window.localStorage.getItem(AUDIO_MUTED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeAudioMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, String(muted));
  } catch {
    // Private browsing or a disabled storage API should not block play.
  }
}

export function announce(message: string): void {
  const status = document.getElementById("accessibility-status");
  if (status) {
    status.textContent = message;
  }
}
