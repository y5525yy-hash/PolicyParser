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

## UI visual optimization phase — hard requirements

The current phase is limited to UI visual optimization. Every agent must follow all of these requirements:

1. Do not modify business logic, APIs, databases, routes, or existing behavior.
2. Do not delete existing components, controls, feature buttons, or functionality.
3. Prefer changes to CSS, Tailwind classes, layout, spacing, typography, colors, and presentational components.
4. Work on only one page per task or iteration.
5. Before editing, tell the user exactly which files will be modified.
6. After editing, run the project, check the browser console for errors, and verify that the page's existing functions still work.
7. If the requested result requires a large-scale refactor, stop and ask for approval before making the change.

These requirements are mandatory even when a broader visual redesign would be possible.

## Policy homepage final visual standard

The current visual source of truth is the manually adjusted Figma frame `首页-最终版`, node `52:2`:

`https://www.figma.com/design/LFju2LeTMMmQCtilcZ4pQa?node-id=52-2`

When chat history, an older Figma frame, captured HTML, or existing CSS differs from node `52:2`, follow the latest contents of node `52:2`. Re-read the node before implementing later visual changes because the user may adjust it manually.

### Color tokens

Use this cool blue-green palette across later pages. Do not reintroduce the previous warm beige or dark green theme.

```css
--background: #f4f8fa;
--surface: #ffffff;
--text: #102a2e;
--muted: #52676b;
--text-muted: #7a8b8e;
--border: #d5e3e2;
--primary: #087f8c;
--primary-dark: #066a75;
--primary-deep: #04545d;
--accent: #e6f4f3;
--highlight: #14b8a6;
--warning: #b76e00;
```

- Page backgrounds use `--background`.
- Primary matching buttons and strong category badges use `--primary`; policy-card “查看详情” buttons use the deeper `--primary-dark` for stronger contrast.
- Selected navigation, capability strips, secondary badges, and skeletons use `--accent`.
- Cards use `--surface` with `--border`; avoid colored card backgrounds unless they communicate state.
- Error states use `--warning` only for the border, heading, or essential status text.
- Do not use decorative gradients on product pages.

### Typography

- Font stack: `"Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif`.
- Display heading: 48px / 56px, weight 800.
- Section heading: 24px / 32px, weight 700.
- Card title: 20–24px / 28–32px, weight 700.
- Body: 16px / 24px, weight 400.
- Label: 14px / 20px, weight 600.
- Caption: 12px / 18px, weight 400.
- Use strong size and weight hierarchy; do not depend on color alone.

### Layout and surfaces

- Use an 8px spacing system: 8, 16, 24, 32, 40, 48, and 64px.
- Desktop content width is 1152px inside a 1280px reference canvas with 64px side margins.
- Standard radii: 8px for controls, 12px for cards and grouped content, 16px for the primary assistant panel.
- Standard card shadow: `0 4px 12px rgba(15, 31, 51, 0.08)`.
- Raised assistant shadow: `0 10px 28px -4px rgba(15, 31, 51, 0.12)`.
- Use large areas of open background. Do not place every text block inside a card.
- Avoid large illustrations, decorative photography, complex motion, and implementation-heavy effects.

### Homepage structure and states

- Preserve the hierarchy: brand/navigation → two-column hero → proof points → primary matching/search panel → three-capability strip → category sidebar and policy results → disclaimer.
- Keep the primary action visually dominant.
- Preserve existing search, clear, category, policy detail, and official-source behavior even when visible wording changes.
- Empty, loading, and error states replace only the policy result area beneath its heading. The search panel, navigation, and category sidebar must remain in place.
- Empty states may use the existing clear-filter action. Loading states contain no new action. Error states instruct the user to refresh or retry without inventing a new workflow.
- If Figma shows a navigation label without an implemented route, render it as disabled text; do not create a route or business feature without explicit approval.

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
