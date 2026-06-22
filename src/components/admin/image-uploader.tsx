import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ImageUploader({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("product-images")
          .upload(path, file, { upsert: false });
        if (error) {
          toast.error(`อัปโหลดล้มเหลว: ${error.message}`);
          continue;
        }
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      onChange([...value, ...urls]);
      if (urls.length) toast.success(`อัปโหลด ${urls.length} รูปสำเร็จ`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div
            key={url}
            className="relative size-24 rounded-lg overflow-hidden border border-border group"
          >
            <img src={url} alt={`product ${i}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              <X className="size-3.5" />
            </button>
            {i === 0 && (
              <div className="absolute bottom-0 inset-x-0 bg-primary text-primary-foreground text-[10px] text-center py-0.5">
                หลัก
              </div>
            )}
          </div>
        ))}
        <label className="size-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 text-muted-foreground">
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
          <span className="text-[10px] mt-1">เพิ่มรูป</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">รูปแรกจะเป็นรูปหลักที่แสดงบนการ์ดสินค้า</p>
    </div>
  );
}
