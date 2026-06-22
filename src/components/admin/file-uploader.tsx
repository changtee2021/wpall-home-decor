import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, FileText, History, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FileRow {
  id: string;
  product_id: string;
  kind: string;
  title: string;
  version: number;
  file_path: string;
  mime_type: string | null;
  size_bytes: number;
  is_current: boolean;
  created_at: string;
}

const KINDS = [
  { value: "catalog", label: "แคตตาล็อก" },
  { value: "spec", label: "สเปก" },
  { value: "sample", label: "ตัวอย่าง" },
  { value: "other", label: "อื่นๆ" },
];

export function ProductFilesSection({ productId }: { productId: string }) {
  const [rows, setRows] = useState<FileRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState("catalog");
  const [title, setTitle] = useState("");
  const [showHistoryOf, setShowHistoryOf] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("product_files")
      .select("*")
      .eq("product_id", productId)
      .order("title")
      .order("version", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data ?? []) as FileRow[]);
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [productId]);

  const upload = async (file: File) => {
    const t = title.trim() || file.name.replace(/\.[^.]+$/, "");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${productId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-files")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      // determine next version
      const { data: existing } = await supabase
        .from("product_files")
        .select("version")
        .eq("product_id", productId)
        .eq("title", t)
        .order("version", { ascending: false })
        .limit(1);
      const nextVer = (existing?.[0]?.version ?? 0) + 1;

      // unset current
      if (nextVer > 1) {
        await supabase
          .from("product_files")
          .update({ is_current: false })
          .eq("product_id", productId)
          .eq("title", t);
      }
      const { data: userData } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("product_files").insert({
        product_id: productId,
        kind,
        title: t,
        version: nextVer,
        file_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        is_current: true,
        uploaded_by: userData.user?.id,
      });
      if (insErr) throw insErr;
      toast.success(`อัปโหลด ${t} เวอร์ชัน ${nextVer} สำเร็จ`);
      setTitle("");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r: FileRow) => {
    if (!confirm(`ลบไฟล์ "${r.title}" v${r.version}?`)) return;
    await supabase.storage.from("product-files").remove([r.file_path]);
    await supabase.from("product_files").delete().eq("id", r.id);
    // if this was current, promote latest remaining
    if (r.is_current) {
      const { data: remaining } = await supabase
        .from("product_files")
        .select("id,version")
        .eq("product_id", productId)
        .eq("title", r.title)
        .order("version", { ascending: false })
        .limit(1);
      if (remaining?.[0])
        await supabase.from("product_files").update({ is_current: true }).eq("id", remaining[0].id);
    }
    toast.success("ลบไฟล์แล้ว");
    load();
  };

  const download = async (r: FileRow) => {
    const { data, error } = await supabase.storage
      .from("product-files")
      .createSignedUrl(r.file_path, 60);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  // group by title, current row only
  const groups = Array.from(
    new Map(rows.filter((r) => r.is_current).map((r) => [r.title, r])).values(),
  );

  return (
    <div className="space-y-5">
      <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
        <div className="text-sm font-semibold">อัปโหลดเอกสารใหม่</div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="ชื่อเอกสาร (เว้นว่าง = ใช้ชื่อไฟล์)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="sm:col-span-2"
          />
        </div>
        <label className="flex items-center gap-2 border-2 border-dashed border-border rounded-xl px-4 py-6 justify-center cursor-pointer hover:bg-accent/30">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          <span className="text-sm">
            {busy ? "กำลังอัปโหลด..." : "เลือกไฟล์เพื่ออัปโหลด (อัปซ้ำชื่อเดิม = เพิ่มเวอร์ชัน)"}
          </span>
          <input
            type="file"
            className="hidden"
            disabled={busy}
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </label>
      </div>

      <div className="space-y-2">
        {groups.length === 0 && (
          <div className="text-sm text-muted-foreground py-6 text-center">ยังไม่มีเอกสาร</div>
        )}
        {groups.map((g) => {
          const history = rows.filter((r) => r.title === g.title);
          const open = showHistoryOf === g.title;
          return (
            <div key={g.id} className="border border-border rounded-xl bg-card">
              <div className="flex items-center gap-3 p-3">
                <FileText className="size-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{g.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {KINDS.find((k) => k.value === g.kind)?.label ?? g.kind} · v{g.version} ·{" "}
                    {(g.size_bytes / 1024).toFixed(1)} KB
                  </div>
                </div>
                <Badge variant="secondary" className="font-normal">
                  {history.length} เวอร์ชัน
                </Badge>
                <Button size="sm" variant="ghost" onClick={() => download(g)}>
                  <Download className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowHistoryOf(open ? null : g.title)}
                >
                  <History className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(g)}
                  className="text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {open && (
                <div className="border-t border-border bg-muted/30 px-3 py-2 space-y-1.5">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 text-xs">
                      <Badge variant={h.is_current ? "default" : "outline"} className="font-normal">
                        v{h.version}
                      </Badge>
                      <span className="text-muted-foreground">
                        {new Date(h.created_at).toLocaleString("th-TH")}
                      </span>
                      <span className="text-muted-foreground">
                        · {(h.size_bytes / 1024).toFixed(1)} KB
                      </span>
                      <div className="ml-auto flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => download(h)}>
                          <Download className="size-3.5" />
                        </Button>
                        {!h.is_current && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => remove(h)}
                            className="text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
