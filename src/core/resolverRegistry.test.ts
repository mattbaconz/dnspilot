import { describe, expect, it } from "vitest";
import { defaultResolverIds, getEnabledResolvers, normalizeSettings, validateResolverIds } from "./resolverRegistry";

describe("resolverRegistry", () => {
  it("falls back to default resolvers when input is invalid", () => {
    expect(validateResolverIds("cloudflare")).toEqual(defaultResolverIds);
  });

  it("filters unknown resolvers and de-duplicates valid ids", () => {
    expect(validateResolverIds(["cloudflare", "unknown", "cloudflare", "quad9"])).toEqual(["cloudflare", "quad9"]);
  });

  it("normalizes settings", () => {
    expect(normalizeSettings({ enabledResolverIds: ["google"], language: "id", theme: "light", hasSeenIntro: true })).toEqual({
      enabledResolverIds: ["google"],
      language: "id",
      theme: "light",
      hasSeenIntro: true
    });
  });

  it("resolves enabled resolver metadata", () => {
    expect(getEnabledResolvers(["cloudflare", "quad9"]).map((resolver) => resolver.name)).toEqual(["Cloudflare", "Quad9"]);
  });
});
