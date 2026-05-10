<p align="center">
  <img src="public/icons/dnspilot-logo-transparent.png" width="96" height="96" alt="DNSPilot icon" />
</p>

# DNSPilot

**Know if DNS is the problem.**

DNSPilot is a Manifest V3 browser extension that explains DNS behavior for the current tab. It is a local diagnostic tool, not a VPN, proxy, traffic tunnel, or platform-access tool.

The extension compares DNS-over-HTTPS results from trusted resolvers, measures resolver latency, highlights resolver mismatches, and exports local diagnostic reports. It does not change DNS settings silently and does not collect browsing history.

The current extension build is prepared for Chrome. The in-app Secure DNS guide is limited to Chrome setup in this build.

## MVP Features

- Show the current tab hostname.
- Run a one-click Full Diagnosis that combines DNS Check and Inspect DNS.
- Run local DNS checks against Cloudflare, Google Public DNS, and Quad9.
- Display A and AAAA records, latency, resolver status, and mismatches.
- Inspect NS, MX, TXT, CNAME, HTTPS, and SVCB records across enabled resolvers.
- Run an explicit Site Probe with one-time host access to separate DNS success from HTTP, TLS, redirect, or network reachability problems.
- Show evidence and next steps for each diagnosis.
- Provide a simple diagnosis:
  - likely DNS issue
  - likely resolver mismatch
  - likely site/server issue
  - likely not enough information
- Benchmark resolvers with static sample domains.
- Provide a Secure DNS setup guide for Chrome.
- Provide privacy copy and a local data clear action.
- Store settings locally.
- Dark theme by default with an optional light theme.
- Export reports as JSON or Markdown, or copy Markdown to the clipboard.

## Privacy Position

DNSPilot does not request `history`, `proxy`, `dns`, `webRequest`, or broad host permissions. It uses `activeTab`, `storage`, and explicit host permissions for the configured DoH endpoints.

When a DNS check runs, the tested hostname is sent directly from the browser to the selected DNS-over-HTTPS resolvers. DNSPilot does not send tested domains to a DNSPilot backend, and there is no default telemetry.

When Site Probe runs, DNSPilot asks for host access to the tested site and sends credential-free `HEAD` requests to the HTTP and HTTPS origins for that hostname. The probe is user-initiated and is not a passive browsing monitor.

## Development

```bash
npm install
npm test
npm run build
npm run package:zip
```

The production extension build is emitted to `dist`. Load `dist` as an unpacked extension in Chrome.
Use `LOAD_UNPACKED.md` for the manual QA checklist.
The packaged extension archive is emitted as `dnspilot.zip`.

## Architecture

- `src/core/dnsWire.ts`: DNS wire-format query encoding and response parsing.
- `src/core/dohClient.ts`: DoH request orchestration and resolver checks.
- `src/core/resolverRegistry.ts`: Trusted resolver metadata and settings validation.
- `src/core/diagnosisEngine.ts`: Local diagnosis rules.
- `src/core/siteProbe.ts`: User-initiated HTTP/HTTPS reachability probe.
- `src/core/benchmarkRunner.ts`: Static-domain resolver benchmark.
- `src/core/reportExporter.ts`: JSON and Markdown report export.
- `src/core/browserContext.ts`: Current tab hostname detection.
- `src/core/storage.ts`: Local extension settings.
- `src/popup`: React UI.

## Release Readiness

Use `LOAD_UNPACKED.md` for local browser QA and `RELEASE_CHECKLIST.md` before packaging or store submission.
Use `STORE_LISTING.md` and `PRIVACY_POLICY.md` for Chrome Web Store listing preparation.

## License

DNSPilot is licensed under the Apache License 2.0. See `LICENSE.md`.

## Non-Goals

- No proxying.
- No traffic tunneling.
- No silent DNS changes.
- No browsing history collection.
- No default telemetry.
- No tested domains sent to a DNSPilot backend.
