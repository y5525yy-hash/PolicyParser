import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ENTITY_MAP = {
  "&nbsp;": " ",
  "&#160;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

function decodeEntities(value) {
  return value
    .replace(/&(nbsp|amp|lt|gt|quot);|&#(?:160|39);/g, (entity) => ENTITY_MAP[entity] ?? entity)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

export function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t　 ]+/g, " ").trim())
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractOfficialText(text, options) {
  const startOccurrence = options.startOccurrence ?? "first";
  let startIndex = 0;

  if (options.startMarker) {
    startIndex =
      startOccurrence === "last"
        ? text.lastIndexOf(options.startMarker)
        : text.indexOf(options.startMarker);

    if (startIndex < 0) {
      throw new Error(`start marker not found: ${options.startMarker}`);
    }
  }

  let endIndex = text.length;
  if (options.endMarker) {
    endIndex = text.indexOf(options.endMarker, startIndex);
    if (endIndex < 0) {
      throw new Error(`end marker not found: ${options.endMarker}`);
    }
  }

  return text.slice(startIndex, endIndex).trim();
}

function parseArgs(argv) {
  const options = { startOccurrence: "first" };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--url") {
      options.url = argv[++index];
    } else if (value === "--output") {
      options.output = argv[++index];
    } else if (value === "--start") {
      options.startMarker = argv[++index];
    } else if (value === "--end") {
      options.endMarker = argv[++index];
    } else if (value === "--start-occurrence") {
      options.startOccurrence = argv[++index];
    }
  }

  return options;
}

function assertOfficialUrl(value) {
  const url = new URL(value);
  if (!url.hostname.endsWith(".gov.cn") && url.hostname !== "gov.cn") {
    throw new Error(`only official gov.cn sources are allowed: ${url.hostname}`);
  }
  return url;
}

async function runCli() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.url || !options.output) {
    throw new Error("--url and --output are required");
  }

  const url = assertOfficialUrl(options.url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const response = await fetch(url, {
    headers: { "user-agent": "SheNicestPolicyCollector/1.0" },
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`source request failed with ${response.status}`);
  }

  const officialText = extractOfficialText(htmlToText(await response.text()), options);
  const scriptPath = fileURLToPath(import.meta.url);
  const sourceRoot = path.resolve(path.dirname(scriptPath), "../data/sources");
  const outputPath = path.resolve(sourceRoot, options.output);

  if (!outputPath.startsWith(`${sourceRoot}${path.sep}`)) {
    throw new Error("output must stay inside data/sources");
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${officialText}\n`, "utf8");
  const sha256 = createHash("sha256").update(`${officialText}\n`).digest("hex");
  console.log(JSON.stringify({ output: path.relative(sourceRoot, outputPath), sha256 }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runCli();
}
