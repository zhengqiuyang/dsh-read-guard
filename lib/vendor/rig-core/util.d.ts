/**
 * Small shared helpers: CRLF-tolerant line splitting, glob matching,
 * evidence excerpts and hidden-Unicode codepoint tables.
 */
export declare function toPosix(p: string): string;
/** Normalize a repo-relative path for matching: posix separators, no leading "./". */
export declare function normalizeRel(p: string): string;
export declare function escapeRegex(s: string): string;
export declare function basename(p: string): string;
/**
 * Convert a glob pattern to an anchored RegExp.
 * Supported: a `**` segment (any characters including the path separator),
 * a `**` segment followed by a separator (zero or more directories),
 * `*` (any characters except the separator) and `?` (one such character).
 * Matching is case-insensitive: agent manifests are matched leniently because
 * case tricks ("agents.md" vs "AGENTS.md") are a cheap obfuscation and
 * default filesystems on Windows/macOS resolve case-insensitively anyway.
 */
export declare function globToRegex(pattern: string): RegExp;
/**
 * Match a repo-relative posix path against a glob.
 * - Patterns containing `/` are anchored globs against the full path.
 * - Bare filenames (e.g. `AGENTS.md`) match by basename at any depth,
 *   because agents discover nested copies of these files too.
 */
export declare function pathMatchesGlob(relPosix: string, pattern: string): boolean;
/**
 * Split text into lines. Tolerates CRLF, LF and lone CR so that fixtures and
 * real-world files behave identically on Windows checkouts.
 */
export declare function splitLines(text: string): string[];
/**
 * Evidence excerpt: invisible/control characters are shown as \uXXXX escapes,
 * whitespace is collapsed and the result is capped (default 120 chars).
 */
export declare function excerpt(raw: string, max?: number): string;
/** Hidden / bidi Unicode codepoints we always report. */
export declare const HIDDEN_CODEPOINT_NAMES: Record<string, string>;
/**
 * Names of hidden codepoints present in `text`, in order of first appearance,
 * de-duplicated.
 */
export declare function findHiddenCodepointNames(text: string): string[];
export declare function errMsg(e: unknown): string;
