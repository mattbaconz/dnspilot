# DNSPilot Release Checklist

Use this checklist before packaging DNSPilot for distribution.

## Required Commands

```bash
npm test
npm run build
npm audit
npm run package:zip
```

## Source Review

- Confirm new user-facing copy avoids misleading traffic-routing or guaranteed-access claims.
- Confirm no code requests `history`, `proxy`, `dns`, `webRequest`, or `nativeMessaging`.
- Confirm optional site host access is requested only from the user-initiated Site Probe path.
- Confirm Inspect DNS uses only the declared DoH resolver endpoints.
- Confirm tested domains are not sent to a DNSPilot backend.
- Confirm reports are generated locally.

## Manifest Review

- Required permissions should be limited to `activeTab` and `storage`.
- DoH host permissions should be limited to the supported resolver endpoints.
- Optional host permissions should exist only for user-approved Site Probe.
- Icons should be present at 16, 32, 48, and 128 pixels.

## Manual QA

- Complete `LOAD_UNPACKED.md`.
- Test at least one normal site, one invalid hostname, and one hostname that returns an HTTP error.
- Confirm Site Probe permission prompts are understandable.
- Confirm copied and exported Markdown reports contain evidence and next steps.
- Confirm copied and exported Markdown reports contain DNS Inspection results when inspection has been run.
- Confirm first-run onboarding can be dismissed and resets after Clear Local Data.
- Confirm dark mode is default, light mode can be selected, and the popup scrollbar is styled.

## Packaging

- Package the `dist` directory after a clean build.
- Use `npm run package:zip` to create `dnspilot.zip`.
- Do not package `node_modules`, source tests, or documentation as extension runtime files unless intentionally included.
- Keep screenshots and store copy aligned with the privacy model.
