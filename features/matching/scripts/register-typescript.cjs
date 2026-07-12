/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");

const workspaceRoot = path.resolve(__dirname, "../../..");
const ts = require(path.join(workspaceRoot, "node_modules/typescript"));

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveWorkspaceAlias(
  request,
  parent,
  isMain,
  options,
) {
  const resolvedRequest = request.startsWith("@/")
    ? path.join(workspaceRoot, request.slice(2))
    : request;

  return originalResolveFilename.call(
    this,
    resolvedRequest,
    parent,
    isMain,
    options,
  );
};

function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );

  if (errors.length > 0) {
    const detail = ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: (value) => value,
      getCurrentDirectory: () => workspaceRoot,
      getNewLine: () => "\n",
    });
    throw new Error(`TypeScript 脚本加载失败：\n${detail}`);
  }

  module._compile(result.outputText, filename);
}

require.extensions[".ts"] = compileTypeScript;
require.extensions[".tsx"] = compileTypeScript;

process.chdir(workspaceRoot);

module.exports = { workspaceRoot };
