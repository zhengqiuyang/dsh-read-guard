/**
 * Pure decision policy: findings from the rule engine → the action this plugin
 * takes on one tool result. No Cordis, no I/O — fully unit-testable.
 */
import { type Finding, type TrustLevel } from './vendor/rig-core/rules.js';
/** What to do with a tool result that carries findings. */
export type GuardMode = 'observe' | 'wrap' | 'block';
export type GuardAction = {
    kind: 'pass';
} | {
    kind: 'log-only';
    summary: string;
} | {
    kind: 'wrap';
    summary: string;
    findings: Finding[];
} | {
    kind: 'block';
    summary: string;
    findings: Finding[];
};
export declare function summarize(findings: Finding[]): string;
/**
 * Only high-severity findings mutate the result. Medium/low (scoped env probe,
 * second-person directives) are precision-first signals: report them, never
 * mangle legitimate content over them.
 */
export declare function decide(findings: Finding[], mode: GuardMode): GuardAction;
/**
 * Scan one tool-result text. Tool results are event-shaped content, not files:
 * markdown-like (fetches render to markdown, reads carry fenced blocks), never
 * an instruction file, and never more trusted than the channel it arrived on.
 */
export declare function scanToolResult(text: string, toolName: string, trust: TrustLevel): Finding[];
