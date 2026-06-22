import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AccountPageShell } from "@/components/layout/account-page-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert } from "lucide-react";
import { addClaimComment, getClaim } from "@/lib/claims.functions";
import { AccountPageSkeleton, PageSkeleton, FormPageSkeleton } from "@/components/loading";
import {
  CLAIM_STATUS_COLORS,
  CLAIM_STATUS_LABELS,
  ISSUE_TYPE_LABELS,
} from "@/lib/claims.constants";

export const Route = createFileRoute("/account/claims/$id")({
  head: () => ({ meta: [{ title: "รายละเอียดเคลม · WP ALL" }] }),
  component: ClaimDetailPage,
});

function ClaimDetailPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const getFn = useServerFn(getClaim);
  const commentFn = useServerFn(addClaimComment);
  const [data, setData] = useState<Awaited<ReturnType<typeof getFn>> | null>(null);
  const [comment, setComment] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await getFn({ data: { claimId: id } });
    setData(res);
    const urls: string[] = [];
    for (const p of res.claim.image_paths) {
      const { data: signed } = await supabase.storage.from("claim-media").createSignedUrl(p, 3600);
      if (signed?.signedUrl) urls.push(signed.signedUrl);
    }
    setImageUrls(urls);
  };

  useEffect(() => {
    if (user) void load();
  }, [user, id]);

  if (loading) return <AccountPageSkeleton variant="cards" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!data) return <PageSkeleton cards={2} className="p-10" />;

  const { claim, comments } = data;

  const sendComment = async () => {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await commentFn({ data: { claimId: id, body: comment.trim() } });
      setComment("");
      await load();
      toast.success("ส่งข้อความแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountPageShell
      title={claim.claim_number}
      description={claim.product_name}
      backTo="/account/claims"
      backLabel="รายการเคลม"
      icon={<ShieldAlert className="size-6 text-orange-500" />}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${CLAIM_STATUS_COLORS[claim.status] ?? ""}`}
        >
          {CLAIM_STATUS_LABELS[claim.status]}
        </span>
      </div>

      <div className="rounded-2xl border p-4 text-sm space-y-2">
        <p>
          <span className="text-muted-foreground">ประเภท:</span>{" "}
          {ISSUE_TYPE_LABELS[claim.issue_type]}
        </p>
        <p className="whitespace-pre-wrap">{claim.description}</p>
        {claim.admin_note ? (
          <p className="text-amber-800 bg-amber-50 rounded-lg p-3 text-xs">
            <strong>หมายเหตุจากร้าน:</strong> {claim.admin_note}
          </p>
        ) : null}
        {claim.resolution ? (
          <p className="text-emerald-800 bg-emerald-50 rounded-lg p-3 text-xs">
            <strong>ผลการดำเนินการ:</strong> {claim.resolution}
          </p>
        ) : null}
      </div>

      {imageUrls.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {imageUrls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <img
                src={url}
                alt=""
                className="rounded-xl border object-cover aspect-square w-full"
              />
            </a>
          ))}
        </div>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">ข้อความ</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">ยังไม่มีข้อความ</p>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className={`rounded-xl px-3 py-2 text-xs ${c.is_admin ? "bg-primary/10 ml-4" : "bg-muted mr-4"}`}
              >
                <p>{c.body}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(c.created_at).toLocaleString("th-TH")}
                </p>
              </div>
            ))
          )}
        </div>
        {claim.status !== "completed" && claim.status !== "rejected" ? (
          <div className="flex gap-2">
            <Textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="ถามเพิ่มเติม..."
            />
            <Button type="button" size="sm" disabled={busy} onClick={() => void sendComment()}>
              ส่ง
            </Button>
          </div>
        ) : null}
      </section>
    </AccountPageShell>
  );
}
