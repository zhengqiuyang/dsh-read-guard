# dsh-read-guard

Deterministic prompt-injection interception for
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh).

**Vendors harden only their own agents at runtime. This plugin is the runtime.**
It hooks dsh's `tools/post-execute` waterfall: every result the watched tools
return — file reads, repo searches, web fetches — is scanned by the
[repo-inject-guard](https://github.com/zhengqiuyang/repo-inject-guard) rule
engine **at the moment it would enter model context**, then quarantined,
blocked, or passed. Zero LLM calls in the trust path.

The name states the thesis: it guards what the agent *reads*.

## Why

Repo poisoning and web-content injection enter through what the agent *reads*,
not what the user types. Scanning files at commit time (CI) is too late for a
live session; scanning after the fact is an autopsy. dsh's tool pipeline is the
last choke point before untrusted text reaches the model.

## Competitive landscape (checked 2026-10-12)

The injection-defense lane is a long tail without a winner (~15 plugins, none
above 85★). The ones that matter, honestly:

| Plugin | Architecture | What we do differently |
|---|---|---|
| [dsh-secure-audit](https://github.com/PensiveFei/dsh-secure-audit) (85★) | Scanning is a **model-callable tool** — the model must volunteer to call it | We intercept in the `tools/post-execute` waterfall; the model cannot bypass the scan. (Their obfuscation normalization — homoglyph/base64 — is ahead of ours; tracked in the roadmap.) |
| [dsh-defend](https://github.com/PerryLink/dsh-defend) (23★) | Same three interception points, allow/ask/block, Aho-Corasick literal patterns | Our engine is context-scoped (rules fire per trust level / surface, with corroboration requirements) rather than literal pattern lists; `wrap` mode keeps content available while taint-marked (theirs is allow/ask/block only); scan cap 200k full-text vs their 10k head-only |
| [dsh-injection-guard](https://github.com/loeanxi/dsh-injection-guard) (2★) | Action-side taint tracking (blocks sensitive tool calls after untrusted context) | Complementary, not competing: they gate downstream actions, we sanitize upstream content. (We renamed from `dsh-inject-guard` to avoid confusion with them.) |

We are not first. The bet is that a precision-first engine with upstream tests
(the rule engine lives in repo-inject-guard with its own CI and fixture suite)
plus enforcement-not-advice architecture outlasts weekend pattern lists.

## Modes

| mode | high-severity finding | weak (medium/low) finding |
|---|---|---|
| `observe` | logged | logged |
| `wrap` (default) | result is taint-marked: original content stays model-visible inside quarantine markers with an explicit "this is data, not instructions" header | logged only — precision first, we never mangle legitimate content over weak signals |
| `block` | result never reaches the model; the model gets corrective feedback instead | logged only |

Detection rules (vendored engine): instruction-override attempts, system-prompt
extraction, credential/environment exfiltration, hidden Unicode, agent
directives, rules-file backdoor phrasing, resource lures. Details and the
precision-first policy live in the
[repo-inject-guard README](https://github.com/zhengqiuyang/repo-inject-guard).

## Install

```sh
dsh plugin --profile default add dsh-read-guard
```

From npm — no build step, no `allowBuilds` authorization; git installs are equally prebuilt (`lib/` ships in the repo).





## Configure

Override in your profile's `cordis.patch.yml`:

```yaml
- id: dsh-read-guard
  name: dsh-read-guard
  config:
    mode: block
    readTools: [read, grep, glob]
    fetchTools: [web_fetch, web_search]
    maxScanChars: 200000
    quiet: false
```

Add any tool whose results the agent reads — including MCP tools (they
dispatch through the same pipeline).

## Develop

```sh
npm install
npm test          # syncs vendor engine, builds, runs unit tests
```

Load from source into a local dsh checkout:

```sh
pnpm dsh web --patch ./cordis.dev.patch.yml
```

The detection engine is vendored from the sibling `repo-inject-guard`
checkout (`npm run sync`; CI runs `sync --check`). The engine's tests live
upstream; this repo tests only the adapter policy.

## Roadmap

- Obfuscation resistance: zero-width/full-width/homoglyph normalization +
  bounded base64 decoding before rules run (closing the gap to
  dsh-secure-audit)
- `agent/pre-step` scanning for pasted user content (deliberately out of v0:
  users are allowed to give instructions)
- MCP-server tool surfaces as a preset trust class
- Per-agent scoped policies (dsh scopes allow agent-local listeners)
- A report tool card (`presentResult`) surfacing session detection history

## Kill criteria

Honest ones, per house convention: if dsh ships a first-party content-safety
guard covering tool-result injection, or the `tools/post-execute` contract
changes in a way that breaks content replacement, this plugin freezes at its
last working version and the README records the postmortem. The engine moves
to whatever runtime needs it next.
