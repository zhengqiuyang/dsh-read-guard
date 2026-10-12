export type Severity = 'high' | 'medium' | 'low';
export type TrustLevel = 'trusted' | 'neutral' | 'untrusted';
export type Verdict = 'PASS' | 'WARN' | 'FAIL';
export type RuleId = 'INSTR_OVERRIDE' | 'SYSTEM_PROMPT_EXFIL' | 'CREDS_EXFIL' | 'ENV_PROBE' | 'HIDDEN_UNICODE' | 'AGENT_DIRECTIVE' | 'RULES_BACKDOOR' | 'RESOURCE_LURE';
export interface RuleInfo {
    id: RuleId;
    severity: Severity;
    summary: string;
    description: string;
}
export declare const RULES: Record<RuleId, RuleInfo>;
export declare const RULE_ORDER: RuleId[];
export interface FileLocation {
    kind: 'file';
    path: string;
    line: number;
}
export interface EventLocation {
    kind: 'event';
    source: string;
    url?: string;
    author?: string;
    authorAssociation?: string;
}
export type FindingLocation = FileLocation | EventLocation;
export interface Finding {
    ruleId: RuleId;
    severity: Severity;
    message: string;
    /** Capped at 120 chars, control characters escaped. */
    evidence: string;
    location: FindingLocation;
    trust: TrustLevel;
}
export interface RuleContext {
    kind: 'file' | 'event';
    location: FindingLocation;
    /** markdown-ish text (md files, .cursorrules, issue bodies) */
    markdownLike: boolean;
    /** instruction files (agent-surface markdown) and tracker text */
    instructionFile: boolean;
    trust?: TrustLevel;
}
/** Mixed-script / non-latin hostname detector (homoglyph lookalike domains). */
export declare function homoglyphHostCheck(host: string): {
    flag: boolean;
    scripts: string[];
};
export declare function applyRules(text: string, ctx: RuleContext): Finding[];
/**
 * GitHub author_association -> trust tier.
 * MEMBER/OWNER are trusted; NONE/FIRST_TIME_CONTRIBUTOR are untrusted
 * (stricter verdict); everything else (CONTRIBUTOR, COLLABORATOR, unknown)
 * is neutral.
 */
export declare function associationToTrust(association?: string): TrustLevel;
/**
 * Does this finding, on its own, force a FAIL verdict?
 *
 *   severity | neutral (files) | untrusted author | trusted author
 *   high     | FAIL            | FAIL             | WARN *  (* except CREDS_EXFIL: always FAIL,
 *   medium   | WARN            | FAIL             | WARN      a compromised owner account is a
 *   low      | WARN            | WARN             | WARN      real attack path)
 */
export declare function findingCausesFail(f: Finding): boolean;
export declare function computeVerdict(findings: Finding[]): Verdict;
export declare function sortFindings(findings: Finding[]): Finding[];
export declare function countBySeverity(findings: Finding[]): {
    high: number;
    medium: number;
    low: number;
};
