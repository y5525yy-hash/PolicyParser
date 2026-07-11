# Supplement Base Policy Sources Implementation Plan

**Goal:** Replace incomplete annual-amount-only knowledge-base entries with traceable Beijing official base eligibility documents for resident pension, resident medical insurance, and family-planning special assistance.

**Architecture:** Collect government-published source pages into immutable local text files, register each version as a separate document in the manifest, rebuild stable chunks, and update the existing policy extraction without overwriting annual amount documents. Keep older and current versions explicit and preserve unresolved current-standard questions.

**Tech Stack:** Government HTML sources, Node.js collection/build scripts, JSON/JSONL manifest and extraction data, Node test runner.

---

### Task 1: Locate official base documents

**Objective:** Find official Beijing government pages that contain complete eligibility semantics for policies 004, 005, and 026.

**Files:**
- Read: `features/policy/knowledge-base/data/manifest.json`
- Read: `features/policy/knowledge-base/data/extractions/policy-004.json`
- Read: `features/policy/knowledge-base/data/extractions/policy-005.json`
- Read: `features/policy/knowledge-base/data/extractions/policy-026.json`

**Steps:**

1. Search only Beijing government, department, or official public-service websites.
2. Record official title, document number, issuing authority, publication/effective dates, URL, and version status.
3. Reject summaries that do not preserve the complete eligibility clauses.

### Task 2: Collect and register source texts

**Objective:** Store auditable official text locally and add versioned manifest records.

**Files:**
- Create: `features/policy/knowledge-base/data/sources/*.txt`
- Modify: `features/policy/knowledge-base/data/manifest.json`

**Steps:**

1. Use `collect-official-source.mjs` where the page can be extracted deterministically.
2. Keep each official document under a stable `documentId` and calculate its content SHA-256.
3. Mark superseded or historical versions so default retrieval excludes them.
4. Run `node features/policy/knowledge-base/scripts/validate-manifest.mjs`.

### Task 3: Rebuild and update extractions

**Objective:** Attach complete eligibility, benefits, materials, procedures, and restrictions to new stable chunks.

**Files:**
- Modify: `features/policy/knowledge-base/data/extractions/policy-004.json`
- Modify: `features/policy/knowledge-base/data/extractions/policy-005.json`
- Modify: `features/policy/knowledge-base/data/extractions/policy-026.json`
- Modify: `docs/C_POLICY_RETRIEVAL_HANDOFF.md`

**Steps:**

1. Run `node features/policy/knowledge-base/scripts/build-knowledge-base.mjs`.
2. Encode `allOf`, `anyOf`, negative, age, region, and non-duplication semantics explicitly.
3. Keep annual payment/amount documents as separate benefit evidence.
4. Add human-confirmed plain-language explanations based on official interpretations when available.

### Task 4: Verify and publish

**Objective:** Ensure the supplemented knowledge base is stable and ready for C.

**Steps:**

1. Run manifest validation and all policy tests.
2. Run ESLint, TypeScript, and the production build.
3. Restore `next-env.d.ts` if the framework rewrites it.
4. Commit explicit files and push `feature/policy`.
5. Provide one final C handoff message containing the new commit and caveats.
