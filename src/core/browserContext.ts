import { normalizeHostname } from "./dnsWire";

export interface BrowserTabContext {
  hostname: string;
  url: string;
}

export async function getCurrentTabContext(): Promise<BrowserTabContext | null> {
  if (typeof chrome === "undefined" || !chrome.tabs?.query) {
    return null;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    return null;
  }

  try {
    const url = new URL(tab.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return {
      hostname: normalizeHostname(url.hostname),
      url: tab.url
    };
  } catch {
    return null;
  }
}
