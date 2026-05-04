import { describe, expect, it } from "vitest";
import type { ResolverCheckResult, ResolverId } from "../types";
import { buildMismatchSummary, diagnose } from "./diagnosisEngine";

describe("diagnosisEngine", () => {
  it("classifies consistent successful answers as likely beyond basic DNS", () => {
    const result = diagnose([
      resolverResult("cloudflare", "success", ["203.0.113.10"]),
      resolverResult("google", "success", ["203.0.113.10"]),
      resolverResult("quad9", "success", ["203.0.113.10"])
    ]);

    expect(result.category).toBe("likely-site-server-issue");
  });

  it("classifies different address sets as a resolver mismatch", () => {
    const result = diagnose([
      resolverResult("cloudflare", "success", ["203.0.113.10"]),
      resolverResult("google", "success", ["203.0.113.11"]),
      resolverResult("quad9", "success", ["203.0.113.10"])
    ]);

    expect(result.category).toBe("likely-resolver-mismatch");
  });

  it("classifies total resolver errors as a likely DNS issue", () => {
    const result = diagnose([
      resolverResult("cloudflare", "error", []),
      resolverResult("google", "error", []),
      resolverResult("quad9", "error", [])
    ]);

    expect(result.category).toBe("likely-dns-issue");
  });

  it("classifies unanimous NXDOMAIN as hostname not found", () => {
    const result = diagnose([
      resolverResult("cloudflare", "error", [], 3),
      resolverResult("google", "error", [], 3),
      resolverResult("quad9", "error", [], 3)
    ]);

    expect(result.category).toBe("likely-site-server-issue");
    expect(result.title).toBe("Hostname not found by DNS");
  });

  it("classifies unanimous transport failures as a DNS reachability issue", () => {
    const result = diagnose([
      resolverResult("cloudflare", "error", [], undefined, "Query timed out"),
      resolverResult("google", "error", [], undefined, "Failed to fetch"),
      resolverResult("quad9", "error", [], undefined, "Query timed out")
    ]);

    expect(result.category).toBe("likely-dns-issue");
    expect(result.title).toBe("Resolvers could not be reached");
  });

  it("requires at least two resolver results", () => {
    const result = diagnose([resolverResult("cloudflare", "success", ["203.0.113.10"])]);

    expect(result.category).toBe("likely-not-enough-information");
  });

  it("uses reachable site probe results when DNS succeeds", () => {
    const result = diagnose(
      [
        resolverResult("cloudflare", "success", ["203.0.113.10"]),
        resolverResult("google", "success", ["203.0.113.10"])
      ],
      {
        status: "reachable",
        checkedAt: "2026-05-03T10:00:00.000Z",
        targetHostname: "example.com",
        permissionGranted: true,
        summary: "The site responded to a credential-free browser probe.",
        attempts: []
      }
    );

    expect(result.category).toBe("site-reachable");
  });

  it("classifies HTTP errors after DNS success separately from DNS failures", () => {
    const result = diagnose(
      [
        resolverResult("cloudflare", "success", ["203.0.113.10"]),
        resolverResult("google", "success", ["203.0.113.10"])
      ],
      {
        status: "http-error",
        checkedAt: "2026-05-03T10:00:00.000Z",
        targetHostname: "example.com",
        permissionGranted: true,
        summary: "The site responded with HTTP 403.",
        attempts: []
      }
    );

    expect(result.category).toBe("likely-http-issue");
  });

  it("classifies DNS success plus network probe failure as TLS or network", () => {
    const result = diagnose(
      [
        resolverResult("cloudflare", "success", ["203.0.113.10"]),
        resolverResult("google", "success", ["203.0.113.10"])
      ],
      {
        status: "network-error",
        checkedAt: "2026-05-03T10:00:00.000Z",
        targetHostname: "example.com",
        permissionGranted: true,
        summary: "No site probe received an HTTP response.",
        attempts: []
      }
    );

    expect(result.category).toBe("likely-tls-or-network-issue");
  });

  it("describes status and record mismatches", () => {
    const summary = buildMismatchSummary([
      resolverResult("cloudflare", "success", ["203.0.113.10"]),
      resolverResult("google", "no-records", [])
    ]);

    expect(summary.hasMismatch).toBe(true);
    expect(summary.details).toContain("Resolvers returned different address sets.");
    expect(summary.details).toContain("Resolvers did not agree on success or failure.");
  });
});

function resolverResult(
  resolverId: ResolverId,
  status: ResolverCheckResult["status"],
  addresses: string[],
  rcode?: number,
  error?: string
): ResolverCheckResult {
  return {
    resolverId,
    resolverName: resolverId,
    endpointUrl: `https://${resolverId}.example/dns-query`,
    status,
    latencyMs: 42,
    records: addresses.map((value) => ({
      name: "example.com",
      type: "A",
      value,
      ttl: 60
    })),
    queries:
      status === "error" && (rcode !== undefined || error)
        ? [
            {
              recordType: "A",
              status: "error",
              latencyMs: 42,
              records: [],
              rcode,
              error: error ?? `DNS error code ${rcode}`
            },
            {
              recordType: "AAAA",
              status: "error",
              latencyMs: 43,
              records: [],
              rcode,
              error: error ?? `DNS error code ${rcode}`
            }
          ]
        : []
  };
}
