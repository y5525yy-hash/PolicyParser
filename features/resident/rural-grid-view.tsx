import Link from "next/link";

import type { ResidentDirectoryRecord } from "@/features/resident/resident-directory-data";
import styles from "@/features/resident/resident-directory.module.css";
import type { MatchResult } from "@/shared/types";

interface RuralGridViewProps {
  currentListUrl: string;
  matches: MatchResult[];
  records: ResidentDirectoryRecord[];
  saveScrollPosition: () => void;
}

export function RuralGridView({
  currentListUrl,
  matches,
  records,
  saveScrollPosition,
}: RuralGridViewProps) {
  const villages = Array.from(
    new Set(records.map(({ metadata }) => metadata.administrativeVillage)),
  );
  const gridCount = new Set(
    records.map(
      ({ metadata }) =>
        `${metadata.administrativeVillage}-${metadata.gridName}`,
    ),
  ).size;
  const groupCount = new Set(
    records.map(({ metadata }) => metadata.villageGroup),
  ).size;
  const focusCount = records.filter(({ resident }) =>
    resident.labels.some((label) =>
      ["高龄", "独居", "低保", "低收入", "失能待核实"].includes(label),
    ),
  ).length;

  return (
    <section className={styles.gridView} aria-label="乡村网格层级视图">
      <div className={styles.gridSummary}>
        <div>
          <strong>{villages.length}</strong>
          <span>行政村 / 社区</span>
        </div>
        <div>
          <strong>{gridCount}</strong>
          <span>责任网格</span>
        </div>
        <div>
          <strong>{groupCount}</strong>
          <span>村民小组</span>
        </div>
        <div>
          <strong>{records.length}</strong>
          <span>户籍档案</span>
        </div>
        <div>
          <strong>{focusCount}</strong>
          <span>重点关注人员</span>
        </div>
      </div>

      <div className={styles.villageTree}>
        {villages.map((village) => {
          const villageRecords = records.filter(
            ({ metadata }) => metadata.administrativeVillage === village,
          );
          const grids = Array.from(
            new Set(villageRecords.map(({ metadata }) => metadata.gridName)),
          );

          return (
            <section className={styles.villageNode} key={village}>
              <div className={styles.villageHeading}>
                <div>
                  <span className={styles.levelMark}>行政村 / 社区</span>
                  <h3>{village}</h3>
                </div>
                <span>{villageRecords.length} 户 · {grids.length} 个网格</span>
              </div>

              <div className={styles.gridNodes}>
                {grids.map((gridName) => {
                  const gridRecords = villageRecords.filter(
                    ({ metadata }) => metadata.gridName === gridName,
                  );
                  const groups = Array.from(
                    new Set(
                      gridRecords.map(({ metadata }) => metadata.villageGroup),
                    ),
                  );
                  const pendingCount = gridRecords.filter(({ resident }) =>
                    matches.some(
                      (match) =>
                        match.residentId === resident.id &&
                        match.status === "pending",
                    ),
                  ).length;

                  return (
                    <details className={styles.gridNode} key={gridName} open>
                      <summary>
                        <span>
                          <span className={styles.levelMark}>责任网格</span>
                          <strong>{gridName}</strong>
                        </span>
                        <span className={styles.gridMetrics}>
                          {gridRecords.length} 户
                          {pendingCount > 0 ? ` · ${pendingCount} 户待核实` : ""}
                        </span>
                      </summary>

                      <div className={styles.groupNodes}>
                        {groups.map((group) => {
                          const groupRecords = gridRecords.filter(
                            ({ metadata }) => metadata.villageGroup === group,
                          );

                          return (
                            <div className={styles.groupNode} key={group}>
                              <div className={styles.groupHeading}>
                                <span>
                                  <span className={styles.levelMark}>村民小组</span>
                                  <strong>{group}</strong>
                                </span>
                                <span>{groupRecords.length} 户</span>
                              </div>
                              <div className={styles.householdRows}>
                                {groupRecords.map(({ resident, metadata }) => (
                                  <div className={styles.householdRow} key={resident.id}>
                                    <span className={styles.householdCode}>
                                      {metadata.householdCode}
                                    </span>
                                    <Link
                                      href={`/residents/${resident.id}?from=${encodeURIComponent(currentListUrl)}`}
                                      onClick={saveScrollPosition}
                                    >
                                      {resident.name}
                                    </Link>
                                    <span>{metadata.gender} · {resident.age} 岁</span>
                                    <span className={styles.compactTags}>
                                      {resident.labels.slice(0, 2).join(" / ")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
