import { Zap } from "lucide-react";
import { CountdownTimer } from "./countdown-timer";
import { ProductCardShopee, type ShopeeProduct } from "./product-card-shopee";

interface Props {
  title?: string;
  endsAt: string | Date;
  items: ShopeeProduct[];
}

export function FlashSaleStrip({ title = "FLASH SALE", endsAt, items }: Props) {
  if (items.length === 0) return null;
  return (
    <section className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-2xl p-3 sm:p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-bold">
          <Zap className="size-5 fill-yellow-300 text-yellow-300" />
          <span className="text-base sm:text-lg tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] hidden sm:inline">จะหมดใน</span>
          <CountdownTimer to={endsAt} />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {items.map((p) => (
          <div key={p.id} className="w-32 sm:w-40 shrink-0 snap-start">
            <ProductCardShopee p={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
