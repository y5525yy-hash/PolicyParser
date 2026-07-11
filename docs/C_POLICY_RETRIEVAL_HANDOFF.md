# C 模块政策检索临时交接

更新时间：2026-07-11

## 当前可用状态

- 已登记 31 个稳定 `policyId`，均来自 `shared/demo-constants.ts`。
- 已保存 31 份北京市官方政策完整文本，覆盖养老、社会救助、残疾人、儿童、住房、就业、医疗、教育、法律援助和家庭扶助等官方分类。
- 已生成 1241 个包含来源链路的政策切片，其中 1226 个进入默认有效政策检索。
- 默认检索只读取当前有效且已核验的官方原文切片。
- 切片已将“需同时符合下列条件”与其全部分项保留在同一片段中，避免丢失“且/或/不得/例外”等资格逻辑。
- `policy-001`、`policy-002`、`policy-003`、`policy-006`、`policy-007`、`policy-008` 已完成人工确认的资格条件提取。
- `policy-004` 和 `policy-005` 目前只有年度缴费官方文件，基础参保资格文件仍在补采，不应据此编写完整资格规则。

## C 可以读取的文件

```text
features/policy/knowledge-base/data/generated/active-chunks.jsonl
features/policy/knowledge-base/data/generated/chunks.jsonl
features/policy/knowledge-base/data/extractions/policy-001.json
features/policy/knowledge-base/data/extractions/policy-002.json
features/policy/knowledge-base/data/extractions/policy-003.json
features/policy/knowledge-base/data/extractions/policy-006.json
features/policy/knowledge-base/data/extractions/policy-007.json
features/policy/knowledge-base/data/extractions/policy-008.json
```

- `active-chunks.jsonl`：默认检索数据。
- `chunks.jsonl`：包含历史和失效版本，C 默认不要读取。
- `extractions/*.json`：结构化资格条件和人工确认的大白话解释。

## 临时检索命令

```bash
node features/policy/knowledge-base/scripts/search-policies.mjs \
  --query "80周岁 本市户口" \
  --limit 5
```

如需调试历史版本，显式增加：

```bash
--include-history
```

默认不得增加此参数。

## C 使用的临时返回契约

在 A、B、C 正式确认公共接口前，C 可在自己的目录中使用同形状本地类型，但不要修改 `shared/`：

```ts
interface PolicyRetrievalResult {
  policyId: string;
  chunkId: string;
  policyName: string;
  section: string;
  clauseNumber?: string;
  text: string;
  officialUrl: string;
  region: string;
  officialCategory: string;
  publishedAt?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: "active";
  verificationStatus: "human_verified";
  tags: string[];
  score: number;
}
```

## policy-001 已确认资格依据

高龄老年人津贴必须同时满足：

```text
具有本市户口
且
年满 80 周岁
```

对应原文切片：

| 含义 | chunkId | 原文 |
| --- | --- | --- |
| 北京户籍范围 | `chunk-f5efebffb50e7f2f` | 老年人养老服务补贴津贴发放给具有本市户口且符合相应条件的老年人…… |
| 年龄条件 | `chunk-fb6a8b39902b3e42` | 高龄老年人津贴。发放给80周岁及以上的老年人…… |
| 80—89岁待遇 | `chunk-7e8a1e6980220a3d` | 80周岁至89周岁的老年人，津贴标准为每人每月100元。 |
| 90—99岁待遇 | `chunk-32d3f5404e0360fc` | 90周岁至99周岁的老年人，津贴标准为每人每月500元。 |
| 100岁以上待遇 | `chunk-c3f88c6bfeb00a53` | 100周岁及以上的老年人，津贴标准为每人每月800元。 |

官方来源：

```text
北京市老年人养老服务补贴津贴管理实施办法
京民养老发〔2019〕160号
https://www.beijing.gov.cn/zhengce/zhengcefagui/201910/t20191028_454233.html
```

## 新增可用于检索页面联调的政策

C 可以优先用以下政策测试“多条件、否定条件、待遇衔接和来源展示”，但在对应提取文件完成人工确认前，只展示检索到的原文，不要把它们直接转换为正式匹配规则：

| policyId | 政策 | 适合测试的内容 |
| --- | --- | --- |
| `policy-018` | 灵活就业社会保险补贴 | “需同时符合”及停止享受条件 |
| `policy-023` | 重特大疾病医疗救助 | 多类救助对象、就高不就低、不得重复享受 |
| `policy-024` | 因病致贫重病患者家庭医疗救助 | 户籍、家庭成员、收入和财产同时认定 |
| `policy-027` | 法律援助经济困难告知承诺 | 适用对象、不适用情形和失信后果 |
| `policy-028` | 公共租赁住房申请与配租 | 户籍、住房、收入和家庭结构条件 |
| `policy-029` | 个体就业残疾人社会保险补贴 | 资格条件、材料、流程及不得重复享受 |

示例：

```bash
node features/policy/knowledge-base/scripts/search-policies.mjs \
  --query "具有本市户籍 同时符合 家庭财产 医疗救助" \
  --limit 5
```

## 建议 C 当前继续使用的确定性规则

```ts
if (resident.age === undefined) {
  status = "pending";
  missingFields.push("年龄");
}

if (!resident.hukou) {
  status = "pending";
  missingFields.push("户籍");
}

if (resident.age !== undefined && resident.age < 80) {
  status = "unmatched";
  reasons.push("年龄未满80周岁");
}

if (resident.age !== undefined && resident.age >= 80 && resident.hukou === "北京市") {
  status = "matched";
  reasons.push("年龄已满80周岁");
  reasons.push("具有北京市户籍");
  missingFields.push("是否已经领取高龄津贴");
}
```

页面解释匹配时，应同时显示：

- `reasons`；
- `missingFields`；
- 相关原文 `text`；
- `chunkId`；
- `officialUrl`；
- “仅为可能匹配，最终由主管部门审核”。

## C 暂时不要做的事项

- 不要让模型直接输出正式资格结论。
- 不要把居民姓名、住址、健康状况等信息发送到公网模型或外部向量数据库。
- 不要把 `policy-004`、`policy-005` 当成完整资格规则，它们目前仅完成缴费标准采集。
- 不要修改 `shared/types.ts` 或 `shared/contracts.ts`。
- 不要默认搜索 `historical`、`superseded` 或 `invalid` 记录。

## 后续正式接口

A 已提供仅在服务端读取本地知识库的检索适配器：

```ts
import {
  getPolicyEligibilityClauses,
  searchPolicyClauses,
} from "@/features/policy/knowledge-base/retrieval";

searchPolicyClauses(query)
getPolicyEligibilityClauses(policyId)
```

文件位置：

```text
features/policy/knowledge-base/retrieval.ts
```

该适配器只读取本地 `active-chunks.jsonl` 和人工核验提取文件，不访问公网服务。C 仍可直接使用 JSONL 和临时契约并行开发；如需把适配器返回类型升级为公共接口，必须先由 A、B、C 确认后再修改 `shared/`。
