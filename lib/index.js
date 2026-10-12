import Schema from '@deepseek-ai/schemastery';
import { blockFeedback, extractText, quarantineContent } from './content.js';
import { decide, scanToolResult } from './policy.js';
export const name = 'dsh-read-guard';
export const Config = Schema.object({
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
export function apply(ctx, config) {
    const watched = [...config.readTools, ...config.fetchTools];
    console.log(`[dsh-read-guard] active: mode=${config.mode}, watching ${watched.length} tool(s): ${watched.join(', ')}`);
    const trustOf = new Map([
        ...config.readTools.map((tool) => [tool, 'neutral']),
        ...config.fetchTools.map((tool) => [tool, 'untrusted']),
    ]);
    ctx.on('tools/post-execute', async (exec, result, next) => {
        const decision = await next();
        if (decision.kind !== 'accept')
            return decision;
        if (result.isError)
            return decision;
        const trust = trustOf.get(exec.name);
        if (!trust)
            return decision;
        const text = extractText(result.content);
        if (!text)
            return decision;
        const findings = scanToolResult(text.slice(0, config.maxScanChars), exec.name, trust);
        const action = decide(findings, config.mode);
        if (action.kind === 'pass')
            return decision;
        if (!config.quiet) {
            console.warn(`[dsh-read-guard] ${exec.name}: ${action.summary}`);
        }
        if (action.kind === 'log-only')
            return decision;
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
