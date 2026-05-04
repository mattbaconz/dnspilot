import { describe, expect, it } from "vitest";
import { encodeDnsQuery, normalizeHostname, parseDnsResponse, recordsToComparableSet } from "./dnsWire";

describe("dnsWire", () => {
  it("encodes a DNS query with the expected question", () => {
    const query = encodeDnsQuery("Example.COM", "A", 0x1234);
    const view = new DataView(query.buffer);

    expect(view.getUint16(0)).toBe(0x1234);
    expect(view.getUint16(4)).toBe(1);
    expect(Array.from(query.slice(12, 25))).toEqual([
      7,
      101,
      120,
      97,
      109,
      112,
      108,
      101,
      3,
      99,
      111,
      109,
      0
    ]);
  });

  it("parses a compressed A record response", () => {
    const response = buildResponse("example.com", 1, [93, 184, 216, 34]);
    const parsed = parseDnsResponse(response);

    expect(parsed.rcode).toBe(0);
    expect(parsed.flags.authenticatedData).toBe(false);
    expect(parsed.answers).toEqual([
      {
        name: "example.com",
        type: "A",
        value: "93.184.216.34",
        ttl: 300
      }
    ]);
  });

  it("parses an AAAA record response", () => {
    const response = buildResponse("example.com", 28, [
      0x26,
      0x06,
      0x28,
      0x00,
      0x02,
      0x20,
      0x00,
      0x01,
      0x02,
      0x48,
      0x18,
      0x93,
      0x25,
      0xc8,
      0x19,
      0x46
    ]);
    const parsed = parseDnsResponse(response);

    expect(parsed.answers[0].value).toBe("2606:2800:220:1:248:1893:25c8:1946");
  });

  it("parses MX, TXT, and HTTPS inspection records", () => {
    const mx = parseDnsResponse(buildResponse("example.com", 15, [...u16(10), ...dnsName("mail.example.com")]));
    const txt = parseDnsResponse(buildResponse("example.com", 16, [11, ...ascii("v=spf1 -all")]));
    const https = parseDnsResponse(buildResponse("example.com", 65, [...u16(1), ...dnsName(".")]));

    expect(mx.answers[0]).toMatchObject({ type: "MX", value: "10 mail.example.com" });
    expect(txt.answers[0]).toMatchObject({ type: "TXT", value: "v=spf1 -all" });
    expect(https.answers[0]).toMatchObject({ type: "HTTPS", value: "1 ." });
  });

  it("normalizes address records into comparable sorted sets", () => {
    expect(
      recordsToComparableSet([
        { name: "example.com", type: "A", value: "203.0.113.2", ttl: 60 },
        { name: "example.com", type: "A", value: "203.0.113.1", ttl: 60 },
        { name: "example.com", type: "A", value: "203.0.113.1", ttl: 60 },
        { name: "example.com", type: "CNAME", value: "edge.example.com", ttl: 60 }
      ])
    ).toEqual(["203.0.113.1", "203.0.113.2"]);
  });

  it("rejects non-string hostnames with a user-facing validation error", () => {
    expect(() => normalizeHostname({ currentTarget: "button" })).toThrow("Enter a valid hostname");
  });
});

function buildResponse(hostname: string, typeCode: number, rdata: number[]): Uint8Array {
  const question = encodeDnsQuery(hostname, typeCodeToName(typeCode), 0x1234);
  const response = new Uint8Array(question.length + 16 + rdata.length);
  response.set(question);
  const view = new DataView(response.buffer);

  view.setUint16(2, 0x8180);
  view.setUint16(6, 1);

  let offset = question.length;
  response[offset++] = 0xc0;
  response[offset++] = 0x0c;
  view.setUint16(offset, typeCode);
  offset += 2;
  view.setUint16(offset, 1);
  offset += 2;
  view.setUint32(offset, 300);
  offset += 4;
  view.setUint16(offset, rdata.length);
  offset += 2;
  response.set(rdata, offset);

  return response;
}

function typeCodeToName(typeCode: number): Parameters<typeof encodeDnsQuery>[1] {
  const map: Record<number, Parameters<typeof encodeDnsQuery>[1]> = {
    1: "A",
    2: "NS",
    5: "CNAME",
    15: "MX",
    16: "TXT",
    28: "AAAA",
    64: "SVCB",
    65: "HTTPS"
  };

  return map[typeCode] ?? "A";
}

function dnsName(name: string): number[] {
  if (name === ".") {
    return [0];
  }

  return name.split(".").flatMap((label) => [label.length, ...ascii(label)]).concat(0);
}

function ascii(value: string): number[] {
  return Array.from(value).map((char) => char.charCodeAt(0));
}

function u16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}
