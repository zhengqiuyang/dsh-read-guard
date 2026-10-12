/**
 * ContentBlock text handling. DSH's ContentBlock union is extensible via
 * declaration merging; this module treats it structurally so the pure logic
 * (and the tests) never need the host packages. Only `text` blocks are
 * scanned or rewritten; every other block type passes through untouched.
 */
import type { Finding } from './vendor/rig-core/rules.js';
export interface TextBlock {
    type: 'text';
    text: string;
}
export type ContentBlockLike = TextBlock | ({
    type: string;
} & Record<string, unknown>);
export declare function isTextBlock(block: ContentBlockLike): block is TextBlock;
/** Join the text of all text blocks — the part of a result the model reads as prose. */
export declare function extractText(blocks: readonly ContentBlockLike[]): string;
/**
 * Wrap mode: keep the content model-visible but taint-marked. The canonical
 * value is untouched (content replacement is a projection change); the model
 * is told explicitly that everything inside the fence is data, not orders.
 */
export declare function quarantineContent(blocks: readonly ContentBlockLike[], toolName: string, findings: Finding[]): ContentBlockLike[];
/**
 * Block mode: the result never reaches the model. The feedback explains why
 * and tells the model how to proceed safely.
 */
export declare function blockFeedback(toolName: string, findings: Finding[]): ContentBlockLike[];
