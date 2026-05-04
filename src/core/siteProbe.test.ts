import { afterEach, describe, expect, it, vi } from "vitest";
import { runSiteProbe } from "./siteProbe";

describe("siteProbe", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "chrome");
  });

  it("does not probe when host permission is denied", async () => {
    setPermissionResult(false);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await runSiteProbe("example.com");

    expect(result.status).toBe("permission-denied");
    expect(result.permissionGranted).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("classifies a successful HTTPS response as reachable", async () => {
    setPermissionResult(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(200, "https://example.com/"));

    const result = await runSiteProbe("example.com");

    expect(result.status).toBe("reachable");
    expect(result.attempts[0].statusCode).toBe(200);
  });

  it("classifies HTTPS failure with HTTP success separately", async () => {
    setPermissionResult(true);
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(response(200, "http://example.com/"));

    const result = await runSiteProbe("example.com");

    expect(result.status).toBe("https-failed-http-reachable");
    expect(result.attempts).toHaveLength(2);
  });
});

function setPermissionResult(value: boolean): void {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      permissions: {
        request: vi.fn().mockResolvedValue(value)
      }
    }
  });
}

function response(status: number, url: string): Response {
  return new Response(null, {
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {}
  }).cloneWithUrl(url);
}

declare global {
  interface Response {
    cloneWithUrl(url: string): Response;
  }
}

Response.prototype.cloneWithUrl = function cloneWithUrl(url: string): Response {
  Object.defineProperty(this, "url", {
    configurable: true,
    value: url
  });
  Object.defineProperty(this, "redirected", {
    configurable: true,
    value: false
  });
  return this;
};
