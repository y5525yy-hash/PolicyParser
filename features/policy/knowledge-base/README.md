# 政策知识库数据约束

本目录用于保存 A 模块的本地、可追溯政策知识库。运行时检索和页面展示不得依赖公网。

## 数据层级

- `data/manifest.json`：政策文件与业务政策清单。
- `data/sources/*.txt`：从政府公开网站或审核文件包导入的完整政策原文。
- `data/extractions/*.json`：规则、AI 或人工提取的资格条件、待遇、材料、流程和限制。
- `data/generated/documents.jsonl`：标准化文件元数据。
- `data/generated/chunks.jsonl`：包含全部版本的条款切片。
- `data/generated/active-chunks.jsonl`：仅包含当前有效且人工确认的默认检索数据。

## 不可破坏的约束

1. 官方原文导入后不可被摘要、AI 输出或人工改写覆盖。来源修正必须形成新的文件修订并重新计算哈希。
2. AI 提取、规则提取和人工确认结果必须保存在 extraction 层，不得写回原文。
3. 进入页面展示的 `policyId` 必须先在 `shared/demo-constants.ts` 中登记并保持稳定唯一。
4. 每个切片必须保留 `policyId`、`documentId`、`chunkId`、章节、地区、日期、版本状态和官方 URL。
5. 默认检索和演示页面只允许使用 `status=active` 且 `verificationStatus=human_verified` 的记录。
6. `historical`、`superseded` 和 `invalid` 文件继续保存，但不得进入 `active-chunks.jsonl`。
7. 官方分类必须原样保存，不建立第二套分类。页面筛选和检索扩展使用标签。
8. 北京市通用政策不得因为西红门镇居民可以办理而标记为西红门本地政策。
9. 知识库只保存公开政策信息。居民姓名、身份证号、电话、住址、健康状况和家庭情况不得进入本目录。
10. C 模块可以使用检索结果解释“可能匹配”，但正式资格判断必须由确定性规则和主管部门审核完成。

## 标签规范

标签使用 `维度:值` 格式，首批支持：

- 地区：`scope:beijing`、`scope:daxing`、`scope:xihongmen`
- 本地性：`locality:general`、`locality:daxing`、`locality:xihongmen`
- 人群：`audience:elderly`、`audience:children`、`audience:disabled`、`audience:low-income`
- 主题：`topic:pension`、`topic:medical`、`topic:housing`、`topic:social-assistance`

## 离线更新原则

公网采集只发生在审核环境。审核完成后形成包含清单、原文、附件和 SHA-256 校验值的文件包，再导入内网。内网运行时不抓取政府网站，不调用公共模型或外部向量数据库。
