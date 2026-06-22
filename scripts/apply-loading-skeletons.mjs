import fs from "fs";
import path from "path";

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

const accountVariant = {
  "account.addresses.tsx": "cards",
  "account.favorites.tsx": "grid",
  "account.coupons.tsx": "cards",
  "account.notifications.tsx": "cards",
  "account.reviews.tsx": "cards",
  "account.security.tsx": "form",
  "account.wallet.topup.tsx": "form",
  "account.claims.new.tsx": "form",
  "account.claims.tsx": "table",
  "account.claims.$id.tsx": "cards",
};

const replacements = [
  [
    /if \(loading\) return <div className="p-10 text-sm text-muted-foreground">กำลังโหลด\.\.\.<\/div>;/g,
    "LOADING",
  ],
  [
    /if \(loading\) return <p className="p-10 text-sm text-muted-foreground">กำลังโหลด\.\.\.<\/p>;/g,
    "LOADING",
  ],
  [
    /if \(loading \|\| fetching\) \{\s*return <div className="p-10 text-sm text-muted-foreground">กำลังโหลด\.\.\.<\/div>;\s*\}/g,
    "LOADING_BLOCK",
  ],
  [
    /return <div className="p-10 text-sm text-muted-foreground">กำลังโหลด\.\.\.<\/div>;/g,
    "LOADING_RETURN",
  ],
  [
    /if \(!data\) return <p className="p-10 text-sm text-muted-foreground">กำลังโหลดรายละเอียด\.\.\.<\/p>;/g,
    'if (!data) return <PageSkeleton cards={2} className="p-10" />;',
  ],
  [
    /if \(!data\) return <p className="p-10 text-sm text-muted-foreground">กำลังโหลด\.\.\.<\/p>;/g,
    'if (!data) return <PageSkeleton cards={2} className="p-10" />;',
  ],
];

for (const file of walk("src/routes")) {
  const base = path.basename(file);
  let content = fs.readFileSync(file, "utf8");
  if (!content.includes("กำลังโหลด")) continue;

  const isAccount = base.startsWith("account.");
  const isAdminIndex = base === "admin.index.tsx";
  const isAdmin = file.includes(`${path.sep}admin`) || base.startsWith("admin.");

  let variant = accountVariant[base] ?? "cards";
  let loadingReplacement = isAccount
    ? `if (loading) return <AccountPageSkeleton variant="${variant}" />;`
    : isAdminIndex
      ? "if (loading) return <AdminDashboardSkeleton />;"
      : "if (loading) return <AdminPageSkeleton />;";

  if (base.includes("products.new") || base === "admin.products.$id.tsx") {
    loadingReplacement = 'if (loading) return <FormPageSkeleton className="p-10" />;';
  }

  let changed = false;
  for (const [re, rep] of replacements) {
    if (re.test(content)) {
      content = content.replace(re, (_, ...args) => {
        changed = true;
        if (rep === "LOADING") return loadingReplacement;
        if (rep === "LOADING_BLOCK")
          return `if (loading || fetching) return <AccountPageSkeleton variant="${variant}" />;`;
        if (rep === "LOADING_RETURN") {
          if (base.includes("products.$id") || base.includes("hotspots")) {
            return 'return <FormPageSkeleton className="p-10" />;';
          }
          return isAdmin
            ? "return <AdminPageSkeleton />;"
            : loadingReplacement.replace("if (loading) ", "");
        }
        return rep;
      });
    }
  }

  if (!changed) continue;

  if (!content.includes("@/components/loading")) {
    const importLine = isAccount
      ? 'import { AccountPageSkeleton, PageSkeleton, FormPageSkeleton } from "@/components/loading";\n'
      : isAdminIndex
        ? 'import { AdminDashboardSkeleton, AdminPageSkeleton, FormPageSkeleton, PageSkeleton } from "@/components/loading";\n'
        : 'import { AdminPageSkeleton, AdminDashboardSkeleton, FormPageSkeleton, PageSkeleton } from "@/components/loading";\n';
    const lastImport = content.lastIndexOf("\nimport ");
    const insertAt = content.indexOf("\n", lastImport + 1) + 1;
    content = content.slice(0, insertAt) + importLine + content.slice(insertAt);
  }

  fs.writeFileSync(file, content);
  console.log("updated", file);
}
