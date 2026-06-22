import { useEffect, useState } from "react";

interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url?: string | null;
}

export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setI((x) => (x + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) {
    return (
      <div className="aspect-[16/7] sm:aspect-[21/7] rounded-2xl bg-gradient-to-br from-primary via-orange-500 to-red-500 text-white flex items-center justify-center text-center p-6">
        <div>
          <div className="text-2xl sm:text-4xl font-bold">โปรโมชัน WP ALL</div>
          <div className="text-sm sm:text-base mt-1 opacity-90">
            ส่วนลดสูงสุด 50% เฉพาะลูกค้าสมาชิก
          </div>
        </div>
      </div>
    );
  }

  const b = banners[i];
  const inner = (
    <div className="aspect-[16/7] sm:aspect-[21/7] rounded-2xl overflow-hidden bg-muted relative">
      <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-white" : "w-1.5 bg-white/60"}`}
            aria-label={`แบนเนอร์ที่ ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
  return b.link_url ? <a href={b.link_url}>{inner}</a> : inner;
}
