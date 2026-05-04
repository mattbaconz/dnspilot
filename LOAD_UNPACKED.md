# DNSPilot Load-Unpacked QA Checklist

Use this checklist after `npm run build`. Load `C:\web-extensions\dnspilot\dist` as an unpacked extension in Chrome.

## Install

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select `C:\web-extensions\dnspilot\dist`.
5. Confirm the extension shows the DNSPilot icon and requests only `activeTab`, `storage`, and the three DoH endpoint host permissions.

## Popup Smoke Test

1. Open `https://example.com`.
2. Open DNSPilot.
3. Confirm the hostname field shows `example.com`.
4. Confirm the popup uses dark mode by default and the scrollbar is styled.
5. Confirm the first-run panel recommends Full Diagnosis.
6. Run Full Diagnosis.
7. Confirm Cloudflare, Google Public DNS, and Quad9 show status, latency, and A or AAAA records where available.
8. Confirm the DNS Inspection panel shows NS, MX, TXT, CNAME, HTTPS, and SVCB query results where available.
9. Confirm the disclosure below the buttons says the hostname is sent directly to selected DoH resolvers.
10. Click Probe Site and grant host access for `example.com`.
11. Confirm the Site Probe panel shows HTTP/HTTPS reachability details.
12. Export JSON and Markdown reports.
13. Copy the Markdown report and confirm the copied report includes Summary, Evidence, Next Steps, Resolver Results, Site Probe, and DNS Inspection sections.

## Error Handling

1. Enter a deliberately invalid hostname such as `not a host`.
2. Run Full Diagnosis and confirm the UI shows a validation message.
3. Enter a non-existent test hostname under a reserved domain.
4. Confirm resolver errors are displayed in the resolver cards and exported Markdown.
5. Probe a site that returns an HTTP error and confirm DNSPilot separates the HTTP result from DNS resolution.
6. Confirm the diagnosis panel shows evidence and next steps.
7. Inspect DNS for a hostname with MX records and confirm non-address records render correctly.

## Benchmark

1. Open the Speed tab.
2. Run Benchmark.
3. Confirm each enabled resolver shows median latency or `n/a`, completed checks, and failure rate.
4. Confirm no browsing-history access is requested.

## Settings

1. Open Settings.
2. Disable one resolver.
3. Run DNS Check again and confirm only enabled resolvers are used.
4. Try disabling every resolver and confirm the UI prevents it.
5. Switch language to Indonesian-ready and reload the popup.
6. Switch Theme to Light, confirm the popup changes, then switch it back to Dark.

## Privacy

1. Open Privacy.
2. Confirm the page states no browsing history collection, no proxying, local diagnostics, and no default telemetry.
3. Click Clear Local Data.
4. Confirm settings reset and previous in-memory reports disappear from the popup.

## Guides

1. Open Guide.
2. Confirm only the Chrome Secure DNS section is present.
3. Click the Chrome external-link button and confirm it opens security settings or fails harmlessly.

## Regression Checks

1. Run `npm test`.
2. Run `npm run build`.
3. Run `npm audit`.
4. Scan user-facing source for prohibited positioning terms before packaging.
