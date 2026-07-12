# A 模块政策知识库新窗口交接清单

更新时间：2026-07-12

## 1. 当前仓库状态

- 仓库：`/Users/llf/Desktop/SheNicest-2`
- 当前分支：`feature/policy`
- 远程分支：`origin/feature/policy`
- 知识库完成里程碑：`0c79945 feat(policy): add pension medical and family base rules`
- 本交接清单会作为后续文档提交保存到同一远程分支。

## 2. 已完成内容

- 31 个稳定 `policyId`，与 `shared/demo-constants.ts` 保持一致。
- 35 份北京市官方政策完整原文。
- 1396 个带来源信息的政策切片。
- 1381 个默认有效检索切片。
- 31 份人工核验结构化提取文件。
- 默认排除 `historical`、`superseded` 和 `invalid` 内容。
- 政策原文、结构化提取和人工确认说明分层保存。
- 知识库可在本地离线构建和检索，不依赖公网服务运行。

本轮最后补齐：

- `policy-004`：城乡居民养老保险基础参保资格、待遇领取资格和年度缴费标准；
- `policy-005`：城乡居民医保完整人群分支、材料、流程、等待期、排除条件和年度缴费标准；
- `policy-026`：独生子女死亡家庭、伤残家庭两个独立资格分支及当前扶助金额。

## 3. 新窗口首先读取

1. 根目录 `AGENTS.md`
2. `docs/C_POLICY_RETRIEVAL_HANDOFF.md`
3. `features/policy/knowledge-base/README.md`
4. `features/policy/knowledge-base/data/manifest.json`
5. `features/policy/knowledge-base/data/extractions/policy-004.json`
6. `features/policy/knowledge-base/data/extractions/policy-005.json`
7. `features/policy/knowledge-base/data/extractions/policy-026.json`

## 4. 关键文件

### 官方原文和元数据

- `features/policy/knowledge-base/data/manifest.json`
- `features/policy/knowledge-base/data/sources/`

### 人工核验提取

- `features/policy/knowledge-base/data/extractions/policy-001.json`
- 至 `features/policy/knowledge-base/data/extractions/policy-031.json`

### 生成数据

- `features/policy/knowledge-base/data/generated/documents.jsonl`
- `features/policy/knowledge-base/data/generated/chunks.jsonl`
- `features/policy/knowledge-base/data/generated/active-chunks.jsonl`

### 脚本

- `features/policy/knowledge-base/scripts/collect-official-source.mjs`
- `features/policy/knowledge-base/scripts/build-knowledge-base.mjs`
- `features/policy/knowledge-base/scripts/validate-manifest.mjs`
- `features/policy/knowledge-base/scripts/search-policies.mjs`

### C 接入文档

- `docs/C_POLICY_RETRIEVAL_HANDOFF.md`

## 5. 新窗口启动检查

```bash
cd /Users/llf/Desktop/SheNicest-2
git branch --show-current
git status --short
git fetch origin
git rev-parse HEAD
git rev-parse origin/feature/policy
```

预期分支为 `feature/policy`。不要在 A 分支修改 `features/matching/`、`features/resident/` 或 `features/case-task/`。

## 6. 知识库验证命令

```bash
node features/policy/knowledge-base/scripts/validate-manifest.mjs
node --test features/policy/knowledge-base/tests/*.test.mjs
npm run lint
./node_modules/.bin/tsc --noEmit
npm run build
```

最近一次验证结果：

- Manifest：35 documents / 31 policies，通过；
- 自动测试：31/31，通过；
- ESLint：通过；
- TypeScript：通过；
- Next.js 生产构建：通过，39 个静态页面生成成功。

注意：`npm run build` 可能自动改动 `next-env.d.ts`，构建后必须检查，不要把框架自动改动作为功能提交。

## 7. 本地检索示例

```bash
node features/policy/knowledge-base/scripts/search-policies.mjs --query '本市户籍 年满16周岁 不含在校学生 职工基本养老保险' --limit 3

node features/policy/knowledge-base/scripts/search-policies.mjs --query '无其它基本医疗保障 本市户籍 学生儿童' --limit 3

node features/policy/knowledge-base/scripts/search-policies.mjs --query '独生子女 伤残 女方年满49周岁 北京市户籍' --limit 3
```

检索结果应返回原文、`policyId`、`chunkId`、政策名称和官方 URL，不能只返回标题或摘要。

## 8. 必须保留的业务语义

- `policy-004`：参保资格与按月领取养老待遇是两组不同条件。
- `policy-005`：先确定具体人群分支，再核对该分支的户籍、年龄、学籍和其他医疗保障条件。
- `policy-026`：死亡家庭与伤残家庭是两个 `anyOf` 分支；每个分支内部条件是 `allOf`。
- 不得丢失“且”“或”“不得”“不满”“年满”和例外条款。
- 不得用 AI 总结替换官方原文。
- 不得自动认定某位居民正式符合政策，只能提示可能匹配和待核实信息。

## 9. 当前协作边界

- A 的知识库基础工作已完成。
- C 负责后期检索微调、匹配页面微调和合并工作。
- 正式修改 `shared/` 公共字段前必须先与 B、C 确认。
- 不要把真实居民数据发送到公网模型、外部向量数据库或第三方 API。

## 10. 当前页面运行状态

项目曾在本机 `3000` 端口运行：

```text
http://localhost:3000/policies
```

手机无法通过 `http://192.168.10.97:3000/policies` 打开。已确认：

- Next 服务监听 `*:3000`；
- 电脑本机访问返回 HTTP 200；
- macOS 防火墙关闭；
- 手机和电脑声称连接同一网络。

因此大概率是路由器开启了客户端隔离。私有局域网地址也不能供异地 B、C 访问。后续展示可选择：

1. B、C 各自在本地运行；
2. 部署到可访问环境；
3. 经用户明确同意后开启临时公网隧道。

## 11. 下一步建议

如果继续 A 的工作：

1. 先提交并推送本交接清单；
2. 不再扩展知识库范围，除非发现明确缺失或用户提出新增政策；
3. 等待 C 接入后的具体问题，只处理知识库数据、来源和契约问题；
4. 若要正式演示，优先完成可访问部署，而不是继续依赖局域网地址。
