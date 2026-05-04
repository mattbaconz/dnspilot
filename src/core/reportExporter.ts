import type { BenchmarkReport, DiagnosticReport } from "../types";

export function exportDiagnosticJson(report: DiagnosticReport): string {
  return JSON.stringify(report, null, 2);
}

export function exportDiagnosticMarkdown(report: DiagnosticReport, benchmark?: BenchmarkReport): string {
  const lines = [
    "# DNSPilot Diagnostic Report",
    "",
    `- Hostname: ${report.hostname}`,
    `- Checked at: ${report.checkedAt}`,
    `- Diagnosis: ${report.diagnosis.title}`,
    "",
    "## Summary",
    "",
    report.diagnosis.explanation,
    "",
    "## Evidence",
    "",
    ...formatList(report.diagnosis.evidence),
    "",
    "## Next Steps",
    "",
    ...formatList(report.diagnosis.nextSteps),
    "",
    "## Resolver Results",
    "",
    "| Resolver | Status | Latency | Records |",
    "| --- | --- | ---: | --- |"
  ];

  for (const result of report.resolvers) {
    const records = formatResolverRecords(result);
    lines.push(`| ${result.resolverName} | ${result.status} | ${result.latencyMs} ms | ${records} |`);
  }

  if (report.recordInspection) {
    lines.push(
      "",
      "## DNS Inspection",
      "",
      "| Resolver | Type | Status | Latency | Records |",
      "| --- | --- | --- | ---: | --- |"
    );

    for (const inspection of report.recordInspection) {
      for (const query of inspection.queries) {
        const records = query.records
          .filter((record) => record.type === query.recordType || record.type === "CNAME")
          .map((record) => `${record.type} ${record.value} (${record.ttl}s)`)
          .join("<br>");
        lines.push(
          `| ${inspection.resolverName} | ${query.recordType} | ${query.status} | ${query.latencyMs} ms | ${records || query.error || "none"} |`
        );
      }
    }
  }

  if (report.siteProbe) {
    lines.push(
      "",
      "## Site Probe",
      "",
      `- Status: ${report.siteProbe.status}`,
      `- Summary: ${report.siteProbe.summary}`,
      `- Host permission granted: ${report.siteProbe.permissionGranted ? "yes" : "no"}`,
      "",
      "| URL | Result | Latency | Final URL |",
      "| --- | --- | ---: | --- |"
    );

    for (const attempt of report.siteProbe.attempts) {
      const result = attempt.statusCode ? `HTTP ${attempt.statusCode}` : attempt.error ?? "failed";
      lines.push(`| ${attempt.url} | ${result} | ${attempt.latencyMs} ms | ${attempt.finalUrl ?? ""} |`);
    }
  }

  if (report.resolvers.some((result) => result.queries.some((query) => query.error))) {
    lines.push("", "## Resolver Errors", "");
    for (const result of report.resolvers) {
      const errors = result.queries.filter((query) => query.error);
      for (const error of errors) {
        lines.push(`- ${result.resolverName} ${error.recordType}: ${error.error}`);
      }
    }
  }

  if (report.mismatch.details.length > 0) {
    lines.push("", "## Mismatch Notes", "");
    for (const detail of report.mismatch.details) {
      lines.push(`- ${detail}`);
    }
  }

  if (benchmark) {
    lines.push("", "## Benchmark", "", "| Resolver | Median latency | Failure rate |", "| --- | ---: | ---: |");
    for (const result of benchmark.results) {
      const latency = result.medianLatencyMs === null ? "n/a" : `${result.medianLatencyMs} ms`;
      lines.push(`| ${result.resolverName} | ${latency} | ${Math.round(result.failureRate * 100)}% |`);
    }
  }

  lines.push(
    "",
    "## Privacy Note",
    "",
    "This report was generated locally. DNSPilot does not send tested domains to a DNSPilot backend."
  );

  return `${lines.join("\n")}\n`;
}

function formatList(items: string[]): string[] {
  return items.length > 0 ? items.map((item) => `- ${item}`) : ["- None"];
}

function formatResolverRecords(result: DiagnosticReport["resolvers"][number]): string {
  const records = result.records
    .map((record) => `${record.type} ${record.value} (${record.ttl}s)`)
    .join("<br>");

  if (records) {
    return records;
  }

  const errors = result.queries
    .filter((query) => query.error)
    .map((query) => `${query.recordType}: ${query.error}`)
    .join("<br>");

  if (errors) {
    return errors;
  }

  return "none";
}

export function createDownload(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
}
