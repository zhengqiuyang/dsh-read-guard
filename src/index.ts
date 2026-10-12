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
import { blockFeedback, extractText, quarantineContent, type ContentBlockLike } from './content.js';
import { decide, scanToolResult, type GuardMode } from './policy.js';

export const name = 'dsh-read-guard';

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

export const Config: Schema<Config> = Schema.object({
  mode: Schema.union(['observe', 'wrap', 'block'])
    .default('wrap')
    .description('observe: log only · wrap: taint-mark the content · block: result never reaches the model'),
  readTools: Schema.array(Schema.string())
    .default(['read', 'grep', 'glob'])
    .description('tool names whose results come from the working repo (neutral trust)'),
  fetchTools: Schema.array(Schema.string())
    .default(['web_fetch', 'web_search'])
    .description('tool names whose results come from outside the repo (untrusted)'),
  maxScanChars: Schema.number().default(200_000).description('per-result scan cap in characters'),
  quiet: Schema.boolean().default(false).description('suppress console warnings'),
});

// Harness surface used here, restated so the plugin typechecks standalone.
// Inside the source checkout these signatures are already declared by the
// harness packages; identical declarations merge cleanly.
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

type PostToolDecisionView =
  | { kind: 'accept'; content?: unknown; additionalContexts?: unknown }
  | { kind: 'block'; feedback: unknown };

declare module '@deepseek-ai/cordis' {
  interface Events {
    'tools/post-execute': (
      exec: ToolExecView,
      result: Readonly<ToolResultView>,
      next: () => Promise<PostToolDecisionView>,
    ) => Promise<PostToolDecisionView>;
  }
}

export function apply(ctx: Context, config: Config) {
  const watched = [...config.readTools, ...config.fetchTools];
  console.log(
    `[dsh-read-guard] active: mode=${config.mode}, watching ${watched.length} tool(s): ${watched.join(', ')}`,
  );
  const trustOf = new Map<string, 'neutral' | 'untrusted'>([
    ...config.readTools.map((tool) => [tool, 'neutral'] as const),
    ...config.fetchTools.map((tool) => [tool, 'untrusted'] as const),
  ]);

  ctx.on('tools/post-execute', async (exec, result, next) => {
    const decision = await next();
    if (decision.kind !== 'accept') return decision;
    if (result.isError) return decision;

    const trust = trustOf.get(exec.name);
    if (!trust) return decision;

    const text = extractText(result.content);
    if (!text) return decision;

    const findings = scanToolResult(text.slice(0, config.maxScanChars), exec.name, trust);
    const action = decide(findings, config.mode);
    if (action.kind === 'pass') return decision;

    if (!config.quiet) {
      console.warn(`[dsh-read-guard] ${exec.name}: ${action.summary}`);
    }
    if (action.kind === 'log-only') return decision;
    if (action.kind === 'block') {
      return {
        kind: 'block',
        feedback: blockFeedback(exec.name, action.findings),
      };
    }
    return {
      kind: 'accept',
      content: quarantineContent(result.content, exec.name, action.findings),
      ...(decision.additionalContexts !== undefined
        ? { additionalContexts: decision.additionalContexts }
        : {}),
    };
  });
}
