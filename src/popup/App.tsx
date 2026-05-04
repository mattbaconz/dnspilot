import {
  Activity,
  BookOpen,
  CheckCircle2,
  Clipboard,
  Download,
  ExternalLink,
  Gauge,
  ListTree,
  Network,
  Play,
  Settings,
  Shield,
  Trash2,
  TriangleAlert
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCurrentTabContext } from "../core/browserContext";
import { runBenchmark } from "../core/benchmarkRunner";
import { runDnsCheck, runRecordInspection } from "../core/dohClient";
import { normalizeHostname } from "../core/dnsWire";
import { buildDiagnosticReport } from "../core/diagnosisEngine";
import { createDownload, exportDiagnosticJson, exportDiagnosticMarkdown } from "../core/reportExporter";
import { getEnabledResolvers, resolverRegistry } from "../core/resolverRegistry";
import { runSiteProbe } from "../core/siteProbe";
import { clearLocalData, loadSettings, saveSettings } from "../core/storage";
import { secureDnsGuides } from "../guides/secureDnsGuides";
import { privacyPrinciples } from "../privacy/privacyCopy";
import type {
  AppSettings,
  BenchmarkReport,
  DiagnosticReport,
  RecordInspectionResult,
  ResolverCheckResult,
  ResolverId
} from "../types";

type View = "check" | "benchmark" | "guides" | "privacy" | "settings";

const viewItems: Array<{ id: View; label: string; icon: typeof Activity }> = [
  { id: "check", label: "Check", icon: Activity },
  { id: "benchmark", label: "Speed", icon: Gauge },
  { id: "guides", label: "Guide", icon: BookOpen },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "settings", label: "Settings", icon: Settings }
];

export default function App() {
  const [view, setView] = useState<View>("check");
  const [hostname, setHostname] = useState("");
  const [settings, setSettings] = useState<AppSettings>({
    enabledResolverIds: ["cloudflare", "google", "quad9"],
    language: "en",
    theme: "dark",
    hasSeenIntro: false
  });
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isRunningFull, setIsRunningFull] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [currentTabUrl, setCurrentTabUrl] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);

  const enabledResolvers = useMemo(() => getEnabledResolvers(settings.enabledResolverIds), [settings.enabledResolverIds]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      const [loadedSettings, context] = await Promise.all([loadSettings(), getCurrentTabContext()]);
      if (cancelled) {
        return;
      }

      setSettings(loadedSettings);
      if (context?.hostname) {
        setHostname(context.hostname);
        setCurrentTabUrl(context.url);
      }
    }

    initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  async function handleRunCheck(targetHostname = hostname) {
    setMessage(null);
    setIsChecking(true);

    try {
      const normalizedHostname = normalizeHostname(targetHostname);
      const results = await runDnsCheck(normalizedHostname, enabledResolvers);
      setHostname(normalizedHostname);
      setReport(buildDiagnosticReport(normalizedHostname, results));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "DNS check failed.");
    } finally {
      setIsChecking(false);
    }
  }

  async function handleRunFullDiagnosis(targetHostname = hostname) {
    setMessage(null);
    setIsRunningFull(true);

    try {
      const normalizedHostname = normalizeHostname(targetHostname);
      const [resolverResults, recordInspection] = await Promise.all([
        runDnsCheck(normalizedHostname, enabledResolvers),
        runRecordInspection(normalizedHostname, enabledResolvers)
      ]);
      setHostname(normalizedHostname);
      setReport(buildDiagnosticReport(normalizedHostname, resolverResults, undefined, recordInspection));
      if (!settings.hasSeenIntro) {
        await updateSettings({ ...settings, hasSeenIntro: true });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Full diagnosis failed.");
    } finally {
      setIsRunningFull(false);
    }
  }

  async function handleRunSiteProbe() {
    setMessage(null);
    setIsProbing(true);

    try {
      const normalizedHostname = normalizeHostname(hostname);
      const existingReportMatches = report?.hostname === normalizedHostname;
      const siteProbe = await runSiteProbe(normalizedHostname, currentTabUrl);
      const resolverResults =
        existingReportMatches ? report.resolvers : await runDnsCheck(normalizedHostname, enabledResolvers);
      setHostname(normalizedHostname);
      setReport(buildDiagnosticReport(normalizedHostname, resolverResults, siteProbe, existingReportMatches ? report.recordInspection : undefined));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Site probe failed.");
    } finally {
      setIsProbing(false);
    }
  }

  async function handleInspectDns() {
    setMessage(null);
    setIsInspecting(true);

    try {
      const normalizedHostname = normalizeHostname(hostname);
      const existingReportMatches = report?.hostname === normalizedHostname;
      const [resolverResults, recordInspection] = await Promise.all([
        existingReportMatches ? Promise.resolve(report.resolvers) : runDnsCheck(normalizedHostname, enabledResolvers),
        runRecordInspection(normalizedHostname, enabledResolvers)
      ]);
      setHostname(normalizedHostname);
      setReport(buildDiagnosticReport(normalizedHostname, resolverResults, existingReportMatches ? report.siteProbe : undefined, recordInspection));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "DNS inspection failed.");
    } finally {
      setIsInspecting(false);
    }
  }

  async function handleRunBenchmark() {
    setMessage(null);
    setIsBenchmarking(true);

    try {
      setBenchmark(await runBenchmark(enabledResolvers));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Benchmark failed.");
    } finally {
      setIsBenchmarking(false);
    }
  }

  async function updateSettings(nextSettings: AppSettings) {
    setSettings(nextSettings);
    await saveSettings(nextSettings);
  }

  async function handleClearData() {
    await clearLocalData();
    const nextSettings = await loadSettings();
    setSettings(nextSettings);
    setReport(null);
    setBenchmark(null);
    setMessage("Local data cleared.");
  }

  async function handleDismissIntro() {
    await updateSettings({ ...settings, hasSeenIntro: true });
  }

  function handleExport(format: "json" | "markdown") {
    if (!report) {
      return;
    }

    const stamp = report.checkedAt.replace(/[:.]/g, "-");
    if (format === "json") {
      createDownload(`dnspilot-${report.hostname}-${stamp}.json`, exportDiagnosticJson(report), "application/json");
      return;
    }

    createDownload(
      `dnspilot-${report.hostname}-${stamp}.md`,
      exportDiagnosticMarkdown(report, benchmark ?? undefined),
      "text/markdown"
    );
  }

  async function handleCopyMarkdown() {
    if (!report) {
      return;
    }

    try {
      await navigator.clipboard.writeText(exportDiagnosticMarkdown(report, benchmark ?? undefined));
      setMessage("Markdown report copied.");
    } catch {
      setMessage("Could not copy the report. Export Markdown instead.");
    }
  }

  function toggleResolver(resolverId: ResolverId) {
    const nextIds = settings.enabledResolverIds.includes(resolverId)
      ? settings.enabledResolverIds.filter((id) => id !== resolverId)
      : [...settings.enabledResolverIds, resolverId];

    if (nextIds.length === 0) {
      setMessage("Keep at least one resolver enabled.");
      return;
    }

    updateSettings({ ...settings, enabledResolverIds: nextIds });
  }

  return (
    <main className="app-shell" data-theme={settings.theme}>
      <header className="app-header">
        <div>
          <p className="eyebrow">DNSPilot</p>
          <h1>DNS diagnostics</h1>
        </div>
        <span className="privacy-chip">Local</span>
      </header>

      <nav className="tab-bar" aria-label="DNSPilot views">
        {viewItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={view === item.id ? "tab-button is-active" : "tab-button"}
              key={item.id}
              onClick={() => setView(item.id)}
              title={item.label}
              type="button"
            >
              <Icon aria-hidden="true" size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {message ? <StatusNotice message={message} /> : null}

      {view === "check" ? (
        <CheckView
          hostname={hostname}
          isChecking={isChecking}
          isInspecting={isInspecting}
          isRunningFull={isRunningFull}
          isProbing={isProbing}
          onExport={handleExport}
          onCopyMarkdown={handleCopyMarkdown}
          onDismissIntro={handleDismissIntro}
          onHostnameChange={setHostname}
          onInspectDns={handleInspectDns}
          onRunCheck={handleRunCheck}
          onRunFullDiagnosis={handleRunFullDiagnosis}
          onRunSiteProbe={handleRunSiteProbe}
          onTrySample={() => handleRunFullDiagnosis("example.com")}
          report={report}
          showIntro={!settings.hasSeenIntro}
        />
      ) : null}

      {view === "benchmark" ? (
        <BenchmarkView benchmark={benchmark} isBenchmarking={isBenchmarking} onRunBenchmark={handleRunBenchmark} />
      ) : null}

      {view === "guides" ? <GuidesView /> : null}

      {view === "privacy" ? <PrivacyView onClearData={handleClearData} /> : null}

      {view === "settings" ? (
        <SettingsView settings={settings} onToggleResolver={toggleResolver} onUpdateSettings={updateSettings} />
      ) : null}
    </main>
  );
}

function CheckView(props: {
  hostname: string;
  isChecking: boolean;
  isInspecting: boolean;
  isRunningFull: boolean;
  isProbing: boolean;
  onExport: (format: "json" | "markdown") => void;
  onCopyMarkdown: () => void;
  onDismissIntro: () => void;
  onHostnameChange: (hostname: string) => void;
  onInspectDns: () => void;
  onRunCheck: () => void;
  onRunFullDiagnosis: () => void;
  onRunSiteProbe: () => void;
  onTrySample: () => void;
  report: DiagnosticReport | null;
  showIntro: boolean;
}) {
  return (
    <section className="view-stack">
      <div className="host-row">
        <label htmlFor="hostname">Current hostname</label>
        <input
          id="hostname"
          onChange={(event) => props.onHostnameChange(event.target.value)}
          placeholder="example.com"
          spellCheck={false}
          type="text"
          value={props.hostname}
        />
      </div>

      <div className="button-row">
        <button className="primary-button" disabled={props.isRunningFull} onClick={() => props.onRunFullDiagnosis()} type="button">
          <Play aria-hidden="true" size={17} />
          <span>{props.isRunningFull ? "Running..." : "Full Diagnosis"}</span>
        </button>
        <button className="secondary-button" disabled={props.isChecking} onClick={() => props.onRunCheck()} type="button">
          <Activity aria-hidden="true" size={16} />
          <span>{props.isChecking ? "Checking..." : "DNS Only"}</span>
        </button>
        <button className="secondary-button" disabled={props.isProbing} onClick={props.onRunSiteProbe} type="button">
          <Network aria-hidden="true" size={16} />
          <span>{props.isProbing ? "Probing..." : "Probe Site"}</span>
        </button>
        <button className="secondary-button" disabled={props.isInspecting} onClick={props.onInspectDns} type="button">
          <ListTree aria-hidden="true" size={16} />
          <span>{props.isInspecting ? "Inspecting..." : "Inspect DNS"}</span>
        </button>
        <button className="secondary-button" disabled={!props.report} onClick={() => props.onExport("json")} type="button">
          <Download aria-hidden="true" size={16} />
          <span>JSON</span>
        </button>
        <button
          className="secondary-button"
          disabled={!props.report}
          onClick={() => props.onExport("markdown")}
          type="button"
        >
          <Download aria-hidden="true" size={16} />
          <span>MD</span>
        </button>
        <button className="secondary-button" disabled={!props.report} onClick={props.onCopyMarkdown} type="button">
          <Clipboard aria-hidden="true" size={16} />
          <span>Copy</span>
        </button>
      </div>
      <p className="disclosure-text">
        Running a check sends this hostname directly to the selected DNS-over-HTTPS resolvers. DNSPilot does not send it
        to a DNSPilot backend. Site Probe asks for one-time host access and sends credential-free HEAD requests to the
        tested site.
      </p>

      {props.showIntro ? (
        <IntroPanel
          disabled={props.isRunningFull}
          onDismiss={props.onDismissIntro}
          onRunFullDiagnosis={props.onRunFullDiagnosis}
          onTrySample={props.onTrySample}
        />
      ) : null}
      {props.report ? <DiagnosisPanel report={props.report} /> : <EmptyState />}
      {props.report?.siteProbe ? <SiteProbePanel report={props.report} /> : null}
      {props.report?.recordInspection ? <RecordInspectionPanel report={props.report} /> : null}
      {props.report ? <ResolverResults results={props.report.resolvers} /> : null}
    </section>
  );
}

function IntroPanel(props: {
  disabled: boolean;
  onDismiss: () => void;
  onRunFullDiagnosis: () => void;
  onTrySample: () => void;
}) {
  return (
    <section className="intro-panel">
      <div>
        <h2>Start with Full Diagnosis</h2>
        <p>
          DNSPilot checks trusted resolvers, inspects useful DNS records, and gives evidence plus next steps. Site Probe
          remains separate because it asks for host access to the tested site.
        </p>
      </div>
      <div className="intro-actions">
        <button className="primary-button" disabled={props.disabled} onClick={() => props.onRunFullDiagnosis()} type="button">
          <Play aria-hidden="true" size={16} />
          <span>Run Now</span>
        </button>
        <button className="secondary-button" disabled={props.disabled} onClick={props.onTrySample} type="button">
          <Activity aria-hidden="true" size={16} />
          <span>Try Sample</span>
        </button>
        <button className="secondary-button" onClick={props.onDismiss} type="button">
          <span>Dismiss</span>
        </button>
      </div>
    </section>
  );
}

function DiagnosisPanel({ report }: { report: DiagnosticReport }) {
  const isMismatch = report.diagnosis.category === "likely-resolver-mismatch";
  const Icon = isMismatch ? TriangleAlert : CheckCircle2;

  return (
    <section className={`diagnosis-panel ${isMismatch ? "is-warning" : ""}`}>
      <div className="diagnosis-title">
        <Icon aria-hidden="true" size={18} />
        <h2>{report.diagnosis.title}</h2>
      </div>
      <p>{report.diagnosis.explanation}</p>
      <div className="diagnosis-grid">
        <div>
          <h3>Evidence</h3>
          <ul className="compact-list">
            {report.diagnosis.evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Next steps</h3>
          <ul className="compact-list">
            {report.diagnosis.nextSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      {report.mismatch.details.length > 0 ? (
        <ul className="compact-list">
          {report.mismatch.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function SiteProbePanel({ report }: { report: DiagnosticReport }) {
  const siteProbe = report.siteProbe;
  if (!siteProbe) {
    return null;
  }

  return (
    <section className="site-probe-panel">
      <div className="resolver-heading">
        <div>
          <h2>Site probe</h2>
          <p>{siteProbe.summary}</p>
        </div>
        <span className={`status-pill probe-${siteProbe.status}`}>{formatProbeStatus(siteProbe.status)}</span>
      </div>
      {siteProbe.attempts.length > 0 ? (
        <div className="probe-attempts">
          {siteProbe.attempts.map((attempt) => (
            <div className="probe-row" key={attempt.url}>
              <span>{attempt.statusCode ? `HTTP ${attempt.statusCode}` : "Failed"}</span>
              <code>{attempt.finalUrl ?? attempt.error ?? attempt.url}</code>
              <small>{attempt.latencyMs} ms</small>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RecordInspectionPanel({ report }: { report: DiagnosticReport }) {
  if (!report.recordInspection) {
    return null;
  }

  return (
    <section className="inspection-panel">
      <div className="resolver-heading">
        <div>
          <h2>DNS inspection</h2>
          <p>NS, MX, TXT, CNAME, HTTPS, and SVCB records from enabled resolvers.</p>
        </div>
      </div>
      <div className="inspection-list">
        {report.recordInspection.map((inspection) => (
          <article className="inspection-card" key={inspection.resolverId}>
            <div className="resolver-heading">
              <h3>{inspection.resolverName}</h3>
              <span className={`status-pill status-${inspection.status}`}>{formatStatus(inspection.status)}</span>
            </div>
            <RecordList result={inspection} />
          </article>
        ))}
      </div>
    </section>
  );
}

function ResolverResults({ results }: { results: ResolverCheckResult[] }) {
  return (
    <section className="resolver-list" aria-label="Resolver results">
      {results.map((result) => (
        <article className="resolver-card" key={result.resolverId}>
          <div className="resolver-heading">
            <div>
              <h3>{result.resolverName}</h3>
              <p>{result.latencyMs} ms</p>
            </div>
            <span className={`status-pill status-${result.status}`}>{formatStatus(result.status)}</span>
          </div>
          <RecordList result={result} />
        </article>
      ))}
    </section>
  );
}

function RecordList({ result }: { result: ResolverCheckResult | RecordInspectionResult }) {
  const addressRecords = result.records.filter((record) => record.type === "A" || record.type === "AAAA");
  const cnameRecords = result.records.filter((record) => record.type === "CNAME");
  const otherRecords = result.records.filter((record) => record.type !== "A" && record.type !== "AAAA" && record.type !== "CNAME");
  const errors = result.queries.filter((query) => query.error);

  if (addressRecords.length === 0 && cnameRecords.length === 0 && otherRecords.length === 0 && errors.length === 0) {
    return <p className="muted-text">No records returned for the queried types.</p>;
  }

  return (
    <div className="record-stack">
      <div className="query-detail-row">
        {result.queries.map((query) => (
          <span key={query.recordType}>
            {query.recordType}: {formatStatus(query.status)} - {query.latencyMs} ms
            {query.authenticatedData ? " - AD" : ""}
            {query.truncated ? " - truncated" : ""}
          </span>
        ))}
      </div>
      {cnameRecords.map((record) => (
        <div className="record-row" key={`${record.type}-${record.value}`}>
          <span>{record.type}</span>
          <code>
            {record.value} - TTL {record.ttl}s
          </code>
        </div>
      ))}
      {addressRecords.map((record) => (
        <div className="record-row" key={`${record.type}-${record.value}`}>
          <span>{record.type}</span>
          <code>
            {record.value} - TTL {record.ttl}s
          </code>
        </div>
      ))}
      {otherRecords.map((record) => (
        <div className="record-row" key={`${record.type}-${record.value}`}>
          <span>{record.type}</span>
          <code>
            {record.value} - TTL {record.ttl}s
          </code>
        </div>
      ))}
      {errors.map((query) => (
        <div className="record-row is-error" key={`${query.recordType}-${query.error}`}>
          <span>{query.recordType}</span>
          <code>{query.error ?? "DNS query failed"}</code>
        </div>
      ))}
    </div>
  );
}

function BenchmarkView(props: {
  benchmark: BenchmarkReport | null;
  isBenchmarking: boolean;
  onRunBenchmark: () => void;
}) {
  return (
    <section className="view-stack">
      <div className="button-row">
        <button className="primary-button" disabled={props.isBenchmarking} onClick={props.onRunBenchmark} type="button">
          <Gauge aria-hidden="true" size={17} />
          <span>{props.isBenchmarking ? "Benchmarking..." : "Run Benchmark"}</span>
        </button>
      </div>

      {props.benchmark ? (
        <section className="benchmark-table" aria-label="Benchmark results">
          {props.benchmark.results.map((result) => (
            <article className="resolver-card" key={result.resolverId}>
              <div className="resolver-heading">
                <div>
                  <h3>{result.resolverName}</h3>
                  <p>
                    {result.successfulQueries}/{result.totalQueries} checks completed
                  </p>
                </div>
                <span className="latency-chip">
                  {result.medianLatencyMs === null ? "n/a" : `${result.medianLatencyMs} ms`}
                </span>
              </div>
              <div className="meter" aria-label={`Failure rate ${Math.round(result.failureRate * 100)} percent`}>
                <span style={{ width: `${Math.round(result.failureRate * 100)}%` }} />
              </div>
              <p className="muted-text">Failure rate: {Math.round(result.failureRate * 100)}%</p>
            </article>
          ))}
        </section>
      ) : (
        <section className="plain-panel">
          <p>
            Benchmark uses static sample hostnames and sends them directly to the selected DNS-over-HTTPS resolvers. It
            does not inspect browsing history.
          </p>
        </section>
      )}
    </section>
  );
}

function GuidesView() {
  return (
    <section className="view-stack">
      <section className="plain-panel">
        <p>This build includes Chrome Secure DNS guidance only.</p>
      </section>
      {secureDnsGuides.map((guide) => (
        <article className="guide-section" key={guide.id}>
          <div className="guide-heading">
            <h2>{guide.title}</h2>
            {guide.id === "chrome" ? (
              <button className="icon-button" onClick={openChromeSecuritySettings} title="Open Chrome security settings" type="button">
                <ExternalLink aria-hidden="true" size={16} />
              </button>
            ) : null}
          </div>
          <ol>
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {guide.note ? <p className="muted-text">{guide.note}</p> : null}
        </article>
      ))}
    </section>
  );
}

function PrivacyView({ onClearData }: { onClearData: () => void }) {
  return (
    <section className="view-stack">
      <section className="plain-panel">
        <ul className="privacy-list">
          {privacyPrinciples.map((principle) => (
            <li key={principle}>
              <CheckCircle2 aria-hidden="true" size={15} />
              <span>{principle}</span>
            </li>
          ))}
        </ul>
      </section>
      <button className="danger-button" onClick={onClearData} type="button">
        <Trash2 aria-hidden="true" size={16} />
        <span>Clear Local Data</span>
      </button>
    </section>
  );
}

function SettingsView(props: {
  settings: AppSettings;
  onToggleResolver: (resolverId: ResolverId) => void;
  onUpdateSettings: (settings: AppSettings) => void;
}) {
  const resolvers = Object.values(resolverRegistry);

  return (
    <section className="view-stack">
      <section className="plain-panel">
        <h2>Resolvers</h2>
        <div className="settings-stack">
          {resolvers.map((resolver) => (
            <label className="check-row" key={resolver.id}>
              <input
                checked={props.settings.enabledResolverIds.includes(resolver.id)}
                onChange={() => props.onToggleResolver(resolver.id)}
                type="checkbox"
              />
              <span>
                <strong>{resolver.name}</strong>
                <small>{resolver.endpointUrl}</small>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="plain-panel">
        <label className="select-row">
          <span>Language</span>
          <select
            onChange={(event) =>
              props.onUpdateSettings({ ...props.settings, language: event.target.value === "id" ? "id" : "en" })
            }
            value={props.settings.language}
          >
            <option value="en">English</option>
            <option value="id">Indonesian-ready</option>
          </select>
        </label>
      </section>

      <section className="plain-panel">
        <label className="select-row">
          <span>Theme</span>
          <select
            onChange={(event) =>
              props.onUpdateSettings({ ...props.settings, theme: event.target.value === "light" ? "light" : "dark" })
            }
            value={props.settings.theme}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
      </section>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="plain-panel empty-state">
      <Activity aria-hidden="true" size={22} />
      <p>Enter a hostname or use the active tab, then run a DNS check.</p>
    </section>
  );
}

function StatusNotice({ message }: { message: string }) {
  return (
    <div className="status-notice" role="status">
      <TriangleAlert aria-hidden="true" size={16} />
      <span>{message}</span>
    </div>
  );
}

function formatStatus(status: ResolverCheckResult["status"]): string {
  if (status === "success") {
    return "Success";
  }
  if (status === "no-records") {
    return "No records";
  }
  return "Failed";
}

function formatProbeStatus(status: NonNullable<DiagnosticReport["siteProbe"]>["status"]): string {
  const labels: Record<NonNullable<DiagnosticReport["siteProbe"]>["status"], string> = {
    reachable: "Reachable",
    "http-error": "HTTP error",
    "redirected-to-different-host": "Redirect",
    "https-failed-http-reachable": "HTTPS issue",
    "network-error": "No response",
    "permission-denied": "No access",
    "unsupported-url": "Unsupported"
  };

  return labels[status];
}

function openChromeSecuritySettings() {
  if (typeof chrome !== "undefined" && chrome.tabs?.create) {
    chrome.tabs.create({ url: "chrome://settings/security" });
    return;
  }

  window.open("chrome://settings/security", "_blank", "noopener");
}
