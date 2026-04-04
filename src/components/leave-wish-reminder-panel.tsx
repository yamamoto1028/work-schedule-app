"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BellRing, Loader2, CalendarClock, Users } from "lucide-react";

type Props = {
  facilityId: string;
  targetYear: number;
  targetMonth: number;
  deadlineDay: number | null;
  minWishes: number;
  unsubmittedStaff: { id: string; display_name: string; submittedCount: number }[];
};

export default function LeaveWishReminderPanel({
  facilityId,
  targetYear,
  targetMonth,
  deadlineDay,
  minWishes,
  unsubmittedStaff,
}: Props) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (unsubmittedStaff.length === 0) return;
    setSending(true);
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "leave_submission_reminder",
          facilityId,
          year: targetYear,
          month: targetMonth,
          targetYear,
          targetMonth,
        }),
      });
      const json = await res.json() as { sent?: number };
      if (res.ok) {
        toast.success(`${json.sent ?? 0}名に督促メールを送信しました`);
      } else {
        toast.error("送信に失敗しました");
      }
    } catch {
      toast.error("送信に失敗しました");
    }
    setSending(false);
  };

  return (
    <div className="border rounded-xl bg-linear-to-r from-violet-50 to-purple-50 border-violet-200 p-4 space-y-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-violet-600 shrink-0" />
          <div>
            <span className="font-semibold text-violet-900 text-sm">
              希望休申請督促 — {targetYear}年{targetMonth}月分
            </span>
            {deadlineDay !== null ? (
              <span className="ml-2 text-xs text-violet-600">
                締め切り: 今月{deadlineDay}日
              </span>
            ) : (
              <span className="ml-2 text-xs text-violet-400">（締め切り日未設定）</span>
            )}
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-violet-300 text-violet-700 bg-violet-50 text-xs"
        >
          <Users className="h-3 w-3 mr-1" />
          未達: {unsubmittedStaff.length}名
        </Badge>
      </div>

      {/* 未達スタッフ一覧 */}
      {unsubmittedStaff.length > 0 ? (
        <div className="bg-white rounded-lg border border-violet-100 divide-y max-h-44 overflow-y-auto">
          {unsubmittedStaff.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between px-3 py-1.5 text-sm"
            >
              <span className="text-gray-700">{s.display_name}</span>
              <span className="text-xs text-violet-600">
                {s.submittedCount} / {minWishes}日
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
          全スタッフが{minWishes}日以上の希望休を提出済みです
        </p>
      )}

      {/* 送信ボタン */}
      <Button
        onClick={handleSend}
        disabled={sending || unsubmittedStaff.length === 0}
        size="sm"
        className="bg-violet-600 hover:bg-violet-700 gap-1.5"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <BellRing className="h-4 w-4" />
        )}
        {sending ? "送信中…" : `督促メールを送る（${unsubmittedStaff.length}名）`}
      </Button>
    </div>
  );
}
