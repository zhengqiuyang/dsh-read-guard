/**
 * Pure decision policy: findings from the rule engine → the action this plugin
 * takes on one tool result. No Cordis, no I/O — fully unit-testable.
 */
import { applyRules } from './vendor/rig-core/rules.js';
export function summarize(findings) {
    const ids = [...new Set(findings.map((f) => f.ruleId))];
    return `${findings.length} finding(s): ${ids.join(', ')}`;
}
/**
 * Only high-severity findings mutate the result. Medium/low (scoped env probe,
 * second-person directives) are precision-first signals: report them, never
 * mangle legitimate content over them.
 */
export function decide(findings, mode) {
    const high = findings.filter((f) => f.severity === 'high');
    if (high.length === 0) {
        return findings.length > 0 ? { kind: 'log-only', summary: summarize(findings) } : { kind: 'pass' };
    }
    const summary = summarize(high);
    if (mode === 'observe')
        return { kind: 'log-only', summary };
    if (mode === 'block')
        return { kind: 'block', summary, findings: high };
    return { kind: 'wrap', summary, findings: high };
}
/**
 * Scan one tool-result text. Tool results are event-shaped content, not files:
 * markdown-like (fetches render to markdown, reads carry fenced blocks), never
 * an instruction file, and never more trusted than the channel it arrived on.
 */
export function scanToolResult(text, toolName, trust) {
    return applyRules(text, {
        kind: 'event',
        location: { kind: 'event', source: `tool:${toolName}` },
        markdownLike: true,
        instructionFile: false,
        trust,
    });
}
/** Synthesized finding for path-level credential access (content unseen). */
export function credentialPathFinding(toolName, path) {
    return {
        // Plugin-synthesized id, not an engine rule id.
        ruleId: 'CRED_FILE_ACCESS',
        severity: 'high',
        message: `credential-material file read (${path})`,
        evidence: path.slice(0, 120),
        location: { kind: 'event', source: `tool:${toolName}` },
        trust: 'untrusted',
    };
}
