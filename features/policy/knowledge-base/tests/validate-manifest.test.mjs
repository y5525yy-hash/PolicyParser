import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateManifest } from "../scripts/validate-manifest.mjs";

const fixtureUrl = (name) => new URL(`./fixtures/${name}`, import.meta.url);

async function loadFixture(name) {
  return JSON.parse(await readFile(fixtureUrl(name), "utf8"));
}

test("accepts stable unique policy and document ids", async () => {
  const manifest = await loadFixture("valid-manifest.json");
  const errors = validateManifest(manifest, {
    allowedPolicyIds: new Set(["policy-001"]),
  });

  assert.deepEqual(errors, []);
});

test("rejects duplicate document ids", async () => {
  const manifest = await loadFixture("valid-manifest.json");
  manifest.documents.push({ ...manifest.documents[0] });

  const errors = validateManifest(manifest, {
    allowedPolicyIds: new Set(["policy-001"]),
  });

  assert.ok(errors.some((error) => error.includes("duplicate documentId")));
});

test("rejects duplicate policy ids", async () => {
  const manifest = await loadFixture("duplicate-policy-id.json");
  const errors = validateManifest(manifest, {
    allowedPolicyIds: new Set(["policy-001"]),
  });

  assert.ok(errors.some((error) => error.includes("duplicate policyId")));
});

test("rejects a UI policyId missing from demo constants", async () => {
  const manifest = await loadFixture("valid-manifest.json");
  manifest.policies[0].policyId = "policy-999";

  const errors = validateManifest(manifest, {
    allowedPolicyIds: new Set(["policy-001"]),
  });

  assert.ok(errors.some((error) => error.includes("not registered")));
});

test("rejects active human-verified documents without full source text", async () => {
  const manifest = await loadFixture("valid-manifest.json");
  manifest.documents[0].sourceTextPath = "";

  const errors = validateManifest(manifest, {
    allowedPolicyIds: new Set(["policy-001"]),
  });

  assert.ok(errors.some((error) => error.includes("sourceTextPath")));
});

test("rejects effectiveTo before effectiveFrom", async () => {
  const manifest = await loadFixture("valid-manifest.json");
  manifest.documents[0].effectiveTo = "2019-01-01";

  const errors = validateManifest(manifest, {
    allowedPolicyIds: new Set(["policy-001"]),
  });

  assert.ok(errors.some((error) => error.includes("effectiveTo")));
});

test("rejects invalid documents marked searchable", async () => {
  const manifest = await loadFixture("valid-manifest.json");
  manifest.documents[0].status = "invalid";
  manifest.documents[0].searchable = true;

  const errors = validateManifest(manifest, {
    allowedPolicyIds: new Set(["policy-001"]),
  });

  assert.ok(errors.some((error) => error.includes("invalid document")));
});
