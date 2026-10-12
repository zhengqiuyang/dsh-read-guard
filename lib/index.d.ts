/**
 * dsh-read-guard — deterministic prompt-injection interception for
 * DeepSeek Harness.
 *
 * Hooks the `tools/post-execute` waterfall: every result the watched tools
 * (file reads, searches, web fetches) return is scanned by the repo-inject-
 * guard rule engine BEFORE it enters model context. High-severity findings
 * quarantine-wrap or block the result; weak signals are logged only.
 * Zero LLM calls in the trust path.
 *
 * Thin adapter: the detection engine is vendored from repo-inject-guard
 * (`npm run sync`), this file only bridges Cordis <-> policy.
 */
import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import { type ContentBlockLike } from './content.js';
import { type GuardMode } from './policy.js';
export declare const name = "dsh-read-guard";
export interface Config {
    /** observe = log only · wrap = taint-mark content · block = never reach the model */
    mode: GuardMode;
    /** Tools whose results come from the working repo (neutral trust). */
    readTools: string[];
    /** Tools whose results come from outside the repo (untrusted). */
    fetchTools: string[];
    /** Cap per-result scanning; matches beyond this many characters are not seen. */
    maxScanChars: number;
    /** Suppress console warnings (actions still apply). */
    quiet: boolean;
}
export declare const Config: Schema<Config>;
interface ToolExecView {
    readonly name: string;
    readonly agent?: unknown;
}
interface ToolSuccessView {
    readonly isError: false;
    readonly content: ContentBlockLike[];
}
interface ToolFailureView {
    readonly isError: true;
}
type ToolResultView = ToolSuccessView | ToolFailureView;
type PostToolDecisionView = {
    kind: 'accept';
    content?: unknown;
    additionalContexts?: unknown;
} | {
    kind: 'block';
    feedback: unknown;
};
declare module '@deepseek-ai/cordis' {
    interface Events {
        'tools/post-execute': (exec: ToolExecView, result: Readonly<ToolResultView>, next: () => Promise<PostToolDecisionView>) => Promise<PostToolDecisionView>;
    }
}
export declare function apply(ctx: Context, config: Config): void;
export {};
