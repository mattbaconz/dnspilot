import { defaultSettings } from "../core/resolverRegistry";

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get("settings");
  if (!existing.settings) {
    await chrome.storage.local.set({ settings: defaultSettings });
  }
});
