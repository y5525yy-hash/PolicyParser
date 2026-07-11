# Offline Policy Knowledge Base Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build an offline-first, traceable policy knowledge base containing at least 30 officially sourced policies, preserving full text, versions, clauses, extraction layers, and searchable chunks for the A and C modules.

**Architecture:** Keep the public `Policy` contract unchanged during the first phase. Store approved official text and metadata under A-owned `features/policy/knowledge-base/`, generate deterministic JSONL documents and chunks with Node.js scripts, and expose a small adapter that converts verified active knowledge-base records into the existing UI shape. Default search reads only active, human-verified chunks; historical and invalid documents remain stored but are excluded from the active index.

**Tech Stack:** Next.js 16, React 19, strict TypeScript, Node.js 22 built-in modules, JSON/JSONL, native CSS, `node:test`, npm.

---

## Locked product decisions

- Store at least 30 policies before calling the knowledge base demo-ready.
- Preserve the government website's official policy category as the primary category.
- Do not create a second category taxonomy. Use tags for audience, locality, topic, and whether a policy is general or Xihongmen-specific.
- Commit normalized text and metadata to Git.
- Keep large PDFs in an audited import package or Git LFS; do not put large binaries in the ordinary repository history.
- Store current, historical, superseded, and invalid versions, but only current active and human-verified versions enter default search.
- Show only active, human-verified policies in the demo UI.
- Keep official text, deterministic extraction, AI draft extraction, and human-confirmed extraction separate.
- Do not send resident information to public models, public vector databases, or unapproved APIs.
- Runtime search and the demo must work without internet access.

## Target directory layout

```text
features/policy/knowledge-base/
  README.md
  schema.ts
  catalog.ts
  adapter.ts
  data/
    manifest.json
    sources/
      <documentId>.txt
    extractions/
      <policyId>.json
    generated/
      documents.jsonl
      chunks.jsonl
      active-chunks.jsonl
  scripts/
    validate-manifest.mjs
    build-knowledge-base.mjs
    search-policies.mjs
  tests/
    fixtures/
    validate-manifest.test.mjs
    chunk-policy.test.mjs
    search-policies.test.mjs
```

## Official category coverage target

The exact category string must be copied from the official source page. The initial collection target is:

| Official category family | Minimum active policies |
| --- | ---: |
| 民政、扶贫、救灾 / 社会福利、社会救助 | 10 |
| 劳动、人事、监察 / 社会保障 | 6 |
| 卫生、体育 / 医疗保障 | 4 |
| 人口与生育、妇女儿童 | 4 |
| 城乡建设、环境保护 / 住房保障 | 4 |
| Other directly relevant official categories | 2 |
| Total | 30 |

Candidate topics include elderly allowances, elderly care support, disability support, minimum living allowance, temporary assistance, special hardship support, resident pension insurance, resident medical insurance, medical assistance, serious illness assistance, orphan and disadvantaged-child support, child disability rehabilitation, housing rental subsidy, public rental housing, employment assistance, and funeral/basic livelihood support. A candidate becomes part of the count only after its official URL, full text, status, and dates are verified.

### Task 1: Freeze the internal knowledge-base schema

**Objective:** Define A-owned document, policy item, chunk, extraction, version, and search-result types without modifying `shared/`.

**Files:**
- Create: `features/policy/knowledge-base/schema.ts`
- Create: `features/policy/knowledge-base/README.md`

**Step 1: Define internal types**

Create types equivalent to:

```ts
export type DocumentStatus = "active" | "historical" | "superseded" | "invalid";
export type VerificationStatus =
  | "collected"
  | "extracted"
  | "ai_draft"
  | "human_verified";

export interface SourceDocument {
  documentId: string;
  policyIds: string[];
  officialName: string;
  documentNumber?: string;
  officialCategory: string;
  issuingAuthorities: string[];
  region: string;
  publishedAt?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: DocumentStatus;
  replacesDocumentIds: string[];
  replacedByDocumentId?: string;
  officialUrl: string;
  interpretationUrls: string[];
  sourceTextPath: string;
  sourceFilePath?: string;
  contentSha256: string;
  collectedAt: string;
  verifiedAt?: string;
  verificationStatus: VerificationStatus;
  tags: string[];
}

export interface PolicyItem {
  policyId: string;
  documentIds: string[];
  name: string;
  region: string;
  tags: string[];
  status: DocumentStatus;
  verificationStatus: VerificationStatus;
}

export interface PolicyChunk {
  policyId: string;
  documentId: string;
  chunkId: string;
  policyName: string;
  section: string;
  clauseNumber?: string;
  region: string;
  officialCategory: string;
  publishedAt?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: DocumentStatus;
  verificationStatus: VerificationStatus;
  officialUrl: string;
  text: string;
  tags: string[];
}
```

**Step 2: Document invariants**

The README must state:

- official text is immutable after import; corrections create a new source revision;
- AI output never overwrites source text;
- `policyId` must exist in `shared/demo-constants.ts` before becoming a UI policy;
- all chunks retain source lineage;
- `status === "active" && verificationStatus === "human_verified"` is required for default search and UI display;
- tags use stable prefixes such as `scope:beijing`, `scope:daxing`, `scope:xihongmen`, `locality:general`, `locality:xihongmen`, and `audience:children`.

**Step 3: Verify TypeScript**

Run: `./node_modules/.bin/tsc --noEmit`

Expected: exit code 0.

**Step 4: Commit**

```bash
git add features/policy/knowledge-base/schema.ts features/policy/knowledge-base/README.md
git commit -m "feat: define policy knowledge base schema"
```

### Task 2: Create a manifest validator with tests

**Objective:** Reject unstable IDs, missing sources, duplicate documents, invalid dates, and unsearchable active records before generation.

**Files:**
- Create: `features/policy/knowledge-base/scripts/validate-manifest.mjs`
- Create: `features/policy/knowledge-base/tests/fixtures/valid-manifest.json`
- Create: `features/policy/knowledge-base/tests/fixtures/duplicate-policy-id.json`
- Create: `features/policy/knowledge-base/tests/validate-manifest.test.mjs`
- Create: `features/policy/knowledge-base/data/manifest.json`

**Step 1: Write failing tests**

Tests must cover:

```js
test("accepts stable unique policy and document ids", () => {});
test("rejects duplicate document ids", () => {});
test("rejects a UI policyId missing from demo constants", () => {});
test("rejects active human-verified documents without full source text", () => {});
test("rejects effectiveTo before effectiveFrom", () => {});
test("rejects invalid documents marked searchable", () => {});
```

Run: `node --test features/policy/knowledge-base/tests/validate-manifest.test.mjs`

Expected: FAIL because the validator does not exist.

**Step 2: Implement deterministic validation**

Export:

```js
export function validateManifest(manifest, options = {}) {
  const errors = [];
  // Validate IDs, paths, official URLs, status, dates, hashes and verification.
  return errors;
}
```

The CLI must print every error and exit 1 when validation fails.

**Step 3: Run tests**

Run: `node --test features/policy/knowledge-base/tests/validate-manifest.test.mjs`

Expected: all tests pass.

**Step 4: Commit**

```bash
git add features/policy/knowledge-base/data/manifest.json features/policy/knowledge-base/scripts/validate-manifest.mjs features/policy/knowledge-base/tests
git commit -m "feat: validate policy source manifests"
```

### Task 3: Implement clause-aware chunking

**Objective:** Split policy text by official headings and numbered clauses while preserving logical conditions and complete semantics.

**Files:**
- Create: `features/policy/knowledge-base/scripts/build-knowledge-base.mjs`
- Create: `features/policy/knowledge-base/tests/chunk-policy.test.mjs`
- Create: `features/policy/knowledge-base/tests/fixtures/conditional-policy.txt`

**Step 1: Write failing chunk tests**

Required cases:

- headings such as `第一条`, `一、`, `（一）`, and `1.` retain section lineage;
- a clause containing `且`, `或`, `不得`, `除外`, or `但` is not split mid-clause;
- chunks retain `policyId`, `documentId`, official category, date, official URL, and region;
- stable `chunkId` values are generated from document ID, section, clause, and content hash;
- repeated builds produce byte-identical JSONL.

Run: `node --test features/policy/knowledge-base/tests/chunk-policy.test.mjs`

Expected: FAIL.

**Step 2: Implement the chunker**

Export pure functions:

```js
export function normalizePolicyText(text) {}
export function splitPolicySections(text) {}
export function buildPolicyChunks(document, text) {}
export function writeJsonLines(path, rows) {}
```

Chunking rules:

- normalize whitespace without rewriting words;
- prefer chapter, article, paragraph, and item boundaries;
- never truncate a numbered clause merely to satisfy a target length;
- target 500-1200 Chinese characters, but allow longer complete clauses;
- include the nearest parent heading in each chunk;
- preserve original punctuation and enumerations.

**Step 3: Run tests**

Run: `node --test features/policy/knowledge-base/tests/chunk-policy.test.mjs`

Expected: all tests pass.

**Step 4: Commit**

```bash
git add features/policy/knowledge-base/scripts/build-knowledge-base.mjs features/policy/knowledge-base/tests
git commit -m "feat: add clause-aware policy chunking"
```

### Task 4: Separate source, extraction, and human confirmation

**Objective:** Store official clauses and structured interpretations in separate files with explicit provenance.

**Files:**
- Create: `features/policy/knowledge-base/data/extractions/policy-001.json`
- Create: `features/policy/knowledge-base/catalog.ts`
- Modify: `features/policy/knowledge-base/schema.ts`
- Test: `features/policy/knowledge-base/tests/validate-manifest.test.mjs`

**Step 1: Add extraction schema tests**

The extraction format must contain:

```json
{
  "policyId": "policy-001",
  "documentId": "bj-2019-elderly-subsidy",
  "sourceChunkIds": ["..."],
  "extractionMethod": "manual",
  "verificationStatus": "human_verified",
  "eligibility": [],
  "benefits": [],
  "materials": [],
  "procedures": [],
  "restrictions": [],
  "plainLanguage": {
    "officialInterpretationSourceIds": [],
    "aiDraft": "",
    "humanVerified": ""
  }
}
```

Eligibility conditions must preserve nested `allOf`, `anyOf`, `not`, comparison operators, units, and quoted source text.

**Step 2: Implement catalog loading**

`catalog.ts` loads generated metadata and extraction files but never writes to source text.

**Step 3: Verify**

Run:

```bash
node --test features/policy/knowledge-base/tests/validate-manifest.test.mjs
./node_modules/.bin/tsc --noEmit
```

Expected: pass.

**Step 4: Commit**

```bash
git add features/policy/knowledge-base
git commit -m "feat: separate policy text and extraction layers"
```

### Task 5: Import and fully model the existing eight policies

**Objective:** Replace the current summary-only records with full-text source documents, chunks, official interpretations, restrictions, and version metadata.

**Files:**
- Create: `features/policy/knowledge-base/data/sources/*.txt`
- Modify: `features/policy/knowledge-base/data/manifest.json`
- Create/Modify: `features/policy/knowledge-base/data/extractions/policy-001.json` through `policy-008.json`
- Modify: `features/policy/mock-policies.ts`
- Modify: `features/policy/policy-source.ts`

**Step 1: Complete source documents**

At minimum import:

- `京民养老发〔2019〕160号` once and associate it with policy-001, policy-002, and policy-003;
- the 2026 resident pension contribution notice and its official interpretation;
- the formal resident medical insurance governing policy plus the 2026 official payment FAQ;
- the minimum-living-allowance implementation rules plus the current standard notice;
- the disability two-subsidy implementation rules and official interpretation;
- the temporary-assistance rules and official interpretation when available.

**Step 2: Add complete extraction sections**

For every policy, capture:

- applicable population;
- complete eligibility clauses;
- benefits or contribution rules;
- materials;
- procedures;
- restrictions, exclusions, duplicate-benefit rules, and exceptions;
- official-interpretation-derived plain language;
- unresolved fields requiring human confirmation.

**Step 3: Generate and validate**

Run:

```bash
node features/policy/knowledge-base/scripts/validate-manifest.mjs
node features/policy/knowledge-base/scripts/build-knowledge-base.mjs
```

Expected: eight active human-verified policies; all chunks have source lineage.

**Step 4: Commit**

```bash
git add features/policy/knowledge-base features/policy/mock-policies.ts features/policy/policy-source.ts
git commit -m "data: import full text for initial policies"
```

### Task 6: Collect and verify policies 9-20

**Objective:** Expand official coverage across social welfare, social assistance, pension, medical, children, and housing categories.

**Files:**
- Modify: `shared/demo-constants.ts`
- Modify: `features/policy/knowledge-base/data/manifest.json`
- Create: `features/policy/knowledge-base/data/sources/*.txt`
- Create: `features/policy/knowledge-base/data/extractions/policy-009.json` through `policy-020.json`

**Step 1: Create a collection register**

For each candidate record the official URL, exact official category, title, document number, issuing authority, dates, current validity, interpretation URL, and whether it is general or Xihongmen-specific.

**Step 2: Verify official status**

Only government domains and approved government document packages count. Media reports may help discovery but cannot be the canonical source.

**Step 3: Add stable IDs**

Extend only `DEMO_IDS.policies` in `shared/demo-constants.ts`, without changing the `Policy` interface or shared contracts.

**Step 4: Import, extract, build, and test**

Expected: at least 20 active human-verified policies and no broken source links.

**Step 5: Commit in batches of four policies**

Use focused commits such as:

```bash
git commit -m "data: add verified child welfare policies"
git commit -m "data: add verified housing support policies"
```

### Task 7: Collect and verify policies 21-30+

**Objective:** Reach a minimum of 30 active, searchable, human-verified policies with the agreed official-category coverage.

**Files:**
- Modify: `shared/demo-constants.ts`
- Modify: `features/policy/knowledge-base/data/manifest.json`
- Create: `features/policy/knowledge-base/data/sources/*.txt`
- Create: `features/policy/knowledge-base/data/extractions/policy-021.json` onward

**Step 1: Fill category gaps**

Prioritize official categories below their minimum target. Do not add near-duplicate news articles or multiple service-guide pages as separate policies merely to reach 30.

**Step 2: Add locality tags**

Examples:

```json
["scope:beijing", "locality:general", "audience:children"]
["scope:daxing", "locality:daxing"]
["scope:xihongmen", "locality:xihongmen"]
```

Do not label a Beijing-wide policy as Xihongmen-specific merely because it is available to Xihongmen residents.

**Step 3: Build and audit**

Expected:

- at least 30 active human-verified policy items;
- every item has at least one full-text source document;
- every eligibility extraction cites one or more source chunk IDs;
- every item has official category, region, dates, status, tags, and official URL;
- inactive documents remain stored but are absent from `active-chunks.jsonl`.

**Step 4: Commit**

```bash
git add shared/demo-constants.ts features/policy/knowledge-base
git commit -m "data: complete thirty-policy verified catalog"
```

### Task 8: Add offline keyword search with version filtering

**Objective:** Give C a deterministic offline retrieval baseline before selecting a local embedding model.

**Files:**
- Create: `features/policy/knowledge-base/scripts/search-policies.mjs`
- Create: `features/policy/knowledge-base/tests/search-policies.test.mjs`

**Step 1: Write failing tests**

Tests must prove:

- eligibility queries return source clauses, not only policy names;
- returned records include `policyId`, `chunkId`, policy name, section, text, dates, status, and official URL;
- invalid, historical, and superseded records are excluded by default;
- an explicit `--include-history` option can search historical records;
- no network call is made;
- deterministic results are returned for the same input.

**Step 2: Implement search**

CLI example:

```bash
node features/policy/knowledge-base/scripts/search-policies.mjs \
  --query "年满80周岁 北京户籍" \
  --limit 5
```

Return JSON containing matched chunks and provenance. Use normalized token overlap and field weighting; do not infer resident eligibility.

**Step 3: Run tests**

Run: `node --test features/policy/knowledge-base/tests/search-policies.test.mjs`

Expected: pass.

**Step 4: Commit**

```bash
git add features/policy/knowledge-base/scripts/search-policies.mjs features/policy/knowledge-base/tests/search-policies.test.mjs
git commit -m "feat: add offline policy clause search"
```

### Task 9: Expose an A-owned retrieval adapter for C

**Objective:** Let C retrieve explanatory source chunks without changing public shared contracts prematurely.

**Files:**
- Create: `features/policy/knowledge-base/retrieval.ts`
- Create: `features/policy/knowledge-base/retrieval.test.ts` only if the repository gains a TypeScript test runner; otherwise test the underlying `.mjs` search module with `node:test`

**Step 1: Define the internal result**

```ts
export interface PolicyRetrievalResult {
  policyId: string;
  chunkId: string;
  policyName: string;
  section: string;
  text: string;
  officialUrl: string;
  region: string;
  publishedAt?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: "active";
  tags: string[];
  score: number;
}
```

**Step 2: Add retrieval functions**

```ts
export async function searchPolicyClauses(query: string): Promise<PolicyRetrievalResult[]>;
export async function getPolicyEligibilityClauses(policyId: string): Promise<PolicyRetrievalResult[]>;
```

The adapter reads local generated JSONL only.

**Step 3: Produce C integration examples**

Document that C uses returned clauses to explain possible matches but continues to use deterministic rules for eligibility decisions.

**Step 4: Commit**

```bash
git add features/policy/knowledge-base/retrieval.ts features/policy/knowledge-base/README.md
git commit -m "feat: expose policy clause retrieval adapter"
```

### Task 10: Drive the existing UI from verified knowledge-base data

**Objective:** Keep the current pages while replacing hand-maintained summaries with verified active records through an adapter.

**Files:**
- Create: `features/policy/knowledge-base/adapter.ts`
- Modify: `features/policy/mock-policies.ts`
- Modify: `features/policy/policy-source.ts`
- Modify: `app/policies/page.tsx`
- Modify: `app/policies/[id]/page.tsx`

**Step 1: Implement the adapter**

The adapter must only expose records where:

```ts
status === "active" && verificationStatus === "human_verified"
```

It maps verified extraction fields into the current public `Policy` shape without losing the original source in the knowledge-base layer.

**Step 2: Add UI provenance**

Detail pages must show:

- official policy name;
- document number when present;
- official category;
- issuing authority;
- applicable dates;
- current status;
- official URL;
- official interpretation link when present;
- human verification date.

**Step 3: Verify UI routes**

Open:

```text
/policies
/policies/policy-001
/policies/policy-008
/policies/policy-030
```

Expected: only active human-verified policies appear; no page requires internet access to render.

**Step 4: Commit**

```bash
git add features/policy app/policies
git commit -m "feat: render verified policy catalog"
```

### Task 11: Add audited offline update packages

**Objective:** Support policy updates in an intranet without runtime web scraping.

**Files:**
- Create: `features/policy/knowledge-base/import-package/README.md`
- Create: `features/policy/knowledge-base/import-package/package-manifest.example.json`
- Modify: `features/policy/knowledge-base/scripts/build-knowledge-base.mjs`

**Step 1: Define package contents**

```text
package-manifest.json
sources/*.txt
attachments/*.pdf  # optional, external or Git LFS
signatures/sha256.txt
```

**Step 2: Validate package hashes**

Reject missing files, unexpected files, duplicate IDs, hash mismatches, and attempts to downgrade an active document without an explicit supersession relation.

**Step 3: Document the review flow**

```text
公网采集
→ 人工审核来源和版本
→ 生成审核文件包
→ 内网校验哈希
→ 导入源文本
→ 重新生成索引
→ 人工抽检
→ 发布
```

**Step 4: Commit**

```bash
git add features/policy/knowledge-base/import-package features/policy/knowledge-base/scripts/build-knowledge-base.mjs
git commit -m "docs: define offline policy update packages"
```

### Task 12: Complete security and integration verification

**Objective:** Prove the knowledge base works offline and does not leak resident data.

**Files:**
- Modify: `features/policy/knowledge-base/README.md`
- Modify: `.env.example` only if a future optional local model needs configuration
- Modify: repository documentation as needed

**Step 1: Run all checks**

```bash
node --test features/policy/knowledge-base/tests/*.test.mjs
node features/policy/knowledge-base/scripts/validate-manifest.mjs
node features/policy/knowledge-base/scripts/build-knowledge-base.mjs
npm run lint
./node_modules/.bin/tsc --noEmit
npm run build
```

Expected: all commands pass.

**Step 2: Run offline verification**

Disable network access, then verify:

- `/policies` renders all active verified policies;
- policy detail pages render source and interpretation metadata;
- keyword retrieval returns clauses and provenance;
- historical and invalid documents are absent from default results;
- no runtime request targets an external model, vector database, or government site.

**Step 3: Check privacy boundaries**

Search the knowledge-base data and generated index for resident IDs, resident names, phone numbers, addresses, and health records. Only public policy text and fictional test fixtures are permitted.

**Step 4: Final commit**

```bash
git add features/policy/knowledge-base docs .env.example
git commit -m "chore: verify offline policy knowledge base"
```

## Final acceptance criteria

- At least 30 active, human-verified policies are available to the demo.
- Every policy uses a stable `policyId` from `shared/demo-constants.ts`.
- Every policy has complete official text and traceable source metadata.
- Official category strings are preserved exactly; tags distinguish topic, audience, region, and locality.
- Eligibility, benefits, materials, procedures, restrictions, and exceptions are separate.
- Eligibility extractions cite original chunk IDs.
- Official interpretations are stored separately and are the primary source for plain-language text.
- AI drafts never overwrite source text or human-confirmed extraction.
- Historical and invalid documents remain stored but do not enter default retrieval or the demo UI.
- Search works offline and returns original clauses with provenance.
- No resident information leaves the local or intranet environment.
- No `shared/` interface changes occur without explicit B/C confirmation.
