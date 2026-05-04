export type DnsAddressRecordType = "A" | "AAAA";

export type DnsRecordType = DnsAddressRecordType | "CNAME" | "NS" | "MX" | "TXT" | "HTTPS" | "SVCB";

export type ResolverId = "cloudflare" | "google" | "quad9";

export type LookupStatus = "success" | "no-records" | "error";

export type DiagnosisCategory =
  | "likely-dns-issue"
  | "likely-resolver-mismatch"
  | "likely-site-server-issue"
  | "likely-not-enough-information"
  | "site-reachable"
  | "likely-http-issue"
  | "likely-tls-or-network-issue"
  | "likely-redirect-or-captive-portal";

export interface ResolverInfo {
  id: ResolverId;
  name: string;
  endpointUrl: string;
  operator: string;
  privacyUrl: string;
}

export interface DnsRecord {
  name: string;
  type: DnsRecordType | "CNAME";
  value: string;
  ttl: number;
}

export interface DohQueryResult {
  recordType: DnsRecordType;
  status: LookupStatus;
  latencyMs: number;
  records: DnsRecord[];
  rcode?: number;
  authenticatedData?: boolean;
  truncated?: boolean;
  error?: string;
}

export interface ResolverCheckResult {
  resolverId: ResolverId;
  resolverName: string;
  endpointUrl: string;
  status: LookupStatus;
  latencyMs: number;
  records: DnsRecord[];
  queries: DohQueryResult[];
}

export interface RecordInspectionResult {
  resolverId: ResolverId;
  resolverName: string;
  endpointUrl: string;
  status: LookupStatus;
  latencyMs: number;
  records: DnsRecord[];
  queries: DohQueryResult[];
}

export interface MismatchSummary {
  hasMismatch: boolean;
  details: string[];
  recordSetsByResolver: Record<string, string[]>;
}

export interface Diagnosis {
  category: DiagnosisCategory;
  title: string;
  explanation: string;
  evidence: string[];
  nextSteps: string[];
}

export interface DiagnosticReport {
  hostname: string;
  checkedAt: string;
  resolvers: ResolverCheckResult[];
  recordInspection?: RecordInspectionResult[];
  siteProbe?: SiteProbeResult;
  mismatch: MismatchSummary;
  diagnosis: Diagnosis;
}

export type SiteProbeStatus =
  | "reachable"
  | "http-error"
  | "redirected-to-different-host"
  | "https-failed-http-reachable"
  | "network-error"
  | "permission-denied"
  | "unsupported-url";

export interface SiteProbeAttempt {
  url: string;
  method: "HEAD";
  latencyMs: number;
  statusCode?: number;
  statusText?: string;
  finalUrl?: string;
  redirected?: boolean;
  error?: string;
}

export interface SiteProbeResult {
  status: SiteProbeStatus;
  checkedAt: string;
  targetHostname: string;
  permissionGranted: boolean;
  attempts: SiteProbeAttempt[];
  summary: string;
}

export interface BenchmarkResolverResult {
  resolverId: ResolverId;
  resolverName: string;
  medianLatencyMs: number | null;
  failureRate: number;
  successfulQueries: number;
  totalQueries: number;
}

export interface BenchmarkReport {
  sampleHostnames: string[];
  checkedAt: string;
  results: BenchmarkResolverResult[];
}

export interface AppSettings {
  enabledResolverIds: ResolverId[];
  language: "en" | "id";
  theme: "dark" | "light";
  hasSeenIntro: boolean;
}
