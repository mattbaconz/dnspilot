# DNSPilot Business Model

## Product Positioning

DNSPilot is a browser-first DNS intelligence product. It should not compete as a generic DNS changer. The differentiated value is diagnosis:

> DNSPilot explains whether DNS is part of a website failure and gives the user evidence they can act on.

The product is not a VPN, proxy, traffic tunnel, traffic anonymizer, or platform-access tool. It does not promise access to blocked or restricted services. It helps users understand DNS and browser connectivity.

## Initial Product: DNSPilot

DNSPilot is the free extension-only version. It provides:

- Current tab hostname detection.
- DNS-over-HTTPS comparison across Cloudflare, Google Public DNS, and Quad9.
- Resolver mismatch detection.
- Site Probe with one-time host permission and credential-free HTTP/HTTPS `HEAD` requests.
- Resolver benchmark using static sample hostnames.
- Secure DNS setup guides.
- Privacy page and local data clear action.
- JSON and Markdown report export.

This is useful for support, education, troubleshooting, and resolver selection.

## Customer Segments

- Privacy-conscious users who want to understand DNS behavior.
- People configuring Secure DNS who want before/after evidence.
- IT support staff who need compact local diagnostic reports.
- Educators teaching DNS, TLS, HTTP, and browser connectivity.
- Power users comparing resolver speed and reliability.

## Competitor Lessons

Generic desktop DNS changers and resolver-switching extensions already exist. DNSPilot should avoid becoming another switcher. Useful lessons from adjacent products:

- Users value clear status, simple language, and evidence they can export.
- Resolver speed matters, but diagnosis matters more.
- Browser store trust depends on narrow permissions and accurate privacy disclosures.
- Premium features should deepen diagnostics without turning the product into traffic-routing software.

## Free Tier

DNSPilot should remain free and useful:

- Core DNS Check.
- Site Probe.
- Resolver Benchmark.
- Secure DNS guides.
- Local settings.
- Local JSON and Markdown export.
- No ads.
- No default telemetry.

## Possible Paid Features

Paid features should be diagnostic, reporting, or convenience-oriented:

- Detailed DNS record inspection: CNAME chains, HTTPS/SVCB, MX, TXT, NS.
- DNSSEC-oriented resolver evidence where available.
- Local diagnostic history with retention controls.
- Redaction controls for exported reports.
- CSV export for benchmark data.
- Saved resolver profiles.
- Advanced comparison runs before and after Secure DNS configuration.
- Optional native companion integration for OS-level DNS inspection and switching.

## Optional Native Companion Value

A native companion can support explicit OS-level DNS workflows:

- Read current OS DNS configuration.
- Set/reset OS DNS with visible confirmation.
- Flush DNS cache.
- Compare OS resolver behavior with trusted DoH resolver behavior.

The companion should remain optional. It should not receive or proxy browsing traffic.

## Revenue Model

A conservative freemium model fits the product:

- Free: DNSPilot diagnostics and guides.
- Supporter: cosmetic themes, supporter badge, extra saved local profiles.
- Pro: advanced DNS records, local history, richer export formats, native companion integration.
- Team/Education: bulk documentation, local-only classroom/support workflows, priority support.

Cloud sync or shared reports should be opt-in only and must include clear domain redaction controls.

## Risk Management

- Platform policy risk: keep permissions narrow and copy accurate.
- Privacy risk: avoid history collection and backend domain submission by default.
- Legal/compliance risk: avoid claims about accessing restricted services.
- Trust risk: keep the core open, auditable, and explicit about every network call.

## Marketing Language

Use:

- DNS diagnostics
- resolver comparison
- browser connectivity report
- Secure DNS setup guide
- local troubleshooting
- DNS evidence

Avoid language that implies traffic routing, stealth, or guaranteed access to restricted content.

---

Last updated: May 2026.
