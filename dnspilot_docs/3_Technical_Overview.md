# DNSPilot Technical Overview

DNSPilot is a Manifest V3 browser extension built with TypeScript, React, and Vite. It focuses on local, user-initiated diagnostics with a small permission surface.

The current packaged extension is prepared for Chrome. The in-app Secure DNS guide is limited to Chrome setup in this build.

## Browser API Limits

Stable Chrome extensions cannot reliably change browser or OS DNS settings. DNSPilot therefore does not attempt silent DNS changes. It provides diagnostics, evidence, reports, and manual Secure DNS setup guidance.

The MVP also does not claim to read the user's actual system resolver. Browser extensions cannot directly inspect OS resolver configuration without native support. DNSPilot compares trusted DNS-over-HTTPS resolvers and optionally probes site reachability from the browser.

## Manifest V3 Permissions

DNSPilot uses:

- `activeTab` to read the current HTTP/HTTPS tab hostname after user interaction.
- `storage` to store local settings.
- explicit host permissions for trusted DNS-over-HTTPS endpoints:
  - `https://cloudflare-dns.com/*`
  - `https://dns.google/*`
  - `https://dns.quad9.net/*`
- optional host permissions for `http://*/*` and `https://*/*`, requested only when the user clicks Site Probe for a tested hostname.

DNSPilot does not request:

- `history`
- `proxy`
- `dns`
- `webRequest`
- `nativeMessaging`
- default broad site access

## Core Modules

### DNS Wire Module

`src/core/dnsWire.ts` encodes DNS queries and parses DNS wire-format responses. It supports A, AAAA, CNAME, NS, MX, TXT, HTTPS, and SVCB records, TTL parsing, response codes, and selected DNS flags such as Authenticated Data and truncation.

### DoH Client

`src/core/dohClient.ts` sends DNS-over-HTTPS GET requests with `application/dns-message` responses. It measures latency, normalizes resolver errors, handles timeouts, returns resolver-level results, and runs the Inspect DNS record queries.

### Resolver Registry

`src/core/resolverRegistry.ts` defines the trusted resolver set and validates enabled resolver settings. The MVP ships with Cloudflare, Google Public DNS, and Quad9.

### Diagnosis Engine

`src/core/diagnosisEngine.ts` combines DNS evidence and optional Site Probe evidence. It produces a diagnosis with:

- category
- title
- explanation
- evidence
- next steps

The engine distinguishes resolver mismatch, DNS reachability issues, NXDOMAIN-style hostname failures, consistent DNS success, HTTP errors after DNS success, HTTPS/TLS/network failures after DNS success, and redirects to different hostnames.

### Site Probe

`src/core/siteProbe.ts` is user-initiated. When the user clicks Probe Site, DNSPilot asks Chrome for host access to the tested hostname, then sends credential-free `HEAD` requests to HTTPS and HTTP origins. This helps answer a practical question:

> DNS resolved, but does the site respond from this browser?

Site Probe is not passive monitoring. It does not use cookies and does not inspect browsing history.

### Benchmark Runner

`src/core/benchmarkRunner.ts` runs static sample hostnames against enabled resolvers and reports median latency plus failure rate. It does not use browsing history as benchmark input.

### Report Exporter

`src/core/reportExporter.ts` exports diagnostic reports as JSON or Markdown. Reports include DNS results, resolver errors, Site Probe attempts, diagnosis evidence, and next steps.

### Browser Context

`src/core/browserContext.ts` reads the current active tab URL and extracts the hostname when the active tab is HTTP or HTTPS.

### Storage

`src/core/storage.ts` stores local settings only. DNSPilot does not store diagnostic history by default.

## UI

The popup includes:

- Check view for first-run guidance, Full Diagnosis, DNS Check, Site Probe, copy/export, diagnosis, and resolver details.
- Inspect DNS results for non-address records.
- Dark theme by default, with a light theme setting.
- Speed view for resolver benchmark.
- Guide view for Secure DNS setup instructions.
- Privacy view with local data clearing.
- Settings view for resolver selection and language structure.

## Native Companion App

A native companion is optional future work. It can add explicit OS-level DNS read/set/reset functionality through Native Messaging. The extension must remain useful without it, and domain resolution should not be proxied through the companion app.

## Non-Goals

- No traffic routing.
- No silent DNS changes.
- No passive browsing collection.
- No default telemetry.
- No tested domains sent to a DNSPilot backend.
- No claims that DNSPilot can guarantee site access.

---

Last updated: May 2026.
