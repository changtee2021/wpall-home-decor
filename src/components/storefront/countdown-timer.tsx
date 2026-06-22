import { useEffect, useState } from "react";

function fmt(n: number) {
  return String(n).padStart(2, "0");
}

export function CountdownTimer({ to }: { to: string | Date }) {
  const target = typeof to === "string" ? new Date(to).getTime() : to.getTime();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return (
    <div className="inline-flex items-center gap-1 font-mono text-xs">
      <span className="bg-black/80 text-white rounded px-1.5 py-0.5">{fmt(h)}</span>:
      <span className="bg-black/80 text-white rounded px-1.5 py-0.5">{fmt(m)}</span>:
      <span className="bg-black/80 text-white rounded px-1.5 py-0.5">{fmt(s)}</span>
    </div>
  );
}
