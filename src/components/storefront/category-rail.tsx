import { Link } from "@tanstack/react-router";
import { ChevronRight, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { categoryProductsSearch, fetchActiveCategories, type Category } from "@/lib/categories";

function CategoryTree({
  cats,
  parentId,
  depth,
}: {
  cats: Category[];
  parentId: string | null;
  depth: number;
}) {
  const items = cats.filter((c) => c.parent_id === parentId);
  if (items.length === 0) return null;

  return (
    <>
      {items.map((c) => (
        <div key={c.id}>
          <Link
            to="/products"
            search={categoryProductsSearch(c.slug)}
            className="flex items-center justify-between py-2.5 text-sm hover:bg-accent hover:text-secondary transition-colors group"
            style={{ paddingLeft: `${16 + depth * 12}px`, paddingRight: "16px" }}
          >
            <span>{c.name}</span>
            <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-secondary shrink-0" />
          </Link>
          <CategoryTree cats={cats} parentId={c.id} depth={depth + 1} />
        </div>
      ))}
    </>
  );
}

export function CategoryRail() {
  const [cats, setCats] = useState<Category[]>([]);

  useEffect(() => {
    fetchActiveCategories()
      .then(setCats)
      .catch(() => setCats([]));
  }, []);

  return (
    <aside className="bg-card rounded-xl border border-border overflow-hidden self-start sticky top-4">
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-2 font-semibold text-sm">
        <Menu className="size-4" />
        หมวดหมู่สินค้า
      </div>
      <nav className="py-1">
        <Link
          to="/products"
          className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-accent hover:text-secondary transition-colors group font-medium"
        >
          <span>ทั้งหมด</span>
          <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-secondary" />
        </Link>
        <CategoryTree cats={cats} parentId={null} depth={0} />
        {cats.length === 0 && (
          <div className="px-4 py-3 text-xs text-muted-foreground">ยังไม่มีหมวดหมู่</div>
        )}
      </nav>
    </aside>
  );
}
