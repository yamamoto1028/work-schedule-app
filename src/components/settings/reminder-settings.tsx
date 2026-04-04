"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, BellRing, CalendarClock } from "lucide-react";

type Props = {
  facilityId: string;
  initialEnabled: boolean;
  initialHourJst: number;
  initialDeadlineDay: number | null;
  initialMinWishes: number;
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const DAY_OPTIONS  = Array.from({ length: 28 }, (_, i) => i + 1);

export default function ReminderSettings({
  facilityId,
  initialEnabled,
  initialHourJst,
  initialDeadlineDay,
  initialMinWishes,
}: Props) {
  const [loading, setLoading] = useState(false);

  // シフト確認督促
  const [enabled, setEnabled]   = useState(initialEnabled);
  const [hourJst, setHourJst]   = useState(initialHourJst);

  // 希望休申請督促
  const [deadlineDay, setDeadlineDay] = useState<number | null>(initialDeadlineDay);
  const [minWishes, setMinWishes]     = useState(initialMinWishes);

  const handleSave = async () => {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("facilities")
      .update({
        reminder_enabled:  enabled,
        reminder_hour_jst: hourJst,
        leave_deadline_day: deadlineDay,
        leave_min_wishes:   minWishes,
      })
      .eq("id", facilityId);

    if (error) {
      toast.error("保存に失敗しました");
    } else {
      toast.success("督促通知の設定を保存しました");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-lg">
      {/* ── シフト確認督促 ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-amber-600" />
            <CardTitle>シフト確認督促</CardTitle>
          </div>
          <CardDescription>
            シフト公開後、未確認のスタッフへ毎日自動でリマインドメールを送信します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">自動送信</Label>
              <p className="text-sm text-muted-foreground">
                ONにすると指定時刻に未確認スタッフへ督促メールを送信します
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className={`space-y-2 transition-opacity ${enabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
            <Label>送信時刻（JST）</Label>
            <Select
              value={String(hourJst)}
              onValueChange={(v) => setHourJst(Number(v))}
            >
              <SelectTrigger className="w-40">
                <span>{String(hourJst).padStart(2, "0")}:00</span>
              </SelectTrigger>
              <SelectContent>
                {HOUR_OPTIONS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {String(h).padStart(2, "0")}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              公開済みシフトがあり、未確認スタッフがいる場合のみ送信されます
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── 希望休申請督促 ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-violet-600" />
            <CardTitle>希望休申請督促</CardTitle>
          </div>
          <CardDescription>
            翌月分の希望休が未達のスタッフへ、締め切り当日の指定時刻にメールを送信します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 締め切り日 */}
          <div className="space-y-2">
            <Label>申請締め切り日（毎月）</Label>
            <div className="flex items-center gap-3">
              <Select
                value={deadlineDay === null ? "none" : String(deadlineDay)}
                onValueChange={(v) => setDeadlineDay(v === "none" ? null : Number(v))}
              >
                <SelectTrigger className="w-40">
                  <span>
                    {deadlineDay === null ? "設定しない" : `毎月 ${deadlineDay} 日`}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">設定しない</SelectItem>
                  <Separator className="my-1" />
                  {DAY_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      毎月 {d} 日
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              「設定しない」の場合、自動送信は無効です（手動送信のみ可）
            </p>
          </div>

          {/* 最低提出数 */}
          <div className={`space-y-2 transition-opacity ${deadlineDay !== null ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
            <Label>最低希望休申請数（日）</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={31}
                value={minWishes}
                onChange={(e) => setMinWishes(Math.max(1, Number(e.target.value)))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">日以上の申請が必要</span>
            </div>
            <p className="text-xs text-muted-foreground">
              送信時刻は「シフト確認督促」と共通です（上記の時刻設定を参照）
            </p>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={loading}
        className="bg-emerald-600 hover:bg-emerald-700"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        保存する
      </Button>
    </div>
  );
}
