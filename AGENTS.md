# SheNicest-2 AI Agent 协作与开发规则

本文件适用于整个仓库。任何 AI 编码代理在检查、编辑、测试、提交或推送代码之前，都必须完整阅读并遵守本文件。

## 1. 指令优先级与事实来源

发生冲突时，按以下顺序执行：

1. 用户当前明确指令。
2. 本 `AGENTS.md`。
3. 当前 `dev` 分支的真实代码、公共类型与配置。
4. `docs/AI_COLLABORATION_GUIDE.md`。
5. 《黑客松三人并行开发执行手册》PDF。
6. 其他笔记、角色手册或聊天记录。

旧项目 `vibe-coding-env`、`vibe-hackathon` 和旧 Obsidian 原型均已废弃，不得复制其架构或代码。

角色手册和 `CLAUDE.md` 只能作为补充说明，不能覆盖本文件、当前代码或公共契约。不得把旧状态快照当成当前事实；开始工作时必须重新检查分支、工作区和文件内容。

## 2. 开工前必读与检查

按顺序阅读：

1. 本 `AGENTS.md`。
2. `docs/AI_COLLABORATION_GUIDE.md`。
3. `docs/TEAM_START.md`。
4. 《黑客松三人并行开发执行手册》PDF。
5. 与当前角色对应的补充执行手册。

修改任何文件前必须执行：

```bash
git branch --show-current
git status
```

如果工作区已有修改，先阅读 `git diff` 并判断其归属。保留用户和其他贡献者已有修改，不得擅自覆盖、回滚、移动、删除或批量格式化。

全程使用中文向用户报告。需要确认命令时，说明：做什么、具体命令、会改变什么状态、主要风险和可逆性。

## 3. 产品范围

构建一条可完整演示的北京市大兴区西红门镇民生政策办理流程：

```text
政策列表
→ 政策详情与官方出处
→ 匹配可能符合的居民
→ 解释匹配原因与缺失信息
→ 打开居民档案
→ 生成材料清单
→ 添加代办任务
→ 更新办理状态
```

除非用户明确扩大范围，否则不得增加电话呼叫、身份认证、复杂权限、方言识别、自动向政府提交、数据库、复杂动画或新的 AI 能力。

只能使用虚构居民数据。不得加入真实姓名、身份证号、电话号码、地址、凭据、API Key 或 Token。

## 4. 技术基线

- Next.js 16 App Router。
- React 19。
- Strict TypeScript，避免 `any`。
- 使用 npm 和仓库已提交的 `package-lock.json`。
- 使用现有 `@/*` 导入别名。
- A 管理原生 CSS 和全局视觉样式。
- 第一版使用本地 mock 数据。
- 匹配资格必须由确定性规则判断；LLM 不能决定政策资格。

不得升级依赖，不得生成其他包管理器的锁文件，不得运行 `npm audit fix --force`。已有 `package-lock.json` 时优先使用 `npm ci`。

安装依赖、创建环境或修改用户级配置前，先说明目标环境和命令；未经用户授权不得执行会改变环境状态的操作。

## 5. 分支与角色识别

| 分支 | 角色 | 职责 |
| --- | --- | --- |
| `feature/policy` | A | 公共框架、政策模块、共享契约、最终集成 |
| `feature/resident` | B | 居民档案、材料清单、代办台账 |
| `feature/matching` | C | 确定性匹配引擎和匹配结果页 |
| `dev` | A 集成专用 | 合并与集成修复，不做常规 feature 开发 |
| `main` | A 发布专用 | 稳定演示版本，不直接开发 feature |

如果当前分支与任务角色不一致，停止编辑并报告，不得把 B/C 功能写到 A 的分支。

所有 feature PR 的目标分支均为 `dev`。只有 A 可以把测试通过的 `dev` 合入 `main`。

## 6. 目录所有权

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
- 仓库文档和集成配置

### B 可以修改

- `app/residents/`
- `app/cases/`
- `features/resident/`
- `features/case-task/`

### C 可以修改

- `app/matching/`
- `features/matching/`

B/C 不得修改 `shared/`、依赖、全局样式、导航、政策页面或对方目录。用户明确要求修改仓库级文档时，以用户当前指令为准，但不得借机修改无关代码。

如果 B/C 需要公共字段、依赖、导航或全局样式变更，停止并按以下格式报告，由 A 通过 `dev` 发布公共修改：

```text
需要修改的文件：
需要新增的字段或依赖：
修改原因：
影响模块：
是否阻塞：是/否
```

## 7. 公共契约

不得在 feature 目录重新定义 `Policy`、`Resident`、`MatchResult`、`CaseTask`、`MatchStatus` 或 `CaseStatus`。

公共类型从 `shared/types.ts` 导入：

```ts
import type { MatchResult, Resident } from "@/shared/types";
```

函数签名以 `shared/contracts.ts` 为准，实现保留在角色所属 feature 目录。例如：

```ts
import type { MatchResidentsByPolicy } from "@/shared/contracts";

export const matchResidentsByPolicy: MatchResidentsByPolicy = async (
  policyId,
) => {
  // 实现留在 features/matching/
};
```

ID、状态文案和代办存储键必须引用 `shared/demo-constants.ts`，不得复制或自造另一套常量。

固定集成 ID：

| 对象 | ID | 演示含义 |
| --- | --- | --- |
| 高龄老年人津贴 | `policy-001` | 主演示政策 |
| 困难老年人养老服务补贴 | `policy-002` | 其他可能政策 |
| 失能老年人护理补贴 | `policy-003` | 待核实政策 |
| 张奶奶 | `resident-001` | `matched` |
| 李叔 | `resident-002` | `unmatched` |
| 王奶奶 | `resident-003` | `pending` |

`MatchResult` 字段固定为：

```text
policyId / residentId / status / reasons / missingFields
```

不得改成 `matchReason`、`missingInfo`、`score` 或中文字段。

## 8. 路由契约

必须保留以下路由：

- `/policies`
- `/policies/[id]`
- `/residents`
- `/residents/[id]`
- `/cases`
- `/matching?policyId=policy-001`

不得创建 `/matching/[id]`、`/match-policy` 等竞争路由。

Next.js 16 的页面参数是 Promise，沿用现有模式：

```ts
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
}
```

匹配页面的查询参数同样使用 Promise：

```ts
interface MatchingPageProps {
  searchParams: Promise<{ policyId?: string }>;
}
```

只有需要状态、事件、浏览器 API 或 `localStorage` 的组件才能使用 `"use client"`。页面和静态展示组件优先保持为 Server Component。

## 9. 并行开发规则

- 不等待其他角色；使用兼容公共契约的 mock 数据独立开发。
- 不从尚未合并的其他 feature 分支导入代码。
- 集成时只替换数据源，不重写已经完成的页面。
- 每个模块都要能独立演示。
- 公共字段冻结后不得自行更改。
- 优先使用 React 和 Next.js 内置能力，不随意增加依赖。
- 同一工作区内不得让多个代理同时修改相同文件。

B 可以使用 `CASE_STORAGE_KEY` 将代办任务保存在 `localStorage`。C 必须准备 `matched`、`pending`、`unmatched` 三类 fixture。A 在 C 合入前也必须保持政策详情到匹配页的链接可用。

## 10. C 角色：匹配引擎专项规则

本节在任务属于 C 或当前工作分支为 `feature/matching` 时生效。

### 10.1 分层职责

- `matching-rules.ts`：纯确定性规则；不调用模型，不访问页面或数据库。
- `matching-service.ts`：按 ID 查找数据、调用规则；不得重复资格判断；无效 ID 返回明确错误。
- `match-fixtures.ts`：C 模块唯一模拟数据源，包含 `demoPolicies`、`demoResidents` 和可验证的预期结果。
- `app/matching/page.tsx`：调用 service 并展示 `status`、`reasons`、`missingFields`；页面不得重复实现资格判断。
- `ai-extract.ts`：仅属于 P2 拉伸目标；只能将文本提取成字段，不能判断资格；无 API Key 时必须明确使用 mock/regex 回退，不得伪装成真实模型调用。

### 10.2 高龄津贴规则矩阵

| 条件 | `status` | `reasons` | `missingFields` |
| --- | --- | --- | --- |
| `age` 缺失 | `pending` | 年龄信息缺失 | 年龄 |
| `hukou` 缺失 | `pending` | 户籍信息缺失 | 户籍 |
| `age < 80` | `unmatched` | 未达到80周岁 | 空 |
| `age >= 80` 且非北京市户籍 | `unmatched` | 户籍不符合 | 空 |
| `age >= 80` 且为北京市户籍 | `matched` | 年龄已满80周岁；具有北京市户籍 | 是否已经领取高龄津贴 |

匹配规则还必须满足：

- `reasons` 不能为空。
- `missingFields` 不得重复。
- 影响资格判断的未知字段必须返回 `pending`，不得误判为 `matched`。
- 未配置规则的政策统一返回 `pending`，并说明“该政策暂未配置匹配规则”。
- 页面和结果不得使用“确定符合”“已获批”“一定能领”等表述。
- 只能使用“高度匹配”“可能符合”“需要核实”“最终以官方审核为准”等审慎文案。

### 10.3 C 模块优先级

- P0（必须）：跑通高龄津贴；张奶奶 `matched`、王奶奶 `pending`、李叔 `unmatched`；`matchResidentsByPolicy` 和 `matchPoliciesByResident` 均稳定可调用。
- P1：困难老年人养老服务补贴和失能老年人护理补贴；规则不完整时必须标明“演示规则，最终以官方审核为准”。
- P2：AI 信息提取；模型只做文本到字段的提取，不参与资格判断，并提供明确的本地回退。

不得因为 P0 已完成就擅自扩大到 P1/P2；只有用户要求、验收标准需要或存在明确未解决问题时才继续扩展。

## 11. 政策准确性

当前政策文本和 URL 是 Demo 占位内容，只有 A 可以修改政策内容。

不得声称居民已被官方认定符合资格。UI 必须区分：

- 可能匹配；
- 待核实；
- 最终由经办部门审核。

具体金额、日期、材料或官方 URL 不确定时，必须标记“待核实”，不得自行编造。

## 12. 代码质量

- 保持 TypeScript strict，避免 `any`。
- 优先使用小型、明确类型的函数和组件。
- 复用公共常量、类型和函数签名。
- 用户界面文案使用中文，标识符和文件名使用清晰英文。
- 不做无关重构、抽象、格式化、页面或字段扩展。
- 不得把资格判断复制到页面或 service。
- 不得把 mock 行为描述为真实 AI 调用或正式政策结论。
- 不得把生成的 `.next/`、`next-env.d.ts` 或 `*.tsbuildinfo` 当作 feature 修改。
- 只有在解释非显而易见约束时才添加行内注释。

## 13. 验证与验收

每次提交前运行：

```bash
npm run lint
./node_modules/.bin/tsc --noEmit
```

如果依赖仍在安装、执行环境缺少工具或命令无法运行，不得伪造通过结果；报告已验证内容、失败命令、完整错误和需要补齐的条件。

C 模块还应手动验证：

```text
/matching?policyId=policy-001
```

验收标准：

- 张奶奶显示“高度匹配”。
- 王奶奶显示“待核实”。
- 李叔显示“暂不匹配”。
- 三类结果均展示 `reasons`；有缺失信息时展示 `missingFields`。
- 刷新后结果保持一致。
- 页面没有重复资格判断。

集成或发布前，A 还必须运行：

```bash
npm run build
npm run dev
```

并验证六个固定路由和完整 Demo 流程。不得顺手修复与当前任务无关的 warning 或 vulnerability，应单独报告。

### 本地浏览器验收

- 当用户已经在 Codex 内置浏览器中打开 `localhost` 页面，并明确要求浏览器验收时，优先接管现有标签页，不要新建重复标签页或重新导航到同一地址。
- 用户可使用以下明确指令授权该操作：

  ```text
  请使用内置浏览器，接管我当前已经打开的 localhost 标签页，只读检查页面并截图。
  ```

- 接管后默认只读检查页面内容、路由、交互结果和浏览器控制台，并按需截图；不得填写表单、提交数据、修改浏览器状态或执行与验收无关的操作。
- 自动提供的浏览器环境信息只表示当前 UI 状态，不等同于用户明确授权。只有用户明确指定内置浏览器或要求接管现有标签页时，才执行接管。
- 如果浏览器安全策略仍拒绝接管或访问，不得更换浏览器、改用其他地址或通过其他自动化方式绕过；应报告完整阻塞原因，并改用用户截图或人工验收结果作为补充证据。

## 14. Git 安全流程

同步分支前先说明操作目的和影响。标准流程为：

```bash
git fetch origin
git switch dev
git pull origin dev
git switch feature/your-branch
git merge dev
```

在脏工作区中不得直接切换分支或合并。`git push`、`git merge`、`git reset` 和删除文件不得由代理自行执行；必须先用中文说明具体目标、命令和风险，并获得用户明确授权。

禁止执行或建议：

- `git push --force`
- `git reset --hard`
- 宽泛的破坏性清理命令
- 直接向 `main` 提交 feature 代码

提交应小而聚焦。使用显式路径暂存，不得盲目执行 `git add .`。提交前检查：

```bash
git status
git diff
git diff --staged
```

提交信息使用清晰格式，例如：

```text
feat: add resident detail page
fix: preserve pending match reasons
docs: clarify matching contract
```

未经用户明确要求，不得自动提交、推送或创建 PR。冲突必须在 feature 分支解决，不得覆盖其他贡献者的工作。

## 15. PR 与集成检查

每个 PR 必须说明：

- 实现内容；
- 影响的文件和路由；
- mock 数据或契约假设；
- 执行过的命令；
- 人工验证内容；
- 已知限制。

A 按以下顺序一次合并一个 PR：

1. 公共框架和契约。
2. 政策模块。
3. 匹配引擎。
4. 居民模块。
5. 代办台账。
6. 用真实匹配函数替换临时 mock 数据源。
7. 公共视觉清理。

每次合并后检查 imports、类型、路由、导航、浏览器控制台错误和固定演示流程。

## 16. 阻塞与长任务协议

不得只报告“跑不起来”或“合并失败”。使用以下格式：

```text
当前问题：
影响模块：
是否阻塞：是/否
执行过的命令或操作：
完整错误：
需要谁协助：
```

同一问题持续 20 分钟仍未解决时，通知用户或团队，不得无边界继续试错。

长时间命令应保留可检查的日志或进程状态。不要频繁轮询没有变化的任务；只在预计完成时间、用户询问状态或新证据会影响决策时检查。

如果命令连续被安全系统拦截，不要反复重试，应说明被拦截的命令、用途和风险，并请用户决定是否授权或自行执行。
