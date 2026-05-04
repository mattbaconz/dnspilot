import type { SiteProbeAttempt, SiteProbeResult, SiteProbeStatus } from "../types";
import { normalizeHostname } from "./dnsWire";

const PROBE_TIMEOUT_MS = 8000;

export async function runSiteProbe(hostname: string, currentUrl?: string): Promise<SiteProbeResult> {
  const targetHostname = normalizeHostname(hostname);
  const urls = buildProbeUrls(targetHostname, currentUrl);

  if (urls.length === 0) {
    return buildResult("unsupported-url", targetHostname, false, [], "Only HTTP and HTTPS pages can be probed.");
  }

  const permissionGranted = await requestProbePermission(targetHostname);
  if (!permissionGranted) {
    return buildResult(
      "permission-denied",
      targetHostname,
      false,
      [],
      "Site probe was not run because host permission was not granted."
    );
  }

  const attempts: SiteProbeAttempt[] = [];
  for (const url of urls) {
    attempts.push(await probeUrl(url));
  }

  const status = classifyProbe(targetHostname, attempts);
  return buildResult(status, targetHostname, true, attempts, summarizeProbe(status, attempts));
}

function buildProbeUrls(hostname: string, currentUrl?: string): string[] {
  const urls: string[] = [];

  if (currentUrl) {
    try {
      const parsed = new URL(currentUrl);
      if ((parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.hostname === hostname) {
        urls.push(parsed.origin);
      }
    } catch {
      // Fall back to default origins below.
    }
  }

  const httpsUrl = `https://${hostname}`;
  const httpUrl = `http://${hostname}`;
  for (const url of [httpsUrl, httpUrl]) {
    if (!urls.includes(url)) {
      urls.push(url);
    }
  }

  return urls;
}

async function requestProbePermission(hostname: string): Promise<boolean> {
  if (typeof chrome === "undefined" || !chrome.permissions?.request) {
    return true;
  }

  const origins = [`https://${hostname}/*`, `http://${hostname}/*`];
  return chrome.permissions.request({ origins });
}

async function probeUrl(url: string): Promise<SiteProbeAttempt> {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      credentials: "omit",
      redirect: "follow",
      signal: controller.signal
    });

    return {
      url,
      method: "HEAD",
      latencyMs: Math.round(performance.now() - startedAt),
      statusCode: response.status,
      statusText: response.statusText,
      finalUrl: response.url,
      redirected: response.redirected
    };
  } catch (error) {
    return {
      url,
      method: "HEAD",
      latencyMs: Math.round(performance.now() - startedAt),
      error: formatProbeError(error)
    };
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function classifyProbe(hostname: string, attempts: SiteProbeAttempt[]): SiteProbeStatus {
  const responses = attempts.filter((attempt) => attempt.statusCode !== undefined);
  const successfulResponses = responses.filter((attempt) => Number(attempt.statusCode) < 400);
  const httpsAttempt = attempts.find((attempt) => attempt.url.startsWith("https://"));
  const httpAttempt = attempts.find((attempt) => attempt.url.startsWith("http://"));
  const httpReachable = httpAttempt?.statusCode !== undefined && Number(httpAttempt.statusCode) < 500;

  if (httpsAttempt?.error && httpReachable) {
    return "https-failed-http-reachable";
  }

  const redirectedAway = successfulResponses.find((attempt) => {
    if (!attempt.finalUrl) {
      return false;
    }
    try {
      return new URL(attempt.finalUrl).hostname !== hostname;
    } catch {
      return false;
    }
  });

  if (redirectedAway) {
    return "redirected-to-different-host";
  }

  if (successfulResponses.length > 0) {
    return "reachable";
  }

  if (responses.length > 0) {
    return "http-error";
  }

  return "network-error";
}

function summarizeProbe(status: SiteProbeStatus, attempts: SiteProbeAttempt[]): string {
  if (status === "reachable") {
    return "The site responded to a credential-free browser probe.";
  }

  if (status === "redirected-to-different-host") {
    return "The site responded, but the probe ended on a different hostname. This can be normal canonical routing, a login portal, or a captive portal.";
  }

  if (status === "https-failed-http-reachable") {
    return "HTTPS failed, but HTTP responded. This points toward a TLS, certificate, HTTPS routing, or captive portal problem rather than basic DNS.";
  }

  if (status === "http-error") {
    const firstStatus = attempts.find((attempt) => attempt.statusCode !== undefined)?.statusCode;
    return `The site responded with HTTP ${firstStatus}. DNS works, but the server returned an application-level error.`;
  }

  if (status === "network-error") {
    return "No site probe received an HTTP response. If DNS resolved, the remaining failure is likely network, TLS, firewall, captive portal, or server reachability.";
  }

  if (status === "permission-denied") {
    return "DNSPilot needs one-time host permission for the tested site to run a browser reachability probe.";
  }

  return "The active URL cannot be probed.";
}

function buildResult(
  status: SiteProbeStatus,
  targetHostname: string,
  permissionGranted: boolean,
  attempts: SiteProbeAttempt[],
  summary: string
): SiteProbeResult {
  return {
    status,
    checkedAt: new Date().toISOString(),
    targetHostname,
    permissionGranted,
    attempts,
    summary
  };
}

function formatProbeError(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Probe timed out";
  }

  if (error instanceof TypeError) {
    return "Network, TLS, or permission failure";
  }

  if (error instanceof Error) {
    return error.message || "Site probe failed";
  }

  return "Site probe failed";
}
