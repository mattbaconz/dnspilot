import type { AppSettings } from "../types";
import { defaultSettings, normalizeSettings } from "./resolverRegistry";

const SETTINGS_KEY = "settings";

export async function loadSettings(): Promise<AppSettings> {
  if (!hasChromeStorage()) {
    return defaultSettings;
  }

  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(result[SETTINGS_KEY]);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (!hasChromeStorage()) {
    return;
  }

  await chrome.storage.local.set({
    [SETTINGS_KEY]: normalizeSettings(settings)
  });
}

export async function clearLocalData(): Promise<void> {
  if (!hasChromeStorage()) {
    return;
  }

  await chrome.storage.local.clear();
  await saveSettings(defaultSettings);
}

function hasChromeStorage(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}
