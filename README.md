# 西红门民生政策助手

黑客松三人并行开发项目。当前演示口径统一为北京市大兴区西红门镇。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000/policies`。

## 分支规则

- `main`: 稳定演示版本
- `dev`: 唯一集成分支
- `feature/policy`: A 的政策模块
- `feature/resident`: B 的居民档案和代办台账
- `feature/matching`: C 的匹配引擎

所有功能 PR 的目标分支均为 `dev`。最终演示通过后再由 A 将 `dev` 合入 `main`。

