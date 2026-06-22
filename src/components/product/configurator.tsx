import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Product, CurtainConfig, CurtainType } from "@/lib/types";
import { fabrics, tracks, accessories } from "@/lib/mock/fabrics";
import { calcPrice, curtainTypeLabels, defaultConfigFor, fmtNum, fmtTHB } from "@/lib/pricing";
import { useAppStore } from "@/lib/stores/app-store";
import { Check, ShoppingCart, Sparkles } from "lucide-react";

export function Configurator({ product }: { product: Product }) {
  const [config, setConfig] = useState<CurtainConfig>(() => defaultConfigFor(product));
  const navigate = useNavigate();
  const addToCart = useAppStore((s) => s.addToCart);
  const role = useAppStore((s) => s.role);

  const price = useMemo(() => calcPrice(config, product), [config, product]);
  const fabric = fabrics.find((f) => f.id === config.fabricId)!;
  const track = tracks.find((t) => t.id === config.trackId)!;
  const pricePerSqm =
    price.subtotal /
    Math.max(1, (config.widthCm / 100) * (config.heightCm / 100) * config.quantity);

  const update = <K extends keyof CurtainConfig>(k: K, v: CurtainConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const toggleAccessory = (id: string) =>
    setConfig((c) => ({
      ...c,
      accessoryIds: c.accessoryIds.includes(id)
        ? c.accessoryIds.filter((x) => x !== id)
        : [...c.accessoryIds, id],
    }));

  const handleAdd = () => {
    addToCart({
      id: crypto.randomUUID(),
      productId: product.id,
      productName: product.name,
      config,
      price,
    });
    navigate({ to: "/cart" });
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div
          className={`rounded-3xl bg-gradient-to-br ${product.bgClass} aspect-square flex items-center justify-center`}
        >
          <CurtainPreview config={config} fabric={fabric} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[product.bgClass, "from-stone-100 to-stone-50", "from-sky-100 to-sky-50"].map(
            (bg, i) => (
              <div
                key={i}
                className={`rounded-xl bg-gradient-to-br ${bg} aspect-square border border-border`}
              />
            ),
          )}
        </div>
      </div>

      <div className="lg:col-span-3 space-y-5">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {product.category}
          </div>
          <h1 className="text-2xl font-bold mt-1">{product.name}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">{product.description}</p>
        </div>

        {/* Dimensions */}
        <Section title="ขนาด (เซนติเมตร)">
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="กว้าง"
              value={config.widthCm}
              onChange={(v) => update("widthCm", v)}
              suffix="cm"
            />
            <NumberInput
              label="สูง"
              value={config.heightCm}
              onChange={(v) => update("heightCm", v)}
              suffix="cm"
            />
          </div>
        </Section>

        <Section title="ประเภทม่าน">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(curtainTypeLabels) as CurtainType[]).map((t) => (
              <button
                key={t}
                onClick={() => update("curtainType", t)}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                  config.curtainType === t
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                {curtainTypeLabels[t].split(" ")[0]}
              </button>
            ))}
          </div>
        </Section>

        <Section title="ตัวคูณผ้า (Fullness)">
          <div className="flex gap-2">
            {[2.0, 2.5, 3.0].map((f) => (
              <button
                key={f}
                onClick={() => update("fullness", f)}
                className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  config.fullness === f
                    ? "bg-secondary text-secondary-foreground border-secondary"
                    : "bg-card border-border"
                }`}
              >
                ×{f.toFixed(1)}
              </button>
            ))}
          </div>
        </Section>

        <Section title={`รหัสผ้า · ${fabric.code} ${fabric.color}`}>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {fabrics.map((f) => (
              <button
                key={f.id}
                onClick={() => update("fabricId", f.id)}
                aria-label={`เลือกผ้า ${f.code} สี ${f.color}`}
                aria-pressed={config.fabricId === f.id}
                className={`group rounded-xl border-2 p-1.5 transition-all ${
                  config.fabricId === f.id
                    ? "border-primary"
                    : "border-transparent hover:border-border"
                }`}
                title={`${f.code} · ${f.color}`}
              >
                <div className="aspect-square rounded-lg" style={{ background: f.swatch }} />
                <div className="text-[9px] mt-1 truncate font-medium">{f.code}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="ประเภทราง">
          <div className="grid grid-cols-3 gap-2">
            {tracks.map((t) => (
              <button
                key={t.id}
                onClick={() => update("trackId", t.id)}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                  config.trackId === t.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <div className="font-semibold">{t.name}</div>
                <div
                  className={`text-[10px] mt-0.5 ${config.trackId === t.id ? "opacity-80" : "text-muted-foreground"}`}
                >
                  {fmtTHB(t.pricePerMeter)}/ม.
                </div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="อุปกรณ์เสริม">
          <div className="grid sm:grid-cols-2 gap-2">
            {accessories.map((a) => {
              const on = config.accessoryIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggleAccessory(a.id)}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    on ? "bg-accent border-primary/40" : "bg-card border-border"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`size-4 rounded-md border flex items-center justify-center ${on ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}
                    >
                      {on && <Check className="size-3" />}
                    </span>
                    {a.name}
                  </span>
                  <span className="text-xs font-semibold text-primary">+{fmtTHB(a.price)}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Quantity + Price */}
        <div className="rounded-2xl border border-border bg-card p-4 sticky bottom-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                ราคารวม
              </div>
              <div className="text-3xl font-bold text-primary">{fmtTHB(price.subtotal)}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                ≈ {fmtTHB(pricePerSqm)}/ตร.ม. · ใช้ผ้า {fmtNum(price.fabricMeters)} ม. · ราง{" "}
                {fmtNum(price.trackMeters)} ม.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">จำนวน</span>
              <div className="flex items-center border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => update("quantity", Math.max(1, config.quantity - 1))}
                  className="px-3 py-2 hover:bg-accent"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={config.quantity}
                  onChange={(e) => update("quantity", Math.max(1, Number(e.target.value)))}
                  className="w-12 text-center text-sm font-semibold bg-transparent focus:outline-none"
                />
                <button
                  onClick={() => update("quantity", config.quantity + 1)}
                  className="px-3 py-2 hover:bg-accent"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {role === "sales" && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-secondary" />
              ราคาทุน (เซลล์เห็น):{" "}
              <span className="font-semibold text-foreground">{fmtTHB(price.costSubtotal)}</span> ·
              GP:{" "}
              <span className="font-semibold text-success">
                {fmtTHB(price.subtotal - price.costSubtotal)}
              </span>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAdd}
              className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart className="size-4" />
              เพิ่มลงตะกร้า
            </button>
            <button className="px-5 rounded-xl border border-border bg-card hover:bg-accent text-sm font-semibold">
              ออกใบเสนอราคา
            </button>
          </div>
        </div>

        {/* Breakdown */}
        <div className="rounded-2xl bg-muted/40 p-4 text-sm space-y-1.5">
          <Row
            label={`ผ้า ${fabric.code} (${fmtNum(price.fabricMeters)} ม.)`}
            value={fmtTHB(price.fabricCost)}
          />
          <Row
            label={`ราง ${track.name} (${fmtNum(price.trackMeters)} ม.)`}
            value={fmtTHB(price.trackCost)}
          />
          {price.accessoriesCost > 0 && (
            <Row label="อุปกรณ์เสริม" value={fmtTHB(price.accessoriesCost)} />
          )}
          <Row label="ค่าแรงตัดเย็บ" value={fmtTHB(price.labor)} />
          {config.quantity > 1 && <Row label={`× จำนวน ${config.quantity} ชุด`} value="" />}
        </div>
      </div>
    </div>
  );
}

function CurtainPreview({ config, fabric }: { config: CurtainConfig; fabric: { swatch: string } }) {
  const bars = config.curtainType === "roman" ? 4 : Math.round(8 * (config.fullness / 2.5));
  return (
    <svg viewBox="0 0 200 200" className="w-3/4 h-3/4">
      <rect x="10" y="14" width="180" height="6" rx="3" fill="rgba(0,0,0,0.3)" />
      {Array.from({ length: bars }).map((_, i) => {
        const w = 180 / bars;
        return (
          <rect
            key={i}
            x={10 + i * w + 1}
            y="22"
            width={w - 2}
            height={config.curtainType === "roman" ? 40 + i * 20 : 160}
            rx="6"
            fill={fabric.swatch}
            stroke="rgba(0,0,0,0.1)"
          />
        );
      })}
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold mb-2 text-foreground/80">{title}</div>
      {children}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center bg-card border border-border rounded-xl overflow-hidden">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
        />
        {suffix && <span className="px-3 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
