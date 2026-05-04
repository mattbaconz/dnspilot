# Agents in DNSPilot

DNSPilot uses an agent-oriented design to describe deterministic modules. These are not autonomous AI agents in the MVP. They are small TypeScript modules with clear responsibilities.

## Diagnostics Agent

Implemented by:

- `src/core/dohClient.ts`
- `src/core/dnsWire.ts`
- `src/core/diagnosisEngine.ts`
- `src/core/siteProbe.ts`

Responsibilities:

- Run DNS-over-HTTPS checks against selected resolvers.
- Run Inspect DNS checks for NS, MX, TXT, CNAME, HTTPS, and SVCB records.
- Parse DNS wire-format responses.
- Compare resolver results.
- Run the user-initiated Site Probe after host permission is granted.
- Produce a diagnosis with evidence and next steps.

The MVP Diagnostics Agent does not passively monitor browsing and does not use `webRequest`.

## Benchmarking Agent

Implemented by:

- `src/core/benchmarkRunner.ts`

Responsibilities:

- Run static sample hostnames against enabled resolvers.
- Measure latency and failure rate.
- Avoid using browsing history as benchmark input.

## Setup Agent

Implemented by:

- `src/guides/secureDnsGuides.ts`
- popup Guide view

Responsibilities:

- Explain how to configure Secure DNS manually.
- Cover Chrome in the current build.
- Avoid claiming that the extension can silently change DNS settings.

## Privacy Agent

Implemented by:

- `src/privacy/privacyCopy.ts`
- popup Privacy view

Responsibilities:

- State what DNSPilot does and does not collect.
- Explain that DNS Check sends hostnames directly to selected DoH resolvers.
- Explain that Site Probe is user-initiated and credential-free.
- Provide a clear local data reset action.

## Reporting Agent

Implemented by:

- `src/core/reportExporter.ts`

Responsibilities:

- Export JSON and Markdown reports.
- Include DNS results, resolver errors, Site Probe attempts, evidence, and next steps.
- Keep reports local unless the user explicitly shares them.

## Compliance Agent

Implemented through product constraints, copy, permissions, and review practices.

Responsibilities:

- Avoid proxying, traffic tunneling, silent DNS changes, browsing-history collection, and default telemetry.
- Avoid misleading product claims.
- Keep optional host access tied to an explicit user action.
- Keep future native companion features transparent and user-controlled.

## Future AI Agent

Any future AI-based diagnosis must be optional, transparent, and privacy-preserving. It should work from user-approved reports or local evidence and must not introduce hidden telemetry or backend domain submission.

---

Last updated: May 2026.
