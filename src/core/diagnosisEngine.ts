import type {
  Diagnosis,
  DiagnosticReport,
  MismatchSummary,
  RecordInspectionResult,
  ResolverCheckResult,
  SiteProbeResult
} from "../types";
import { recordsToComparableSet } from "./dnsWire";

export function buildMismatchSummary(results: ResolverCheckResult[]): MismatchSummary {
  const recordSetsByResolver = Object.fromEntries(
    results.map((result) => [result.resolverId, recordsToComparableSet(result.records)])
  );
  const comparableSets = Object.values(recordSetsByResolver).map((values) => values.join("|"));
  const uniqueSets = new Set(comparableSets);
  const statuses = new Set(results.map((result) => result.status));
  const details: string[] = [];

  if (uniqueSets.size > 1) {
    details.push("Resolvers returned different address sets.");
  }

  if (statuses.size > 1) {
    details.push("Resolvers did not agree on success or failure.");
  }

  return {
    hasMismatch: details.length > 0,
    details,
    recordSetsByResolver
  };
}

export function diagnose(results: ResolverCheckResult[], siteProbe?: SiteProbeResult): Diagnosis {
  if (results.length < 2) {
    return createDiagnosis(
      "likely-not-enough-information",
      "Not enough information",
      "Run checks against at least two resolvers to compare DNS behavior.",
      ["Fewer than two resolver results are available."],
      ["Enable at least two resolvers in Settings.", "Run DNS Check again."]
    );
  }

  const successes = results.filter((result) => result.status === "success");
  const errors = results.filter((result) => result.status === "error");
  const noRecords = results.filter((result) => result.status === "no-records");
  const mismatch = buildMismatchSummary(results);
  const allErrorsAreNxdomain = errors.length === results.length && results.every(hasOnlyNxdomainErrors);
  const allErrorsAreTransport = errors.length === results.length && results.every(hasOnlyTransportErrors);

  const siteProbeDiagnosis = diagnoseSiteProbe(siteProbe, successes.length > 0);
  if (siteProbeDiagnosis) {
    return siteProbeDiagnosis;
  }

  if (mismatch.hasMismatch && successes.length > 0) {
    return createDiagnosis(
      "likely-resolver-mismatch",
      "Likely resolver mismatch",
      "At least one resolver disagreed with the others. This can happen during DNS changes, resolver filtering, split DNS, or regional DNS behavior.",
      [
        `${successes.length} resolver(s) returned address records.`,
        ...mismatch.details,
        ...formatRecordSetEvidence(results)
      ],
      [
        "Check whether the domain recently changed DNS records.",
        "Compare results again in a few minutes.",
        "Run Site Probe to see whether the browser can still reach the site."
      ]
    );
  }

  if (allErrorsAreNxdomain) {
    return createDiagnosis(
      "likely-site-server-issue",
      "Hostname not found by DNS",
      "All selected resolvers reported that the hostname does not exist. Check for a typo or whether the site publishes DNS records for this hostname.",
      results.map((result) => `${result.resolverName} returned hostname-not-found responses.`),
      [
        "Check the hostname spelling.",
        "Try the parent domain if you entered a subdomain.",
        "If this is your domain, check authoritative DNS records."
      ]
    );
  }

  if (allErrorsAreTransport) {
    return createDiagnosis(
      "likely-dns-issue",
      "Resolvers could not be reached",
      "The selected DNS-over-HTTPS resolvers could not be reached from this browser. Check the network connection, firewall rules, captive portal state, or resolver availability.",
      results.flatMap((result) => formatQueryErrors(result)),
      [
        "Confirm the browser is online.",
        "Try another network.",
        "Open a normal HTTPS site to check for a captive portal.",
        "Run Benchmark to see whether all resolvers fail or only one resolver fails."
      ]
    );
  }

  if (successes.length === 0 && errors.length > 0) {
    return createDiagnosis(
      "likely-dns-issue",
      "Likely DNS issue",
      "The selected resolvers could not return usable address records. The cause may be DNS server failure, filtering, resolver refusal, or a network path problem.",
      results.flatMap((result) => formatQueryErrors(result)),
      [
        "Check whether the hostname is correct.",
        "Try again with all default resolvers enabled.",
        "If only one resolver fails, prefer the resolver mismatch interpretation."
      ]
    );
  }

  if (successes.length === 0 && noRecords.length === results.length) {
    return createDiagnosis(
      "likely-site-server-issue",
      "Likely site or server issue",
      "Resolvers answered, but none returned A or AAAA records. The hostname may not publish address records.",
      results.map((result) => `${result.resolverName} answered but returned no A or AAAA records.`),
      [
        "Check whether the hostname is intended to be web-accessible.",
        "If this is your domain, add A or AAAA records.",
        "Try checking the apex domain or a known web subdomain."
      ]
    );
  }

  if (successes.length === results.length) {
    return createDiagnosis(
      "likely-site-server-issue",
      "DNS appears consistent",
      "All selected resolvers returned usable DNS results. If the page still fails, the cause is likely outside basic DNS resolution, such as TLS, HTTP, captive portal, or the site itself.",
      [
        `All ${results.length} enabled resolver(s) returned usable address records.`,
        ...formatRecordSetEvidence(results)
      ],
      [
        "Run Site Probe to check HTTP and HTTPS reachability.",
        "If Site Probe succeeds but the page still fails, check login state, browser extensions, or site application behavior.",
        "If Site Probe fails, inspect TLS, firewall, captive portal, or server reachability."
      ]
    );
  }

  return createDiagnosis(
    "likely-not-enough-information",
    "Not enough information",
    "The DNS result pattern is mixed but does not clearly identify one cause.",
    [
      `${successes.length} resolver(s) succeeded.`,
      `${errors.length} resolver(s) failed.`,
      `${noRecords.length} resolver(s) returned no records.`
    ],
    [
      "Run DNS Check again to rule out a transient resolver failure.",
      "Enable all default resolvers.",
      "Run Site Probe if at least one resolver returned address records."
    ]
  );
}

export function buildDiagnosticReport(
  hostname: string,
  resolvers: ResolverCheckResult[],
  siteProbe?: SiteProbeResult,
  recordInspection?: RecordInspectionResult[]
): DiagnosticReport {
  const mismatch = buildMismatchSummary(resolvers);
  return {
    hostname,
    checkedAt: new Date().toISOString(),
    resolvers,
    recordInspection,
    siteProbe,
    mismatch,
    diagnosis: diagnose(resolvers, siteProbe)
  };
}

function diagnoseSiteProbe(siteProbe: SiteProbeResult | undefined, hasDnsSuccess: boolean): Diagnosis | null {
  if (!siteProbe || siteProbe.status === "permission-denied" || siteProbe.status === "unsupported-url") {
    return null;
  }

  if (siteProbe.status === "reachable") {
    return createDiagnosis(
      "site-reachable",
      "Site responded",
      "DNS resolved and the site responded to a credential-free browser probe. If the page still looks wrong, check login state, page content, or application behavior.",
      [
        "At least one resolver returned usable address records.",
        siteProbe.summary,
        ...formatSiteProbeAttempts(siteProbe)
      ],
      [
        "If the browser page still fails, reload the page and check whether the issue is account, content, or application-specific.",
        "Export the report if you need to share diagnostic evidence."
      ]
    );
  }

  if (siteProbe.status === "redirected-to-different-host") {
    return createDiagnosis(
      "likely-redirect-or-captive-portal",
      "Probe redirected to another host",
      "DNS resolved, but the browser probe ended on a different hostname. This can be normal site routing, a sign-in flow, or a captive portal.",
      [siteProbe.summary, ...formatSiteProbeAttempts(siteProbe)],
      [
        "Open the final URL shown in the probe details and inspect whether it is expected.",
        "If you are on public Wi-Fi, open a normal website to check for a sign-in portal.",
        "If the redirect is unexpected, compare with another network."
      ]
    );
  }

  if (siteProbe.status === "https-failed-http-reachable") {
    return createDiagnosis(
      "likely-tls-or-network-issue",
      "HTTPS failed but HTTP responded",
      "DNS resolved and HTTP responded, but HTTPS failed. The cause is more likely TLS, certificate validation, HTTPS routing, or captive portal behavior than basic DNS.",
      [siteProbe.summary, ...formatSiteProbeAttempts(siteProbe)],
      [
        "Open the HTTPS page and inspect the browser certificate or security error.",
        "Check the device clock.",
        "Try another network to rule out captive portal or network interception."
      ]
    );
  }

  if (siteProbe.status === "http-error") {
    return createDiagnosis(
      "likely-http-issue",
      "HTTP error after DNS success",
      "DNS resolved, but the site returned an HTTP error. This points to server, application, content, authentication, or authorization behavior rather than basic DNS.",
      [siteProbe.summary, ...formatSiteProbeAttempts(siteProbe)],
      [
        "Check the HTTP status shown in the probe details.",
        "Try the page in a private window to separate account/session behavior.",
        "If you operate the site, inspect server logs for the returned status."
      ]
    );
  }

  if (siteProbe.status === "network-error" && hasDnsSuccess) {
    return createDiagnosis(
      "likely-tls-or-network-issue",
      "DNS works but site probe failed",
      "Trusted DNS resolvers returned addresses, but the browser probe could not get an HTTP response. The next likely causes are TLS, firewall, captive portal, routing, or server reachability.",
      [
        "At least one resolver returned usable address records.",
        siteProbe.summary,
        ...formatSiteProbeAttempts(siteProbe)
      ],
      [
        "Try another network.",
        "Check for firewall, captive portal, TLS, or server outage symptoms.",
        "Export the report before changing settings so you can compare later."
      ]
    );
  }

  return null;
}

function hasOnlyNxdomainErrors(result: ResolverCheckResult): boolean {
  const erroredQueries = result.queries.filter((query) => query.status === "error");
  return erroredQueries.length > 0 && erroredQueries.every((query) => query.rcode === 3);
}

function hasOnlyTransportErrors(result: ResolverCheckResult): boolean {
  const erroredQueries = result.queries.filter((query) => query.status === "error");
  return (
    erroredQueries.length > 0 &&
    erroredQueries.every((query) => query.rcode === undefined && query.error !== undefined)
  );
}

function createDiagnosis(
  category: Diagnosis["category"],
  title: string,
  explanation: string,
  evidence: string[],
  nextSteps: string[]
): Diagnosis {
  return {
    category,
    title,
    explanation,
    evidence: evidence.filter(Boolean),
    nextSteps
  };
}

function formatRecordSetEvidence(results: ResolverCheckResult[]): string[] {
  return results.map((result) => {
    const records = recordsToComparableSet(result.records);
    return `${result.resolverName}: ${records.length > 0 ? records.join(", ") : result.status}`;
  });
}

function formatQueryErrors(result: ResolverCheckResult): string[] {
  const errors = result.queries.filter((query) => query.error);
  if (errors.length === 0) {
    return [`${result.resolverName}: ${result.status}`];
  }

  return errors.map((query) => `${result.resolverName} ${query.recordType}: ${query.error}`);
}

function formatSiteProbeAttempts(siteProbe: SiteProbeResult): string[] {
  return siteProbe.attempts.map((attempt) => {
    const result = attempt.statusCode ? `HTTP ${attempt.statusCode}` : attempt.error ?? "failed";
    const finalUrl = attempt.finalUrl && attempt.finalUrl !== attempt.url ? ` -> ${attempt.finalUrl}` : "";
    return `${attempt.url}: ${result}${finalUrl}`;
  });
}
