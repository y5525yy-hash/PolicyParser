# SheNicest-2 Agent Operating Rules

This file applies to the entire repository. Every AI coding agent must read and follow it before inspecting, editing, testing, committing, or pushing code.

## 1. Source of truth

Use the following priority when instructions differ:

1. The user's current explicit request.
2. This `AGENTS.md`.
3. The current `dev` branch code and public types.
4. `docs/AI_COLLABORATION_GUIDE.md`.
5. The PDF named `黑客松三人并行开发执行手册`.
6. Other notes or chat history.

The old Python projects `vibe-coding-env`, `vibe-hackathon`, and the old Obsidian prototype are obsolete. Do not copy architecture or code from them.

## 2. Product scope

Build one complete demo flow for Beijing Daxing District Xihongmen Town:

```text
Policy list
→ policy detail and official source
→ match possible residents
→ explain match and missing information
→ open resident profile
→ generate material checklist
→ add case task
→ update case status
```

Do not add phone calls, authentication, complex permissions, dialect recognition, automatic government submission, databases, complex animation, or new AI abilities unless the user explicitly expands scope.

Use only fictional resident data. Never add real names, ID numbers, phone numbers, addresses, credentials, API keys, or tokens.

## 3. Technical baseline

- Next.js 16 App Router.
- React 19.
- Strict TypeScript.
- npm and the committed `package-lock.json`.
- Native CSS managed by A.
- Local mock data for the first version.
- Deterministic matching rules; an LLM must not decide benefit eligibility.

Do not upgrade dependencies or run `npm audit fix --force`.

## 4. Branch and role detection

Before editing, run:

```bash
git branch --show-current
git status
```

Role ownership is determined by the requested task and branch:

| Branch | Role | Responsibility |
| --- | --- | --- |
| `feature/policy` | A | Public framework, policy module, shared contracts, final integration |
| `feature/resident` | B | Resident profiles, material checklist, case ledger |
| `feature/matching` | C | Deterministic matching engine and matching result page |
| `dev` | A integration only | Merge and integration fixes; no normal feature development |
| `main` | A release only | Stable demo version; no direct feature development |

If the current branch does not match the requested role, switch to the correct branch before editing. Never implement B or C feature work on A's branch.

All feature PRs target `dev`. Only A merges the tested `dev` branch into `main`.

## 5. Directory ownership

### A may modify

- `app/policies/`
- `features/policy/`
- `shared/`
- `app/layout.tsx`
- `components/navigation/`
- `styles/`
- `package.json`
- `package-lock.json`
- `.env.example`
- repository documentation and integration configuration

### B may modify

- `app/residents/`
- `app/cases/`
- `features/resident/`
- `features/case-task/`

### C may modify

- `app/matching/`
- `features/matching/`

B and C must not modify `shared/`, dependencies, global styles, navigation, policy pages, or each other's directories.

If B or C needs a public field, dependency, navigation change, or global style change, stop and report:

```text
File that needs changing:
Field or dependency needed:
Reason:
Affected module:
Blocking: yes/no
```

A owns and publishes the shared change through `dev`.

## 6. Public contracts

Never redefine `Policy`, `Resident`, `MatchResult`, `CaseTask`, `MatchStatus`, or `CaseStatus` inside a feature directory.

Import them from:

```ts
import type { MatchResult, Resident } from "@/shared/types";
```

Use function signatures from `shared/contracts.ts`. Implementations stay in the role-owned feature directory.

Use IDs, status labels, and the case storage key from `shared/demo-constants.ts`.

Fixed integration IDs:

- `policy-001`: high-age elderly allowance.
- `policy-002`: elderly care support.
- `policy-003`: disability care support.
- `resident-001`: Zhang Nainai, matched.
- `resident-002`: Li Shu, unmatched.
- `resident-003`: Wang Nainai, pending verification.

Do not invent another ID set or rename public fields.

## 7. Routing contracts

Required routes:

- `/policies`
- `/policies/[id]`
- `/residents`
- `/residents/[id]`
- `/cases`
- `/matching?policyId=policy-001`

Do not create competing routes for the same feature.

Next.js 16 route parameters are promises. Follow the existing pattern:

```ts
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
}
```

Use `"use client"` only for components that require state, events, browser APIs, or `localStorage`. Keep pages and static display components as server components when possible.

## 8. Parallel development rules

- Do not wait for another role. Use contract-compatible mock data.
- Do not import unmerged code from another feature branch.
- Replace data sources during integration; do not rewrite completed pages.
- Keep each feature independently demonstrable.
- Do not change public fields after they are frozen unless the current work is blocked.
- Keep dependency usage minimal; prefer built-in React and Next.js capabilities.

B may use `localStorage` with `CASE_STORAGE_KEY` for case tasks. C must prepare `matched`, `pending`, and `unmatched` fixtures. A must keep the policy-to-matching link working before C is merged.

## 9. Policy accuracy

Current policy text and URLs are demo placeholders. Only A may revise policy content.

Do not claim that a resident is officially eligible. UI language must distinguish:

- possible match;
- pending verification;
- official agency review.

When an exact amount, date, material, or official URL is uncertain, label it for verification instead of inventing a fact.

## 10. Code quality

- Keep TypeScript strict and avoid `any`.
- Prefer small typed functions and components.
- Use existing import alias `@/*`.
- Reuse public constants and types.
- Keep user-facing text in Chinese.
- Keep identifiers and filenames in clear English.
- Do not add unrelated refactors, abstractions, libraries, pages, or fields.
- Do not edit generated `.next/`, `next-env.d.ts`, or `*.tsbuildinfo` files as feature work.
- Do not add inline comments unless they explain a non-obvious constraint.

## 11. Required validation

Before every commit, run the most relevant checks:

```bash
npm run lint
./node_modules/.bin/tsc --noEmit
```

Before integration or release, A also runs:

```bash
npm run build
npm run dev
```

Then verify the six required routes and the complete demo flow.

Do not fix unrelated warnings or vulnerabilities during a feature task. Report them separately.

## 12. Git safety

Start work with:

```bash
git fetch origin
git switch dev
git pull origin dev
git switch feature/your-branch
git merge dev
```

Commit small, focused changes. Stage explicit paths instead of blindly using `git add .`.

Before committing:

```bash
git status
git diff
git diff --staged
```

Use clear commit messages such as:

```text
feat: add resident detail page
fix: preserve pending match reasons
docs: clarify matching contract
```

Never run or recommend:

- `git push --force`
- `git reset --hard`
- destructive cleanup commands
- direct feature commits to `main`

Resolve conflicts on the feature branch before creating a PR. Do not overwrite another contributor's work.

## 13. PR and integration checklist

Every PR must state:

- what was implemented;
- files and routes affected;
- mock data or contract assumptions;
- commands run;
- manual verification performed;
- known limitations.

A merges one PR at a time in this order:

1. Public framework and contracts.
2. Policy module.
3. Matching engine.
4. Resident module.
5. Case ledger.
6. Replace mock matching with the real matching functions.
7. Shared visual cleanup.

After each merge, validate imports, types, routes, navigation, console errors, and the fixed demonstration flow.

## 14. Blocking issue protocol

Do not report only “it does not run” or “merge failed.” Report:

```text
Current problem:
Affected module:
Blocking: yes/no
Command or action attempted:
Full error:
Help needed from:
```

If the same issue remains unresolved for 20 minutes, notify the team instead of continuing alone.
