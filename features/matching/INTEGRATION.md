# C 模块集成边界

## A → C：政策证据

A 负责政策文件入库、切片、索引、检索、待遇、材料和官方来源。C 不建立政策知识库，只通过 `PolicyEvidenceProvider.retrievePolicyEvidence(request)` 消费检索后的政策原文片段。请求可以限定 `policyId`，也可以携带由居民事实生成的 `queryText`，但 BM25、Embedding、向量索引和 Reranker 的实现仍属于 A。

每个片段至少包含：

- `policyId`
- `chunkId`
- `text`
- `sourceUrl`
- 可选的 `sectionTitle`

当前 `mockPolicyEvidenceProvider` 是本地模拟实现。接入 A 时只替换 provider，不修改条件抽取器、匹配内核或页面。

## B → C：居民事实

B 负责居民数据库、字段设计和档案维护。C 不存储居民数据，只通过 `ResidentFactProvider` 消费字段事实。

每个事实至少包含：

- `residentId`
- 数据库字段 `key`
- 用户可读的 `label`
- `value`
- `valueType`
- 可选的 `aliases`

当前 `mockResidentFactProvider` 将现有虚构 `Resident` 转换成事实列表。接入 B 时只替换 provider。

## C 内部职责

1. `PolicyCriterionExtractor` 将政策证据转换为结构化条件。
2. `FieldAligner` 将政策概念映射到居民数据库字段；接口为异步形式，后续可替换为内网 Embedding 或 Reranker 服务。
3. 匹配内核派生年龄等事实，并执行确定性比较。
4. 缺字段、低置信度映射或无法解析的值返回待核实。
5. 模型将来只能替换条件抽取器或字段对齐器，不能替换最终确定性比较。

内部类型暂时保留在 `features/matching/integration-contracts.ts`。验证稳定后，如 A/B 需要跨模块直接调用，再由 A 决定是否发布为 `shared/` 公共契约。

## LLM 接入边界

- `llm-prompts.ts`：版本化的政策条件提取和居民字段对齐 Prompt，声明证据闭包、提示注入隔离、逐项原文追溯和冲突转 `unresolved`，不允许输出资格结论。
- `llm-contracts.ts`：provider-neutral 请求接口，以及支持 `allOf`、`anyOf`、`not`、例外和动态参考标准的模型输出类型。
- `llm-output-validator.ts`：运行时严格校验；未知字段、未知操作符、伪造 `chunkId`/`factKey`、非逐字引文、遗漏字段映射和 `matched/status/decision` 等越权结论会被拒绝。
- `llm-policy-extractor.ts`：可插拔 LLM 条件提取器。未配置客户端、调用失败、输出无效或逻辑暂时不能安全编译时，明确回退到本地正则提取器。
- `llm-openai-chat-client.server.ts`：仅服务端使用的 OpenAI Chat Completions 适配器，并提供已绑定安全回退的政策条件提取器工厂。默认调用 `https://api.openai-next.com/v1/chat/completions` 和 `gpt-5.6-terra`，超时、非 2xx、响应格式异常或模型未返回严格 JSON 时抛出错误，由提取器回退本地规则。
- `llm-verification.ts`：不依赖网络和真实 API Key 的本地验证。

服务端环境变量：

```text
OPENAI_COMPATIBLE_API_KEY=仅保存在本机 .env.local
OPENAI_COMPATIBLE_BASE_URL=https://api.openai-next.com/v1
OPENAI_COMPATIBLE_MODEL=gpt-5.6-terra
OPENAI_COMPATIBLE_TIMEOUT_MS=20000
```

只有 `OPENAI_COMPATIBLE_API_KEY` 是必填项，其余配置使用上述默认值。不得使用 `NEXT_PUBLIC_` 前缀，也不得把 Key 写入代码、页面、日志或 Git。模型只生成待校验的政策条件和字段映射；最终资格状态仍由确定性匹配内核计算。
