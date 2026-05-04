# DNSPilot Overview

## Motivation

DNSPilot helps users understand why a website is not working in their browser. The product is not a VPN, proxy, traffic tunnel, or platform-access tool. Its purpose is to separate DNS behavior from other common failure causes such as TLS, HTTP errors, redirects, captive portals, server outages, and account or content restrictions.

The core wedge is:

> DNSPilot explains what is wrong with DNS or browser connectivity and shows whether DNS behavior is actually part of the problem.

## Purpose

DNSPilot is a browser-first DNS intelligence product. The extension performs user-initiated local diagnostics and presents evidence in plain language:

- DNS-over-HTTPS comparison across trusted resolvers.
- Resolver mismatch detection.
- Resolver benchmarking.
- User-initiated site reachability probing.
- Secure DNS setup guidance.
- Local report export.

DNSPilot does not silently change DNS settings. Stable Chrome extension APIs do not provide a production-safe way to change the browser or OS DNS resolver directly, so the extension guides users through manual configuration instead.

The current extension build is prepared for Chrome. The in-app Secure DNS guide is limited to Chrome setup in this build.

## DNSPilot MVP

DNSPilot is the extension-only MVP. It includes:

| Feature | Description |
| --- | --- |
| Current hostname detection | Reads the active HTTP/HTTPS tab hostname using `activeTab`. |
| Full Diagnosis | Runs DNS Check and Inspect DNS together as the recommended first action. |
| DNS Check | Sends DNS-over-HTTPS queries for A and AAAA records to Cloudflare, Google Public DNS, and Quad9. |
| Resolver comparison | Shows resolver success or failure, latency, returned records, TTLs, and mismatches. |
| Inspect DNS | Queries NS, MX, TXT, CNAME, HTTPS, and SVCB records across enabled resolvers. |
| Site Probe | After the user clicks Probe Site and grants host access for the tested hostname, sends credential-free `HEAD` requests to HTTP and HTTPS origins to distinguish DNS success from HTTP, TLS, redirect, or network reachability issues. |
| Resolver Benchmark | Runs static sample hostnames against enabled resolvers and shows median latency plus failure rate. |
| Secure DNS Guide | Provides manual setup guidance for Chrome. |
| Privacy Page | Explains local diagnostics, no browsing history collection, no proxying, no default telemetry, and local data clearing. |
| Report Export | Exports JSON or Markdown reports containing DNS evidence, site probe evidence, diagnosis, and next steps. |
| Theme | Uses dark mode by default and offers a light mode in Settings. |

## Privacy Model

DNSPilot is designed around explicit, local actions:

- No browsing history permission.
- No proxy permission.
- No DNS-changing permission.
- No `webRequest` passive monitoring in the MVP.
- No default telemetry.
- No tested domains sent to a DNSPilot backend.
- DNS Check sends the tested hostname directly to the selected DNS-over-HTTPS resolvers.
- Inspect DNS sends the tested hostname directly to the selected DNS-over-HTTPS resolvers for additional record types.
- Site Probe runs only after the user clicks it and grants host access for the tested hostname.
- Site Probe uses credential-free `HEAD` requests and does not include cookies.

## Positioning

DNSPilot should be described as a diagnostic and education product. Avoid copy that implies traffic routing, circumvention, or platform-policy evasion. Good phrases include:

- DNS diagnostics
- DNS health check
- resolver comparison
- Secure DNS setup guide
- browser connectivity diagnosis
- local diagnostic report

Avoid misleading claims that DNSPilot changes DNS automatically, guarantees access to a site, or hides user traffic.

## Audience

DNSPilot is useful for:

- Privacy-conscious users who want to understand resolver behavior.
- Users in networks where DNS manipulation or resolver filtering may occur.
- IT educators and support staff who need a simple DNS evidence report.
- Users configuring Secure DNS who want to check whether resolver behavior changed.
- Power users comparing resolver speed and reliability.

## Future Direction

The extension-only product should remain useful without a companion app. A later native companion can add explicit OS-level DNS inspection and switching, but it must remain optional and transparent. The browser extension should never route user traffic or tested domains through a DNSPilot backend by default.

---

Last updated: May 2026.
