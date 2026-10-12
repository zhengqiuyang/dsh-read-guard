/**
 * Pure decision policy: findings from the rule engine → the action this plugin
 * takes on one tool result. No Cordis, no I/O — fully unit-testable.
 */
import { applyRules, type Finding, type TrustLevel } from './vendor/rig-core/rules.js';

/** What to do with a tool result that carries findings. */
export type GuardMode = 'observe' | 'wrap' | 'block';

export type GuardAction =
  | { kind: 'pass' }
  | { kind: 'log-only'; summary: string }
  | { kind: 'wrap'; summary: string; findings: Finding[] }
  | { kind: 'block'; summary: string; findings: Finding[] };

export function summarize(findings: Finding[]): string {
  const ids = [...new Set(findings.map((f) => f.ruleId))];
  return `${findings.length} finding(s): ${ids.join(', ')}`;
}

/**
 * Only high-severity findings mutate the result. Medium/low (scoped env probe,
 * second-person directives) are precision-first signals: report them, never
 * mangle legitimate content over them.
 */
export function decide(findings: Finding[], mode: GuardMode): GuardAction {
  const high = findings.filter((f) => f.severity === 'high');
  if (high.length === 0) {
    return findings.length > 0 ? { kind: 'log-only', summary: summarize(findings) } : { kind: 'pass' };
  }
  const summary = summarize(high);
  if (mode === 'observe') return { kind: 'log-only', summary };
  if (mode === 'block') return { kind: 'block', summary, findings: high };
  return { kind: 'wrap', summary, findings: high };
}

/**
 * Scan one tool-result text. Tool results are event-shaped content, not files:
 * markdown-like (fetches render to markdown, reads carry fenced blocks), never
 * an instruction file, and never more trusted than the channel it arrived on.
 */
export function scanToolResult(text: string, toolName: string, trust: TrustLevel): Finding[] {
  return applyRules(text, {
    kind: 'event',
    location: { kind: 'event', source: `tool:${toolName}` },
    markdownLike: true,
    instructionFile: false,
    trust,
  });
}

/** Synthesized finding for path-level credential access (content unseen). */
export function credentialPathFinding(toolName: string, path: string): Finding {
  return {
    // Plugin-synthesized id, not an engine rule id.
    ruleId: 'CRED_FILE_ACCESS' as Finding['ruleId'],
    severity: 'high',
    message: `credential-material file read (${path})`,
    evidence: path.slice(0, 120),
    location: { kind: 'event', source: `tool:${toolName}` },
    trust: 'untrusted',
  };
}
