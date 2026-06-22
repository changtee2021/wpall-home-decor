import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/types";
import { fmtTHB } from "@/lib/pricing";

export function ProductCard({
  product,
  size = "md",
}: {
  product: Product;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Link
      to="/products/$id"
      params={{ id: product.id }}
      className={`group block bg-card rounded-2xl border border-border hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden`}
    >
      <div
        className={`relative bg-gradient-to-br ${product.bgClass} ${size === "lg" ? "h-56" : "h-36"} flex items-center justify-center overflow-hidden`}
      >
        {product.badge && (
          <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider bg-foreground text-background rounded-full px-2.5 py-1">
            {product.badge}
          </span>
        )}
        <CurtainGlyph type={product.curtainType} />
      </div>
      <div className="p-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          {product.category}
        </div>
        <div className="font-semibold text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
          {product.name}
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-primary font-bold text-base">{fmtTHB(product.basePrice)}</span>
          <span className="text-[10px] text-muted-foreground">เริ่มต้น</span>
        </div>
      </div>
    </Link>
  );
}

function CurtainGlyph({ type }: { type: string }) {
  // Decorative SVG that represents curtain folds
  const bars = type === "roman" ? 4 : type === "eyelet" ? 8 : 6;
  return (
    <svg viewBox="0 0 120 100" className="w-3/4 h-3/4 opacity-90">
      <defs>
        <linearGradient id={`g-${type}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.7" />
          <stop offset="100%" stopColor="white" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <rect x="10" y="8" width="100" height="4" rx="2" fill="rgba(0,0,0,0.25)" />
      {Array.from({ length: bars }).map((_, i) => {
        const w = 100 / bars;
        return (
          <rect
            key={i}
            x={10 + i * w + 1}
            y="14"
            width={w - 2}
            height={type === "roman" ? 20 + i * 12 : 78}
            rx="6"
            fill={`url(#g-${type})`}
            stroke="rgba(0,0,0,0.08)"
          />
        );
      })}
    </svg>
  );
}
