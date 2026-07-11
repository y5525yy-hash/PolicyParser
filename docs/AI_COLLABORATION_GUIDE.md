# 三人 AI 并行开发兼容与差异说明

更新时间：2026-07-11 17:40

这份文件用于配合《黑客松三人并行开发执行手册》。三位成员把任务交给各自 AI 前，必须同时提供 PDF 和本文件。

## 一、执行优先级

出现冲突时按以下顺序判断：

1. 当前 `dev` 分支中的真实代码和类型定义。
2. 本文件 `docs/AI_COLLABORATION_GUIDE.md`。
3. 《黑客松三人并行开发执行手册》PDF。
4. 其他旧版聊天记录、Obsidian 笔记和 Python 环境项目。

旧的 `vibe-coding-env`、`vibe-hackathon` 和 Obsidian 初版项目已经作废，不要复制其中的 Python、FastAPI 或 WSGI 代码。

## 二、当前项目基线

| 项目 | 已确定方案 |
| --- | --- |
| 仓库 | `y5525yy-hash/SheNicest-2` |
| 技术栈 | Next.js 16 App Router、React 19、TypeScript |
| 包管理器 | npm，只提交 `package-lock.json` |
| 样式 | 原生 CSS，公共样式由 A 维护 |
| 演示地区 | 北京市大兴区西红门镇 |
| 数据 | 只用虚拟模拟数据，不使用真实居民信息 |
| 后端 | 第一版没有数据库、登录、API 服务或 Supabase |
| AI | 核心链路完成前不接大模型；资格判断只能用确定性规则 |
| 集成分支 | `dev` |
| 稳定分支 | `main` |

不要擅自升级 Next.js、React、ESLint 或 TypeScript。当前版本组合已经通过 `npm run lint` 和 `npm run build`。

## 三、与 PDF 不同或已经补充明确的地方

### 1. Git 流程以 `dev` 为准

旧版 GitHub 指南写的是向 `main` 提交 PR，这一点已经作废。

- B 的 PR：`feature/resident` → `dev`
- C 的 PR：`feature/matching` → `dev`
- A 的 PR：`feature/policy` → `dev`
- 只有 A 在完整演示通过后将 `dev` 合入 `main`

### 2. 公共类型比 PDF 多了必要字段

以 `shared/types.ts` 为唯一准则，不要在自己的模块重新定义同名接口。

- `Policy` 增加了 `originalName`、`applicableTo`、`updatedAt`。
- `Resident.labels` 是必填的 `string[]`。
- `CaseTask.assignee` 是必填字符串。
- 状态值必须使用英文枚举值，中文只用于页面显示。

### 3. `shared/contracts.ts` 只定义函数签名

PDF 中写的是“接口空壳函数”，当前仓库把它们改成了 TypeScript 函数类型，目的是避免 B、C 同时修改公共文件。

具体实现放在各自目录：

- A：`features/policy/`
- B：`features/resident/`、`features/case-task/`
- C：`features/matching/`

实现函数时使用 `shared/contracts.ts` 中对应类型校验，例如：

```ts
import type { MatchResidentsByPolicy } from "@/shared/contracts";

export const matchResidentsByPolicy: MatchResidentsByPolicy = async (policyId) => {
  return [];
};
```

### 4. 匹配页面路由已经固定

政策详情页跳转地址固定为：

```text
/matching?policyId=policy-001
```

C 不要另建 `/matching/[id]`、`/match-policy` 或其他重复路由。

### 5. Next.js 16 的页面参数是 Promise

AI 很容易生成旧版 Next.js 写法。动态页面必须沿用仓库现有模式：

```ts
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
}
```

查询参数同样使用：

```ts
interface PageProps {
  searchParams: Promise<{ policyId?: string }>;
}
```

### 6. 状态保存方式已经明确

第一版代办台账不接数据库。B 可以使用 React state，并用 `localStorage` 保留演示状态。

统一存储键：

```ts
import { CASE_STORAGE_KEY } from "@/shared/demo-constants";
```

服务端组件不能直接访问 `localStorage`。需要交互的状态组件必须添加 `"use client"`。

### 7. 官方政策内容仍需核验

当前政策名称、解释和材料用于跑通演示，官方链接暂时指向北京市政策入口。A 后续负责核验西红门镇/大兴区适用口径。

B/C 不要修改政策文本，也不要根据模拟内容给出“正式资格认定”结论。

## 四、固定演示 ID 和状态

所有模块必须导入 `shared/demo-constants.ts`，不要自行生成另一套 ID。

| 对象 | 固定 ID | 用途 |
| --- | --- | --- |
| 高龄老年人津贴 | `policy-001` | 最终主演示政策 |
| 困难老年人养老服务补贴 | `policy-002` | 张奶奶的其他可能政策 |
| 失能老年人护理补贴 | `policy-003` | 待核实政策 |
| 张奶奶 | `resident-001` | 高度匹配 |
| 李叔 | `resident-002` | 暂不匹配 |
| 王奶奶 | `resident-003` | 待核实 |

匹配状态只能是：

```text
matched   → 高度匹配
pending   → 待核实
unmatched → 暂不匹配
```

代办状态只能是：

```text
todo       → 待处理
collecting → 收集材料中
submitted  → 已提交
processing → 审核中
completed  → 已办结
```

## 五、跨模块数据兼容示例

### C 输出给 B/A 的匹配结果

```ts
const zhangNainaiMatch = {
  policyId: "policy-001",
  residentId: "resident-001",
  status: "matched",
  reasons: ["年龄已满80周岁", "具有北京市户籍"],
  missingFields: ["是否已经领取高龄津贴"],
} satisfies MatchResult;
```

字段不能改名为 `matchReason`、`missingInfo`、`score` 或中文字段。

### B 创建的代办任务

```ts
const task = {
  id: "case-001",
  residentId: "resident-001",
  policyId: "policy-001",
  status: "todo",
  missingMaterials: ["本人银行卡"],
  assignee: "西红门镇代办员",
  nextFollowUpAt: "2026-07-12",
} satisfies CaseTask;
```

### 张奶奶固定基础数据

```ts
const zhangNainai = {
  id: "resident-001",
  name: "张奶奶",
  age: 82,
  hukou: "北京市",
  livingStatus: "独居",
  lowIncomeStatus: "低保",
  disabilityStatus: "是否完成失能评估未知",
  insuranceStatus: "参保状态待核实",
  labels: ["高龄", "独居", "低保", "失能待核实"],
} satisfies Resident;
```

## 六、目录所有权

### A 可以修改

- `app/policies/`
- `features/policy/`
- `shared/`
- `app/layout.tsx`
- `components/navigation/`
- `styles/`
- `package.json`
- `package-lock.json`
- `.env.example`

### B 可以修改

- `app/residents/`
- `app/cases/`
- `features/resident/`
- `features/case-task/`

### C 可以修改

- `app/matching/`
- `features/matching/`

现有 B/C 页面是 A 创建的占位页面。B/C 应直接替换自己目录中的占位内容，不要另外创建重复页面。

## 七、AI 开工提示词

### B 交给 AI

```text
阅读《黑客松三人并行开发执行手册》和 docs/AI_COLLABORATION_GUIDE.md。
我负责 B，只能修改 app/residents、app/cases、features/resident、features/case-task。
以 shared/types.ts、shared/contracts.ts、shared/demo-constants.ts 为绝对契约。
先使用模拟匹配结果完成居民列表、张奶奶详情、材料清单和代办台账，不等待 C。
不要修改 package.json、shared、全局样式和导航。
每次修改后运行 npm run lint，并检查自己的页面。
```

### C 交给 AI

```text
阅读《黑客松三人并行开发执行手册》和 docs/AI_COLLABORATION_GUIDE.md。
我负责 C，只能修改 app/matching、features/matching。
以 shared/types.ts、shared/contracts.ts、shared/demo-constants.ts 为绝对契约。
实现确定性规则，固定返回张奶奶 matched、李叔 unmatched、王奶奶 pending，并展示原因和 missingFields。
不要修改居民页面、政策页面、package.json、shared、全局样式和导航。
不要让大模型决定资格。
每次修改后运行 npm run lint，并检查 /matching?policyId=policy-001。
```

## 八、开始开发前必须执行

```bash
git fetch origin
git switch dev
git pull origin dev
git switch feature/自己的分支
git merge dev
npm install
npm run dev
```

如果功能分支刚创建且没有个人代码，`git merge dev` 应直接显示已是最新或快速合并。

## 九、提交前兼容检查

每次准备推送前检查：

```bash
git status
git diff
npm run lint
```

还必须人工确认：

- 没有修改其他人的目录。
- 没有修改公共类型和依赖文件。
- 没有加入真实姓名、身份证号、电话或住址。
- 所有政策和居民 ID 使用共享常量。
- `MatchResult`、`Resident`、`CaseTask` 字段与公共类型完全一致。
- PR 目标分支是 `dev`。

不要运行 `npm audit fix --force`，不要升级依赖，不要执行 `git push --force` 或 `git reset --hard`。

## 十、第一次试合并前的接口验收

A 合并 C 前检查：

- `/matching?policyId=policy-001` 可以打开。
- 页面包含 matched、pending、unmatched 三种结果。
- 张奶奶结果的 `missingFields` 包含“是否已经领取高龄津贴”。

A 合并 B 前检查：

- `/residents`、`/residents/resident-001`、`/cases` 可以打开。
- 张奶奶使用 `resident-001`。
- 加入台账后可以改成 `collecting`。
- 页面仍可在 C 未合并时使用模拟匹配结果。

最终集成时只替换数据来源，不重写页面结构。

