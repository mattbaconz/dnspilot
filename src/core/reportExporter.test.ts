import { describe, expect, it } from "vitest";
import type { DiagnosticReport } from "../types";
import { exportDiagnosticJson, exportDiagnosticMarkdown } from "./reportExporter";

describe("reportExporter", () => {
  it("exports diagnostic reports as JSON", () => {
    const json = exportDiagnosticJson(reportFixture);
    const parsed = JSON.parse(json);

    expect(parsed.hostname).toBe("example.com");
    expect(parsed.diagnosis.category).toBe("likely-site-server-issue");
  });

  it("exports diagnostic reports as Markdown", () => {
    const markdown = exportDiagnosticMarkdown(reportFixture);

    expect(markdown).toContain("# DNSPilot Diagnostic Report");
    expect(markdown).toContain("| Cloudflare | success | 31 ms | A 203.0.113.10 (60s) |");
    expect(markdown).toContain("DNSPilot does not send tested domains to a DNSPilot backend.");
  });

  it("includes site probe results in Markdown", () => {
    const markdown = exportDiagnosticMarkdown({
      ...reportFixture,
      siteProbe: {
        status: "reachable",
        checkedAt: "2026-05-03T10:00:01.000Z",
        targetHostname: "example.com",
        permissionGranted: true,
        summary: "The site responded to a credential-free browser probe.",
        attempts: [
          {
            url: "https://example.com",
            method: "HEAD",
            latencyMs: 50,
            statusCode: 200,
            statusText: "OK",
            finalUrl: "https://example.com/",
            redirected: false
          }
        ]
      }
    });

    expect(markdown).toContain("## Site Probe");
    expect(markdown).toContain("| https://example.com | HTTP 200 | 50 ms | https://example.com/ |");
  });

  it("includes DNS inspection records in Markdown", () => {
    const markdown = exportDiagnosticMarkdown({
      ...reportFixture,
      recordInspection: [
        {
          resolverId: "cloudflare",
          resolverName: "Cloudflare",
          endpointUrl: "https://cloudflare-dns.com/dns-query",
          status: "success",
          latencyMs: 40,
          records: [
            {
              name: "example.com",
              type: "MX",
              value: "10 mail.example.com",
              ttl: 300
            }
          ],
          queries: [
            {
              recordType: "MX",
              status: "success",
              latencyMs: 40,
              records: [
                {
                  name: "example.com",
                  type: "MX",
                  value: "10 mail.example.com",
                  ttl: 300
                }
              ]
            }
          ]
        }
      ]
    });

    expect(markdown).toContain("## DNS Inspection");
    expect(markdown).toContain("| Cloudflare | MX | success | 40 ms | MX 10 mail.example.com (300s) |");
  });

  it("includes resolver errors in Markdown", () => {
    const markdown = exportDiagnosticMarkdown({
      ...reportFixture,
      resolvers: [
        {
          ...reportFixture.resolvers[0],
          status: "error",
          records: [],
          queries: [
            {
              recordType: "A",
              status: "error",
              latencyMs: 10,
              records: [],
              error: "Query timed out"
            }
          ]
        }
      ]
    });

    expect(markdown).toContain("A: Query timed out");
    expect(markdown).toContain("## Resolver Errors");
  });
});

const reportFixture: DiagnosticReport = {
  hostname: "example.com",
  checkedAt: "2026-05-03T10:00:00.000Z",
  diagnosis: {
    category: "likely-site-server-issue",
    title: "DNS appears consistent",
    explanation: "All selected resolvers returned usable DNS results.",
    evidence: ["Cloudflare returned 203.0.113.10."],
    nextSteps: ["Run Site Probe."]
  },
  mismatch: {
    hasMismatch: false,
    details: [],
    recordSetsByResolver: {
      cloudflare: ["203.0.113.10"]
    }
  },
  resolvers: [
    {
      resolverId: "cloudflare",
      resolverName: "Cloudflare",
      endpointUrl: "https://cloudflare-dns.com/dns-query",
      status: "success",
      latencyMs: 31,
      records: [
        {
          name: "example.com",
          type: "A",
          value: "203.0.113.10",
          ttl: 60
        }
      ],
      queries: []
    }
  ]
};
