# A Public Framework and Policy Module Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Create the shared Next.js foundation, freeze cross-team contracts, and deliver a demonstrable policy knowledge module for the Xihongmen Town hackathon flow.

**Architecture:** Use Next.js App Router with server-rendered pages and local TypeScript mock data. Shared types and function signatures live under `shared/`; each teammate owns only the feature and route directories assigned in the execution manual.

**Tech Stack:** Next.js 16, React 19, TypeScript, npm, CSS.

---

### Task 1: Initialize the application shell

**Objective:** Make every required route open and provide shared navigation.

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`
- Create: `app/layout.tsx`, `app/page.tsx`
- Create: `components/navigation/top-navigation.tsx`
- Create: `styles/globals.css`

**Verification:** Run `npm run lint` and `npm run build`; both must exit successfully.

### Task 2: Freeze public contracts

**Objective:** Give A, B, and C one stable set of fields and callable signatures.

**Files:**
- Create: `shared/types.ts`
- Create: `shared/contracts.ts`

**Verification:** TypeScript compilation during `npm run build` must report no errors.

### Task 3: Implement policy mock data

**Objective:** Supply three Xihongmen Town policy records without waiting for external services.

**Files:**
- Create: `features/policy/mock-policies.ts`

**Verification:** Each record contains list, detail, material, source, and date fields required by the manual.

### Task 4: Implement policy pages

**Objective:** Demonstrate policy list, policy detail, and matching navigation.

**Files:**
- Create: `app/policies/page.tsx`
- Create: `app/policies/[id]/page.tsx`

**Verification:** Open `/policies`, `/policies/policy-001`, then click “匹配本村居民” and confirm `policyId=policy-001` reaches `/matching`.

### Task 5: Publish the collaboration branches

**Objective:** Unblock B and C for parallel development.

**Commands:**
- Commit the framework on `main`.
- Create and push `dev`.
- Create and push `feature/policy`, `feature/resident`, and `feature/matching` from `dev`.

**Verification:** `git ls-remote --heads origin` lists all five branches.

