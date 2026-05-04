# DNSPilot Privacy Policy

Last updated: May 2026

DNSPilot is a local DNS and browser connectivity diagnostic extension. It does not operate a DNSPilot backend for diagnostic collection.

## Data DNSPilot Handles

DNSPilot may process:

- the hostname from the active HTTP or HTTPS tab
- DNS-over-HTTPS resolver responses for that hostname
- user-selected local settings
- credential-free Site Probe responses when the user explicitly runs Site Probe
- exported diagnostic reports created locally by the user

## Network Requests

When the user runs DNS Check or Inspect DNS, the tested hostname is sent directly from the browser to the selected DNS-over-HTTPS resolvers:

- Cloudflare
- Google Public DNS
- Quad9

When the user runs Site Probe, DNSPilot asks for host access to the tested site and sends credential-free `HEAD` requests to the HTTP and HTTPS origins for that hostname.

## What DNSPilot Does Not Collect

DNSPilot does not:

- collect browsing history
- use the Chrome `history` permission
- proxy or tunnel traffic
- change DNS settings silently
- collect default telemetry
- send tested domains to a DNSPilot backend
- sell user data
- use diagnostic data for advertising

## Local Storage

DNSPilot stores local settings in browser extension storage:

- enabled resolver list
- language setting

Diagnostic reports are not stored by default. They are generated only when the user exports or copies them.

## Optional Host Access

DNSPilot declares optional HTTP and HTTPS host access for Site Probe. This permission is requested only when the user clicks Probe Site for a tested hostname. Denying the permission prevents Site Probe from running for that hostname.

## Data Sharing

DNSPilot does not share diagnostic data with DNSPilot servers. Users may choose to export or copy reports and share them manually.

## Chrome Web Store Limited Use Statement

The use of information received from Chrome APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Contact

For support, use the repository issue tracker or the support channel listed in the Chrome Web Store listing.
