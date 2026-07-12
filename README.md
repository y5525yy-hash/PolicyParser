# 西红门民生政策助手

黑客松三人并行开发项目。当前演示口径统一为北京市大兴区西红门镇。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000/policies`。

## 交付前验证

```bash
npm run lint
./node_modules/.bin/tsc --noEmit --incremental false
npm run verify:matching
npm run verify:llm
npm run verify:synthetic
npm run build
```

`verify:llm` 会使用真实的字段语义对齐 Prompt 调用模型，并检查模型只能从请求提供的 `criterionId` 和 `factKey` 白名单中返回映射。居民字段值不会发送给模型，最终资格仍由确定性规则脚本计算。

`verify:synthetic` 先用人工冻结的正确答案验证 5 名合成居民，再执行一次真实 LLM 字段语义对齐。模型仍只接收字段元数据；25 个资格结果全部由确定性内核计算并与人工答案比较。

## Vercel 展示部署

```bash
npx vercel@latest login
npx vercel@latest teams list --format json
npx vercel@latest --yes --scope <Vercel工作区slug>
```

必须先确认工作区成员、OWNER 和套餐，再显式使用工作区 `slug` 作为 `--scope`，不要依赖 CLI 当前默认范围。Vercel CLI 不允许把个人用户名直接作为 `--scope`。

在 Vercel 项目中配置以下服务端环境变量后重新部署：

```text
OPENAI_COMPATIBLE_API_KEY
OPENAI_COMPATIBLE_BASE_URL=https://api.openai-next.com/v1
OPENAI_COMPATIBLE_MODEL=gpt-5.6-terra
OPENAI_COMPATIBLE_TIMEOUT_MS=20000
```

不得给这些变量添加 `NEXT_PUBLIC_` 前缀。`.vercelignore` 会阻止 `.env.local`、本地手册和开发产物被 Vercel CLI 上传。

## 分支规则

- `main`: 稳定演示版本
- `dev`: 唯一集成分支
- `feature/policy`: A 的政策模块
- `feature/resident`: B 的居民档案和代办台账
- `feature/matching`: C 的匹配引擎

所有功能 PR 的目标分支均为 `dev`。最终演示通过后再由 A 将 `dev` 合入 `main`。
