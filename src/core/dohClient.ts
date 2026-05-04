import type {
  DnsAddressRecordType,
  DnsRecord,
  DnsRecordType,
  DohQueryResult,
  RecordInspectionResult,
  ResolverCheckResult,
  ResolverInfo
} from "../types";
import { base64UrlEncode, encodeDnsQuery, normalizeHostname, parseDnsResponse } from "./dnsWire";

const DEFAULT_TIMEOUT_MS = 5000;
const QUERY_TYPES: DnsAddressRecordType[] = ["A", "AAAA"];
const INSPECTION_QUERY_TYPES: DnsRecordType[] = ["CNAME", "NS", "MX", "TXT", "HTTPS", "SVCB"];

export async function queryDoh(
  hostname: string,
  resolver: ResolverInfo,
  recordType: DnsRecordType,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<DohQueryResult> {
  const startedAt = performance.now();

  try {
    const query = encodeDnsQuery(hostname, recordType);
    const response = await fetchWithTimeout(`${resolver.endpointUrl}?dns=${base64UrlEncode(query)}`, timeoutMs);
    const latencyMs = Math.round(performance.now() - startedAt);

    if (!response.ok) {
      return {
        recordType,
        status: "error",
        latencyMs,
        records: [],
        error: `HTTP ${response.status}`
      };
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const parsed = parseDnsResponse(bytes);
    const records = parsed.answers.filter((record) => record.type === recordType || record.type === "CNAME");
    const matchingRecords = records.filter((record) => record.type === recordType);

    return {
      recordType,
      status: parsed.rcode === 0 ? (matchingRecords.length > 0 ? "success" : "no-records") : "error",
      latencyMs,
      records,
      rcode: parsed.rcode,
      authenticatedData: parsed.flags.authenticatedData,
      truncated: parsed.flags.truncated,
      error: parsed.rcode === 0 ? undefined : formatDnsRcode(parsed.rcode)
    };
  } catch (error) {
    return {
      recordType,
      status: "error",
      latencyMs: Math.round(performance.now() - startedAt),
      records: [],
      error: getNetworkErrorMessage(error)
    };
  }
}

export async function runResolverCheck(hostname: string, resolver: ResolverInfo): Promise<ResolverCheckResult> {
  const normalizedHostname = normalizeHostname(hostname);
  const startedAt = performance.now();
  const queries = await Promise.all(QUERY_TYPES.map((recordType) => queryDoh(normalizedHostname, resolver, recordType)));
  const addressRecords = queries.flatMap((query) => query.records).filter(isAddressRecord);
  const hasTransportSuccess = queries.some((query) => query.status === "success" || query.status === "no-records");
  const status = addressRecords.length > 0 ? "success" : hasTransportSuccess ? "no-records" : "error";

  return {
    resolverId: resolver.id,
    resolverName: resolver.name,
    endpointUrl: resolver.endpointUrl,
    status,
    latencyMs: Math.round(performance.now() - startedAt),
    records: queries.flatMap((query) => query.records),
    queries
  };
}

export async function runDnsCheck(hostname: string, resolvers: ResolverInfo[]): Promise<ResolverCheckResult[]> {
  const normalizedHostname = normalizeHostname(hostname);
  return Promise.all(resolvers.map((resolver) => runResolverCheck(normalizedHostname, resolver)));
}

export async function runRecordInspection(
  hostname: string,
  resolvers: ResolverInfo[],
  recordTypes = INSPECTION_QUERY_TYPES
): Promise<RecordInspectionResult[]> {
  const normalizedHostname = normalizeHostname(hostname);
  return Promise.all(resolvers.map((resolver) => runResolverInspection(normalizedHostname, resolver, recordTypes)));
}

async function runResolverInspection(
  hostname: string,
  resolver: ResolverInfo,
  recordTypes: DnsRecordType[]
): Promise<RecordInspectionResult> {
  const startedAt = performance.now();
  const queries = await Promise.all(recordTypes.map((recordType) => queryDoh(hostname, resolver, recordType)));
  const records = queries.flatMap((query) => query.records);
  const hasTransportSuccess = queries.some((query) => query.status === "success" || query.status === "no-records");
  const status = records.length > 0 ? "success" : hasTransportSuccess ? "no-records" : "error";

  return {
    resolverId: resolver.id,
    resolverName: resolver.name,
    endpointUrl: resolver.endpointUrl,
    status,
    latencyMs: Math.round(performance.now() - startedAt),
    records,
    queries
  };
}

function isAddressRecord(record: DnsRecord): boolean {
  return record.type === "A" || record.type === "AAAA";
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/dns-message"
      },
      signal: controller.signal
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function getNetworkErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Query timed out";
  }

  if (error instanceof Error) {
    return error.message || "DNS query failed";
  }

  return "DNS query failed";
}

function formatDnsRcode(rcode: number): string {
  const names: Record<number, string> = {
    1: "DNS format error",
    2: "DNS server failure",
    3: "Hostname not found",
    4: "DNS query type not implemented",
    5: "DNS query refused"
  };

  return names[rcode] ?? `DNS error code ${rcode}`;
}
