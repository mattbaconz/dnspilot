# DNSPilot Store Listing Draft

## Name

DNSPilot

## Short Description

Local DNS checks, resolver comparison, site probes, and Secure DNS guidance for the current tab.

## Detailed Description

DNSPilot helps explain why a website may not be working in your browser.

Run a local DNS Check for the current tab hostname and compare DNS-over-HTTPS answers from Cloudflare, Google Public DNS, and Quad9. DNSPilot shows A and AAAA records, TTLs, resolver latency, resolver failures, and mismatches between resolvers.

The current extension build is prepared for Chrome.

When DNS resolves but the site still fails, run Site Probe. DNSPilot asks for one-time host access to the tested site and sends credential-free HEAD requests to HTTP and HTTPS origins. This helps separate DNS success from HTTP errors, HTTPS/TLS issues, redirects, captive portals, network reachability, or server problems.

DNSPilot also includes:

- one-click Full Diagnosis for the recommended DNS workflow
- Inspect DNS for NS, MX, TXT, CNAME, HTTPS, and SVCB records
- resolver benchmarking with static sample hostnames
- Secure DNS setup guide for Chrome
- local JSON and Markdown report export
- copyable Markdown reports with evidence and next steps
- local settings and local data clearing
- dark theme by default with an optional light theme

DNSPilot is not a VPN, proxy, traffic tunnel, traffic anonymizer, or platform-access tool. It does not silently change DNS settings and does not collect browsing history.

## Category

Developer Tools or Productivity

## Permission Justifications

### `activeTab`

Used to read the current active HTTP/HTTPS tab hostname when the user opens the popup. DNSPilot uses this hostname as the default diagnostic target.

### `storage`

Used to store local settings, including enabled resolvers and language selection.

### DoH host permissions

DNSPilot needs explicit access to supported DNS-over-HTTPS endpoints so DNS Check, Inspect DNS, and Benchmark can send DNS wire-format queries directly to selected resolvers:

- `https://cloudflare-dns.com/*`
- `https://dns.google/*`
- `https://dns.quad9.net/*`

### Optional HTTP/HTTPS host permissions

`http://*/*` and `https://*/*` are optional permissions used only by Site Probe. DNSPilot requests access for the tested hostname only after the user clicks Probe Site. The probe sends credential-free HEAD requests and does not collect browsing history.

## Privacy Disclosure Answers

- Single purpose: DNS and browser connectivity diagnostics for user-selected hostnames.
- Data collection: no browsing history collection, no default telemetry, no backend diagnostic collection.
- Data sale: no.
- Data use for advertising: no.
- Remote code: no remotely hosted executable code.
- User data transfer: tested hostnames are sent directly to selected DoH resolvers and tested site origins when the user runs diagnostics.

## Screenshot Plan

1. DNS Check with resolver comparison and diagnosis.
2. Site Probe showing HTTP/HTTPS reachability evidence.
3. Inspect DNS showing NS, MX, TXT, HTTPS, and SVCB records.
4. Benchmark showing median latency and failure rate.
5. Privacy page showing local-only disclosures and clear data action.

## Support URL

Use the repository issue tracker or project support page.

## Privacy Policy URL

Use the hosted version of `PRIVACY_POLICY.md`.

## Chrome Review References

- Chrome Web Store privacy practices and permission justification: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- Chrome Web Store best practices: https://developer.chrome.com/docs/webstore/best-practices
- Chrome Web Store program policies: https://developer.chrome.com/docs/webstore/program-policies/policies
- Manifest V3 additional requirements: https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements
