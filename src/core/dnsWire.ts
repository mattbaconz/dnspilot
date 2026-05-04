import type { DnsRecord, DnsRecordType } from "../types";

const DNS_CLASS_IN = 1;
const TYPE_CODES: Record<DnsRecordType, number> = {
  A: 1,
  AAAA: 28,
  CNAME: 5,
  NS: 2,
  MX: 15,
  TXT: 16,
  HTTPS: 65,
  SVCB: 64
};

const RECORD_TYPES_BY_CODE: Record<number, DnsRecord["type"]> = {
  1: "A",
  2: "NS",
  5: "CNAME",
  15: "MX",
  16: "TXT",
  28: "AAAA",
  64: "SVCB",
  65: "HTTPS"
};

export interface ParsedDnsResponse {
  id: number;
  rcode: number;
  flags: {
    authoritativeAnswer: boolean;
    truncated: boolean;
    recursionAvailable: boolean;
    authenticatedData: boolean;
  };
  answers: DnsRecord[];
}

export function encodeDnsQuery(hostname: string, recordType: DnsRecordType, id = createQueryId()): Uint8Array {
  const labels = normalizeHostname(hostname).split(".");
  const qnameLength = labels.reduce((total, label) => total + 1 + label.length, 1);
  const message = new Uint8Array(12 + qnameLength + 4);
  const view = new DataView(message.buffer);

  view.setUint16(0, id);
  view.setUint16(2, 0x0100);
  view.setUint16(4, 1);
  view.setUint16(6, 0);
  view.setUint16(8, 0);
  view.setUint16(10, 0);

  let offset = 12;
  for (const label of labels) {
    if (label.length === 0 || label.length > 63) {
      throw new Error(`Invalid DNS label in hostname: ${hostname}`);
    }
    message[offset++] = label.length;
    for (let index = 0; index < label.length; index += 1) {
      message[offset++] = label.charCodeAt(index);
    }
  }

  message[offset++] = 0;
  view.setUint16(offset, TYPE_CODES[recordType]);
  offset += 2;
  view.setUint16(offset, DNS_CLASS_IN);

  return message;
}

export function parseDnsResponse(bytes: Uint8Array): ParsedDnsResponse {
  if (bytes.length < 12) {
    throw new Error("DNS response is shorter than the DNS header");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const id = view.getUint16(0);
  const flags = view.getUint16(2);
  const rcode = flags & 0x000f;
  const questionCount = view.getUint16(4);
  const answerCount = view.getUint16(6);
  let offset = 12;

  for (let question = 0; question < questionCount; question += 1) {
    const questionName = readDnsName(bytes, offset);
    offset = questionName.offset + 4;
    ensureOffset(bytes, offset);
  }

  const answers: DnsRecord[] = [];
  for (let answer = 0; answer < answerCount; answer += 1) {
    const parsedName = readDnsName(bytes, offset);
    offset = parsedName.offset;
    ensureOffset(bytes, offset + 10);

    const typeCode = view.getUint16(offset);
    offset += 2;
    const dnsClass = view.getUint16(offset);
    offset += 2;
    const ttl = view.getUint32(offset);
    offset += 4;
    const rdLength = view.getUint16(offset);
    offset += 2;
    ensureOffset(bytes, offset + rdLength);

    const recordType = RECORD_TYPES_BY_CODE[typeCode];
    if (dnsClass === DNS_CLASS_IN && recordType) {
      const value = parseRecordValue(bytes, offset, rdLength, recordType);
      if (value) {
        answers.push({
          name: parsedName.name,
          type: recordType,
          value,
          ttl
        });
      }
    }

    offset += rdLength;
  }

  return {
    id,
    rcode,
    flags: {
      authoritativeAnswer: Boolean(flags & 0x0400),
      truncated: Boolean(flags & 0x0200),
      recursionAvailable: Boolean(flags & 0x0080),
      authenticatedData: Boolean(flags & 0x0020)
    },
    answers
  };
}

export function normalizeHostname(hostname: unknown): string {
  if (typeof hostname !== "string") {
    throw new Error("Enter a valid hostname");
  }

  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!normalized || normalized.length > 253 || /\s/.test(normalized)) {
    throw new Error("Enter a valid hostname");
  }
  return normalized;
}

export function recordsToComparableSet(records: DnsRecord[]): string[] {
  return [...new Set(records.filter((record) => record.type === "A" || record.type === "AAAA").map((record) => record.value))]
    .sort((left, right) => left.localeCompare(right));
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createQueryId(): number {
  const data = new Uint16Array(1);
  globalThis.crypto?.getRandomValues?.(data);
  return data[0] || Math.floor(Math.random() * 65535);
}

function readDnsName(bytes: Uint8Array, offset: number, depth = 0): { name: string; offset: number } {
  if (depth > 12) {
    throw new Error("DNS name compression pointer chain is too deep");
  }

  const labels: string[] = [];
  let cursor = offset;
  let consumedOffset = offset;
  let jumped = false;

  while (true) {
    ensureOffset(bytes, cursor + 1);
    const length = bytes[cursor];

    if (length === 0) {
      cursor += 1;
      if (!jumped) {
        consumedOffset = cursor;
      }
      break;
    }

    // DNS compression pointers reuse a previously encoded name suffix.
    if ((length & 0xc0) === 0xc0) {
      ensureOffset(bytes, cursor + 2);
      const pointer = ((length & 0x3f) << 8) | bytes[cursor + 1];
      const pointedName = readDnsName(bytes, pointer, depth + 1);
      labels.push(pointedName.name);
      cursor += 2;
      if (!jumped) {
        consumedOffset = cursor;
      }
      jumped = true;
      break;
    }

    if ((length & 0xc0) !== 0) {
      throw new Error("Unsupported DNS label format");
    }

    const labelStart = cursor + 1;
    const labelEnd = labelStart + length;
    ensureOffset(bytes, labelEnd);
    labels.push(String.fromCharCode(...bytes.slice(labelStart, labelEnd)));
    cursor = labelEnd;
  }

  return {
    name: labels.filter(Boolean).join("."),
    offset: consumedOffset
  };
}

function parseRecordValue(
  bytes: Uint8Array,
  offset: number,
  length: number,
  recordType: DnsRecord["type"]
): string | null {
  if (recordType === "A") {
    if (length !== 4) {
      return null;
    }
    return Array.from(bytes.slice(offset, offset + length)).join(".");
  }

  if (recordType === "AAAA") {
    if (length !== 16) {
      return null;
    }
    return formatIpv6(bytes.slice(offset, offset + length));
  }

  if (recordType === "CNAME") {
    return readDnsName(bytes, offset).name;
  }

  if (recordType === "NS") {
    return readDnsName(bytes, offset).name;
  }

  if (recordType === "MX") {
    if (length < 3) {
      return null;
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const preference = view.getUint16(offset);
    const exchange = readDnsName(bytes, offset + 2).name;
    return `${preference} ${exchange}`;
  }

  if (recordType === "TXT") {
    return parseTxtRecord(bytes, offset, length);
  }

  if (recordType === "HTTPS" || recordType === "SVCB") {
    return parseServiceBindingRecord(bytes, offset, length);
  }

  return null;
}

function parseTxtRecord(bytes: Uint8Array, offset: number, length: number): string {
  const chunks: string[] = [];
  let cursor = offset;
  const end = offset + length;

  while (cursor < end) {
    const chunkLength = bytes[cursor++];
    const chunkEnd = Math.min(cursor + chunkLength, end);
    chunks.push(String.fromCharCode(...bytes.slice(cursor, chunkEnd)));
    cursor = chunkEnd;
  }

  return chunks.join(" ");
}

function parseServiceBindingRecord(bytes: Uint8Array, offset: number, length: number): string {
  if (length < 3) {
    return "";
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const priority = view.getUint16(offset);
  const target = readDnsName(bytes, offset + 2);
  const end = offset + length;
  const paramBytes = bytes.slice(target.offset, end);
  const params = Array.from(paramBytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return params ? `${priority} ${target.name || "."} params=${params}` : `${priority} ${target.name || "."}`;
}

function formatIpv6(bytes: Uint8Array): string {
  const parts: number[] = [];
  for (let index = 0; index < 16; index += 2) {
    parts.push((bytes[index] << 8) | bytes[index + 1]);
  }

  let bestStart = -1;
  let bestLength = 0;
  for (let index = 0; index < parts.length; index += 1) {
    if (parts[index] !== 0) {
      continue;
    }
    let end = index;
    while (end < parts.length && parts[end] === 0) {
      end += 1;
    }
    const length = end - index;
    if (length > bestLength && length > 1) {
      bestStart = index;
      bestLength = length;
    }
    index = end;
  }

  if (bestStart === -1) {
    return parts.map((part) => part.toString(16)).join(":");
  }

  const left = parts.slice(0, bestStart).map((part) => part.toString(16)).join(":");
  const right = parts
    .slice(bestStart + bestLength)
    .map((part) => part.toString(16))
    .join(":");

  if (!left && !right) {
    return "::";
  }
  if (!left) {
    return `::${right}`;
  }
  if (!right) {
    return `${left}::`;
  }
  return `${left}::${right}`;
}

function ensureOffset(bytes: Uint8Array, offset: number): void {
  if (offset > bytes.length) {
    throw new Error("DNS response ended unexpectedly");
  }
}
