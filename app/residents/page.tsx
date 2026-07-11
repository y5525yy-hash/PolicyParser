import {
  ResidentDirectoryQuery,
  ResidentDirectoryTable,
} from "@/features/resident/resident-directory-table";
import { residentDirectoryRecords } from "@/features/resident/resident-directory-data";
import styles from "@/features/resident/resident-directory.module.css";

interface ResidentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function ResidentsPage({ searchParams }: ResidentsPageProps) {
  const params = await searchParams;
  const age = getParam(params, "age");
  const match = getParam(params, "match");
  const focus = getParam(params, "focus");
  const gender = getParam(params, "gender");
  const view = getParam(params, "view");
  const parsedPage = Number(getParam(params, "page"));
  const initialQuery: ResidentDirectoryQuery = {
    search: getParam(params, "search"),
    gender: gender === "女" || gender === "男" ? gender : "all",
    age:
      age === "under-60" ||
      age === "60-79" ||
      age === "80-plus" ||
      age === "unknown"
        ? age
        : "all",
    political: getParam(params, "political"),
    workUnit: getParam(params, "workUnit"),
    grid: getParam(params, "grid"),
    focus:
      focus === "elderly" ||
      focus === "living-alone" ||
      focus === "difficult" ||
      focus === "disability"
        ? focus
        : "all",
    match:
      match === "matched" || match === "pending" || match === "none"
        ? match
        : "all",
    view: view === "grid" ? "grid" : "list",
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    expanded: getParam(params, "expanded").split(",").filter(Boolean),
  };

  return (
    <section className={styles.directoryPage}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>乡村网格人员管理</p>
          <h1>人员管理</h1>
          <p>
            通过人员档案与乡村网格双视图开展多维查询、重点人群摸排和政策匹配跟进。
          </p>
        </div>
        <div className={styles.headerStat}>
          <strong>{residentDirectoryRecords.length}</strong>
          <span>名模拟居民</span>
        </div>
      </header>

      <ResidentDirectoryTable initialQuery={initialQuery} />
    </section>
  );
}
