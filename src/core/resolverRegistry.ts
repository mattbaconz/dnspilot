import type { AppSettings, ResolverId, ResolverInfo } from "../types";

export const resolverRegistry: Record<ResolverId, ResolverInfo> = {
  cloudflare: {
    id: "cloudflare",
    name: "Cloudflare",
    endpointUrl: "https://cloudflare-dns.com/dns-query",
    operator: "Cloudflare",
    privacyUrl: "https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/"
  },
  google: {
    id: "google",
    name: "Google Public DNS",
    endpointUrl: "https://dns.google/dns-query",
    operator: "Google",
    privacyUrl: "https://developers.google.com/speed/public-dns/privacy"
  },
  quad9: {
    id: "quad9",
    name: "Quad9",
    endpointUrl: "https://dns.quad9.net/dns-query",
    operator: "Quad9",
    privacyUrl: "https://quad9.net/service/privacy/"
  }
};

export const defaultResolverIds: ResolverId[] = ["cloudflare", "google", "quad9"];

export const defaultSettings: AppSettings = {
  enabledResolverIds: defaultResolverIds,
  language: "en",
  theme: "dark",
  hasSeenIntro: false
};

export function getEnabledResolvers(ids: ResolverId[]): ResolverInfo[] {
  const uniqueIds = [...new Set(ids)];
  return uniqueIds.map((id) => resolverRegistry[id]).filter(Boolean);
}

export function validateResolverIds(ids: unknown): ResolverId[] {
  if (!Array.isArray(ids)) {
    return defaultResolverIds;
  }

  const valid = ids.filter((id): id is ResolverId => typeof id === "string" && id in resolverRegistry);
  return valid.length > 0 ? [...new Set(valid)] : defaultResolverIds;
}

export function normalizeSettings(value: Partial<AppSettings> | undefined): AppSettings {
  return {
    enabledResolverIds: validateResolverIds(value?.enabledResolverIds),
    language: value?.language === "id" ? "id" : "en",
    theme: value?.theme === "light" ? "light" : "dark",
    hasSeenIntro: value?.hasSeenIntro === true
  };
}
