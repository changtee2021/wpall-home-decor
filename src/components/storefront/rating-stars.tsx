import { Star } from "lucide-react";

interface RatingStarsProps {
  value: number;
  size?: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
}

export function RatingStars({ value, size = 14, interactive, onChange }: RatingStarsProps) {
  const full = Math.floor(value);
  const half = !interactive && value - full >= 0.5;

  return (
    <div className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        const filled = interactive ? starValue <= value : i < full || (i === full && half);
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(starValue)}
            className={
              interactive
                ? "p-0.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
                : "pointer-events-none"
            }
            aria-label={interactive ? `${starValue} ดาว` : undefined}
          >
            <Star
              style={{ width: size, height: size }}
              className={filled ? "fill-amber-500" : "text-muted-foreground/40"}
            />
          </button>
        );
      })}
    </div>
  );
}
