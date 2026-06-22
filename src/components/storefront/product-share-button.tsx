import { Link2, Share2, Smartphone } from "lucide-react";
import { type MouseEvent, useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  copyProductLink,
  facebookShareUrl,
  lineShareUrl,
  nativeShareProduct,
  openShareWindow,
  productShareText,
  productShareUrl,
  twitterShareUrl,
  type ProductShareTarget,
} from "@/lib/product-share";

function stopCardNav(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.627.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"
      />
    </svg>
  );
}

/** Share menu for product cards — does not navigate the parent Link. */
export function ProductShareButton({
  product,
  className = "",
}: {
  product: ProductShareTarget;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const url = productShareUrl(product);
  const text = productShareText(product);

  const handleCopy = async (e: MouseEvent) => {
    stopCardNav(e);
    try {
      await copyProductLink(url);
      toast.success("คัดลอกลิงก์แล้ว");
      setOpen(false);
    } catch {
      toast.error("คัดลอกลิงก์ไม่สำเร็จ");
    }
  };

  const handleFacebook = (e: MouseEvent) => {
    stopCardNav(e);
    openShareWindow(facebookShareUrl(url));
    setOpen(false);
  };

  const handleLine = (e: MouseEvent) => {
    stopCardNav(e);
    openShareWindow(lineShareUrl(url));
    setOpen(false);
  };

  const handleTwitter = (e: MouseEvent) => {
    stopCardNav(e);
    openShareWindow(twitterShareUrl(url, text));
    setOpen(false);
  };

  const handleNative = async (e: MouseEvent) => {
    stopCardNav(e);
    try {
      const ok = await nativeShareProduct(product, url);
      if (!ok) toast.info("เบราว์เซอร์นี้ไม่รองรับการแชร์");
      else setOpen(false);
    } catch {
      /* user cancelled */
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="แชร์สินค้า"
          onClick={stopCardNav}
          onPointerDown={stopCardNav}
          className={`z-10 flex size-9 items-center justify-center min-h-[44px] min-w-[44px] ${className}`}
        >
          <Share2 className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        sideOffset={6}
        className="w-48"
        onClick={stopCardNav}
      >
        <DropdownMenuItem onClick={handleCopy} className="gap-2 cursor-pointer">
          <Link2 className="size-4" />
          คัดลอกลิงก์
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleFacebook} className="gap-2 cursor-pointer">
          <FacebookIcon className="size-4 text-[#1877F2]" />
          แชร์ Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLine} className="gap-2 cursor-pointer">
          <LineIcon className="size-4 text-[#06C755]" />
          แชร์ LINE
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTwitter} className="gap-2 cursor-pointer">
          <span className="size-4 font-bold text-xs leading-none">𝕏</span>
          แชร์ X
        </DropdownMenuItem>
        {canNativeShare && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleNative} className="gap-2 cursor-pointer">
              <Smartphone className="size-4" />
              แชร์อื่นๆ
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
