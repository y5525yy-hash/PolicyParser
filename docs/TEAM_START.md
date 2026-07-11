# B/C 开工说明（2026-07-11）

本项目以《黑客松三人并行开发执行手册》为唯一协作标准。旧版项目记录不再使用。

## 第一次下载

```bash
git clone https://github.com/y5525yy-hash/SheNicest-2.git
cd SheNicest-2
npm install
```

## B：居民档案与代办台账

```bash
git switch feature/resident
git merge origin/dev
npm run dev
```

只修改：

- `app/residents/`
- `app/cases/`
- `features/resident/`
- `features/case-task/`

## C：匹配引擎

```bash
git switch feature/matching
git merge origin/dev
npm run dev
```

只修改：

- `app/matching/`
- `features/matching/`

## 共同规则

- 所有 PR 的目标分支是 `dev`，不是 `main`。
- 不修改 `shared/`、`app/layout.tsx`、`components/navigation/`、`styles/`、`package.json`、`package-lock.json`。
- 模拟数据必须符合 `shared/types.ts`。
- 页面需要调用的函数签名以 `shared/contracts.ts` 为准。
- 需要新增字段或依赖时先在群里通知 A。
- 每完成一个小功能就提交并推送，不要等全部完成。

