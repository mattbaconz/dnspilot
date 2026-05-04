import type { BenchmarkReport, BenchmarkResolverResult, ResolverInfo } from "../types";
import { queryDoh } from "./dohClient";

export const benchmarkSampleHostnames = ["example.com", "cloudflare.com", "wikipedia.org"];

export async function runBenchmark(
  resolvers: ResolverInfo[],
  sampleHostnames = benchmarkSampleHostnames
): Promise<BenchmarkReport> {
  const results = await Promise.all(resolvers.map((resolver) => benchmarkResolver(resolver, sampleHostnames)));

  return {
    sampleHostnames,
    checkedAt: new Date().toISOString(),
    results
  };
}

async function benchmarkResolver(resolver: ResolverInfo, sampleHostnames: string[]): Promise<BenchmarkResolverResult> {
  const queryResults = await Promise.all(sampleHostnames.map((hostname) => queryDoh(hostname, resolver, "A")));
  const successfulLatencies = queryResults
    .filter((result) => result.status === "success")
    .map((result) => result.latencyMs)
    .sort((left, right) => left - right);
  const failures = queryResults.length - successfulLatencies.length;

  return {
    resolverId: resolver.id,
    resolverName: resolver.name,
    medianLatencyMs: median(successfulLatencies),
    failureRate: queryResults.length === 0 ? 0 : failures / queryResults.length,
    successfulQueries: successfulLatencies.length,
    totalQueries: queryResults.length
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const midpoint = Math.floor(values.length / 2);
  if (values.length % 2 === 1) {
    return values[midpoint];
  }

  return Math.round((values[midpoint - 1] + values[midpoint]) / 2);
}
