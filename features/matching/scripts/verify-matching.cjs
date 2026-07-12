/* eslint-disable @typescript-eslint/no-require-imports */

require("./register-typescript.cjs");

// 匹配验收必须可离线、可重复，不因本机是否配置模型而产生网络调用。
delete process.env.OPENAI_COMPATIBLE_API_KEY;

const { mockPolicies } = require("@/features/policy/mock-policies");
const { mockResidents } = require("@/features/resident/mock-residents");
const {
  extractVerifiedPolicyRuleSet,
  integratedResidentToFacts,
} = require("@/features/matching/integrated-providers");
const {
  evaluatePolicyRuleForFacts,
} = require("@/features/matching/matching-kernel");
const {
  matchPoliciesByResident,
  matchResidentsByPolicy,
} = require("@/features/matching/matching-service");
const {
  runMatchingKernelVerification,
} = require("@/features/matching/matching-verification");

const SCHEMA_VERSION = "matching-verification-v1";
const EXPECTED_POLICY_COUNT = 31;
const EXPECTED_RESIDENT_COUNT = 8;
const ALLOWED_STATUSES = new Set(["matched", "pending", "unmatched"]);
const CAMEL_CASE_PATTERN = /[a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*/;

function statusCounts(results) {
  const counts = { matched: 0, pending: 0, unmatched: 0 };
  for (const result of results) {
    if (Object.hasOwn(counts, result.status)) counts[result.status] += 1;
  }
  return counts;
}

function expectedIds(prefix, count) {
  return Array.from(
    { length: count },
    (_, index) => `${prefix}-${String(index + 1).padStart(3, "0")}`,
  );
}

function sameStrings(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function sameResult(left, right) {
  return (
    left.policyId === right.policyId &&
    left.residentId === right.residentId &&
    left.status === right.status &&
    sameStrings(left.reasons, right.reasons) &&
    sameStrings(left.missingFields, right.missingFields)
  );
}

function overrideFactValues(facts, values) {
  return facts.map((fact) =>
    Object.hasOwn(values, fact.key) ? { ...fact, value: values[fact.key] } : fact,
  );
}

function safeContext(value) {
  return JSON.parse(JSON.stringify(value));
}

async function run() {
  const failures = [];
  const assertions = [];

  function assert(name, passed, details = undefined) {
    const entry = { name, passed };
    if (details !== undefined) entry.details = safeContext(details);
    assertions.push(entry);
    if (!passed) failures.push(entry);
  }

  const policyIds = mockPolicies.map((policy) => policy.id);
  const residentIds = mockResidents.map((resident) => resident.id);

  assert(
    "政策数量固定为31项",
    mockPolicies.length === EXPECTED_POLICY_COUNT,
    { actual: mockPolicies.length, expected: EXPECTED_POLICY_COUNT },
  );
  assert(
    "居民数量固定为8名",
    mockResidents.length === EXPECTED_RESIDENT_COUNT,
    { actual: mockResidents.length, expected: EXPECTED_RESIDENT_COUNT },
  );
  assert(
    "政策ID连续且无重复",
    sameStrings(policyIds, expectedIds("policy", EXPECTED_POLICY_COUNT)),
    { actual: policyIds },
  );
  assert(
    "居民ID连续且无重复",
    sameStrings(residentIds, expectedIds("resident", EXPECTED_RESIDENT_COUNT)),
    { actual: residentIds },
  );

  const policySummaries = [];
  const resultMatrix = new Map();
  const allResults = [];

  for (const policy of mockPolicies) {
    let results;
    try {
      results = await matchResidentsByPolicy(policy.id);
    } catch (error) {
      assert(`政策 ${policy.id} 可以执行匹配`, false, {
        error: error instanceof Error ? error.message : String(error),
      });
      policySummaries.push({
        policyId: policy.id,
        policyName: policy.name,
        error: error instanceof Error ? error.message : String(error),
        results: [],
      });
      continue;
    }

    assert(
      `政策 ${policy.id} 返回8名居民`,
      results.length === EXPECTED_RESIDENT_COUNT,
      { actual: results.length, expected: EXPECTED_RESIDENT_COUNT },
    );

    const returnedResidentIds = results.map((result) => result.residentId);
    assert(
      `政策 ${policy.id} 居民集合完整`,
      sameStrings(returnedResidentIds, residentIds),
      { actual: returnedResidentIds, expected: residentIds },
    );

    for (const result of results) {
      const key = `${result.policyId}:${result.residentId}`;
      resultMatrix.set(key, result);
      allResults.push(result);

      assert(
        `${key} 使用合法状态`,
        result.policyId === policy.id && ALLOWED_STATUSES.has(result.status),
        { policyId: result.policyId, status: result.status },
      );
      assert(
        `${key} 匹配原因非空且可读`,
        Array.isArray(result.reasons) &&
          result.reasons.length > 0 &&
          result.reasons.every(
            (reason) => typeof reason === "string" && reason.trim().length > 0,
          ),
        { reasons: result.reasons },
      );
      assert(
        `${key} 待核实字段格式正确且无重复`,
        Array.isArray(result.missingFields) &&
          result.missingFields.every(
            (field) => typeof field === "string" && field.trim().length > 0,
          ) &&
          new Set(result.missingFields).size === result.missingFields.length,
        { missingFields: result.missingFields },
      );

      const leakedText = [...result.reasons, ...result.missingFields].filter(
        (value) => CAMEL_CASE_PATTERN.test(value),
      );
      assert(`${key} 不泄漏camelCase机器字段`, leakedText.length === 0, {
        leakedText,
      });
    }

    policySummaries.push({
      policyId: policy.id,
      policyName: policy.name,
      statusCounts: statusCounts(results),
      results,
    });
  }

  assert(
    "完成31项政策乘8名居民的248次正向验证",
    allResults.length === EXPECTED_POLICY_COUNT * EXPECTED_RESIDENT_COUNT,
    {
      actual: allResults.length,
      expected: EXPECTED_POLICY_COUNT * EXPECTED_RESIDENT_COUNT,
    },
  );
  assert(
    "248项正向结果均具有唯一政策居民组合",
    resultMatrix.size === EXPECTED_POLICY_COUNT * EXPECTED_RESIDENT_COUNT,
    {
      actual: resultMatrix.size,
      expected: EXPECTED_POLICY_COUNT * EXPECTED_RESIDENT_COUNT,
    },
  );

  for (const resident of mockResidents) {
    let reverseResults;
    try {
      reverseResults = await matchPoliciesByResident(resident.id);
    } catch (error) {
      assert(`居民 ${resident.id} 可以反向匹配政策`, false, {
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    assert(
      `居民 ${resident.id} 返回31项政策`,
      reverseResults.length === EXPECTED_POLICY_COUNT,
      { actual: reverseResults.length, expected: EXPECTED_POLICY_COUNT },
    );
    assert(
      `居民 ${resident.id} 政策集合完整`,
      sameStrings(
        reverseResults.map((result) => result.policyId),
        policyIds,
      ),
      {
        actual: reverseResults.map((result) => result.policyId),
        expected: policyIds,
      },
    );
    for (const reverseResult of reverseResults) {
      const key = `${reverseResult.policyId}:${reverseResult.residentId}`;
      const forwardResult = resultMatrix.get(key);
      assert(
        `${key} 双向接口结果一致`,
        Boolean(forwardResult) && sameResult(forwardResult, reverseResult),
        { forwardResult, reverseResult },
      );
    }
  }

  const policy004 = policySummaries.find(
    (summary) => summary.policyId === "policy-004",
  );
  const policy004RuleSet = await extractVerifiedPolicyRuleSet("policy-004");
  assert(
    "policy-004拆分参保条件和领取待遇条件",
    sameStrings(
      policy004RuleSet?.scenarios.map((scenario) => scenario.label) ?? [],
      ["参保条件", "领取待遇条件"],
    ),
    {
      scenarios: policy004RuleSet?.scenarios.map((scenario) => scenario.label),
    },
  );
  assert(
    "policy-004居民结果符合验收基线",
    Boolean(policy004?.results) &&
      [
        ["resident-001", "matched"],
        ["resident-002", "unmatched"],
        ["resident-003", "pending"],
        ["resident-004", "matched"],
        ["resident-005", "unmatched"],
        ["resident-006", "matched"],
        ["resident-007", "matched"],
        ["resident-008", "unmatched"],
      ].every(
        ([residentId, status]) =>
          policy004.results.find((result) => result.residentId === residentId)
            ?.status === status,
      ),
    { results: policy004?.results },
  );

  const policy014 = policySummaries.find(
    (summary) => summary.policyId === "policy-014",
  );
  assert(
    "policy-014居民结果符合验收基线",
    Boolean(policy014?.results) &&
      [
        ["resident-001", "matched"],
        ["resident-002", "unmatched"],
        ["resident-003", "pending"],
        ["resident-004", "matched"],
        ["resident-005", "unmatched"],
        ["resident-006", "pending"],
        ["resident-007", "unmatched"],
        ["resident-008", "unmatched"],
      ].every(
        ([residentId, status]) =>
          policy014.results.find((result) => result.residentId === residentId)
            ?.status === status,
      ),
    { results: policy014?.results },
  );

  const policy014Rule = policy014
    ? (await extractVerifiedPolicyRuleSet("policy-014"))?.scenarios[0]?.root
    : null;
  const baseFacts = integratedResidentToFacts(mockResidents[0]);
  const dynamicThresholdCases = [
    { familyPopulation: 3, assets: 570000, decision: "candidate" },
    { familyPopulation: 3, assets: 570001, decision: "not-candidate" },
    { familyPopulation: 4, assets: 760000, decision: "candidate" },
    { familyPopulation: 4, assets: 760001, decision: "not-candidate" },
  ];
  const dynamicThresholdResults = [];

  if (policy014Rule) {
    for (const testCase of dynamicThresholdCases) {
      const facts = overrideFactValues(baseFacts, {
        family_population: testCase.familyPopulation,
        householdHasHousingInBeijing: false,
        householdMonthlyIncomePerCapitaPrevious12Months: 4200,
        householdNetAssets: testCase.assets,
        hukouType: "北京市城镇户籍家庭",
      });
      const evaluation = await evaluatePolicyRuleForFacts(policy014Rule, facts);
      dynamicThresholdResults.push({ ...testCase, actual: evaluation.decision });
    }
  }
  assert(
    "policy-014按家庭人数应用57万元和76万元资产阈值",
    Boolean(policy014Rule) &&
      dynamicThresholdResults.every(
        (testCase) => testCase.actual === testCase.decision,
      ),
    { cases: dynamicThresholdResults },
  );

  const kernelCases = await runMatchingKernelVerification();
  for (const verificationCase of kernelCases) {
    assert(`内核：${verificationCase.name}`, verificationCase.passed);
  }

  const totals = statusCounts(allResults);
  assert(
    "整体验证覆盖matched、pending、unmatched三种状态",
    totals.matched > 0 && totals.pending > 0 && totals.unmatched > 0,
    totals,
  );

  const output = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    ok: failures.length === 0,
    scope: {
      policyCount: mockPolicies.length,
      residentCount: mockResidents.length,
      evaluationCount: allResults.length,
      expectedEvaluationCount:
        EXPECTED_POLICY_COUNT * EXPECTED_RESIDENT_COUNT,
      llmDisabledForDeterminism: true,
    },
    statusTotals: totals,
    assertionSummary: {
      total: assertions.length,
      passed: assertions.filter((entry) => entry.passed).length,
      failed: failures.length,
    },
    focusedChecks: {
      policy004Scenarios:
        policy004RuleSet?.scenarios.map((scenario) => scenario.label) ?? [],
      policy014DynamicThresholds: dynamicThresholdResults,
      kernelCases,
    },
    failures,
    policies: policySummaries,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (!output.ok) process.exitCode = 1;
}

run().catch((error) => {
  const output = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    ok: false,
    fatalError: error instanceof Error ? error.message : String(error),
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exitCode = 1;
});
