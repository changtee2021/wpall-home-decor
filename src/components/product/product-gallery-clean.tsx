import { Images } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PDHotspot } from "@/components/product/product-detail";

interface ProductGalleryCleanProps {
  productName: string;
  badge: string | null;
  gallery: string[];
  activeImg: number;
  onActiveImgChange: (index: number) => void;
  hotspots: PDHotspot[];
  selected: Record<string, string>;
  onSelectOption: (groupId: string, optionId: string) => void;
}

export function ProductGalleryClean({
  productName,
  badge,
  gallery,
  activeImg,
  onActiveImgChange,
  hotspots,
  selected,
  onSelectOption,
}: ProductGalleryCleanProps) {
  const mainSrc = gallery[activeImg];

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
      {/* Vertical thumbnails — desktop only */}
      {gallery.length > 1 && (
        <div className="hidden lg:flex flex-col gap-2 shrink-0">
          {gallery.map((g, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onActiveImgChange(i)}
              className={`size-[72px] rounded-lg overflow-hidden border-2 transition-colors ${
                activeImg === i ? "border-primary" : "border-border hover:border-primary/40"
              }`}
            >
              <img src={g} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div className="flex-1 min-w-0">
        <div className="relative bg-white aspect-[4/3] flex items-center justify-center overflow-hidden">
          {mainSrc ? (
            <img
              src={mainSrc}
              alt={productName}
              className="w-full h-full object-contain"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full bg-muted/30 flex items-center justify-center text-6xl text-muted-foreground/30">
              🪟
            </div>
          )}

          {hotspots.map((h, i) => (
            <Popover key={h.id}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="absolute -translate-x-1/2 -translate-y-1/2 size-7 rounded-full bg-primary text-primary-foreground text-[11px] font-bold shadow-md ring-4 ring-primary/20 hover:scale-110 transition-transform flex items-center justify-center"
                  style={{ left: `${h.coord_x}%`, top: `${h.coord_y}%` }}
                  aria-label={`เลือก ${h.pin_label}`}
                >
                  {i + 1}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="center">
                <div className="text-xs font-semibold mb-2">{h.pin_label}</div>
                {h.group && (
                  <div className="grid grid-cols-4 gap-2">
                    {h.group.options.map((o) => {
                      const isOn = selected[h.group!.id] === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => onSelectOption(h.group!.id, o.id)}
                          className={`flex flex-col items-center gap-1 rounded-lg p-1.5 border-2 transition-colors ${
                            isOn
                              ? "border-primary bg-accent"
                              : "border-transparent hover:border-border"
                          }`}
                          title={o.label}
                        >
                          <span
                            className="size-8 rounded-md border border-border"
                            style={{
                              background:
                                o.swatch_color ?? `url(${o.image_url ?? ""}) center/cover`,
                            }}
                          />
                          <span className="text-[9px] truncate w-full">{o.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          ))}

          {badge && (
            <Badge className="absolute top-3 left-3 bg-secondary text-secondary-foreground border-0">
              {badge}
            </Badge>
          )}

          {gallery.length > 1 && (
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[11px] text-white">
                <Images className="size-3.5" />
                {activeImg + 1} / {gallery.length}
              </span>
            </div>
          )}
        </div>

        {/* Horizontal thumbnails — mobile */}
        {gallery.length > 1 && (
          <div className="flex lg:hidden gap-2 mt-3 overflow-x-auto pb-1">
            {gallery.map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onActiveImgChange(i)}
                className={`size-16 shrink-0 rounded-lg overflow-hidden border-2 ${
                  activeImg === i ? "border-primary" : "border-border hover:border-primary/40"
                }`}
              >
                <img src={g} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
