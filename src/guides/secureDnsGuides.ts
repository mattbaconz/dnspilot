export interface SecureDnsGuide {
  id: string;
  title: string;
  steps: string[];
  note?: string;
}

export const secureDnsGuides: SecureDnsGuide[] = [
  {
    id: "chrome",
    title: "Chrome",
    steps: [
      "Open Chrome security settings.",
      "Find the Secure DNS setting.",
      "Choose a provider or enter a custom DNS-over-HTTPS URL.",
      "Return to DNSPilot and run the DNS check again."
    ],
    note: "Chrome extensions cannot silently change DNS settings."
  }
];
