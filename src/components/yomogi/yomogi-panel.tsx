"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import type {
  SchedulerAssignment,
  SchedulerResult,
  StaffScore,
} from "@/lib/scheduler";

type Props = {
  facilityId: string;
  facilityType: "hospital" | "care_facility";
  year: number;
  month: number;
  blockId: string | null;
  staff: { id: string; display_name: string }[];
  daysOff: number;
  onDaysOffChange: (days: number) => Promise<void>;
  onApplyShifts: (shifts: SchedulerAssignment[]) => Promise<void>;
  onScoresUpdate?: (scores: StaffScore[]) => void;
};

type GenerationStatus = "idle" | "generating" | "done" | "error";

const MAX_LISTED_VIOLATIONS = 8;

export default function YomogiPanel({
  facilityId,
  facilityType,
  year,
  month,
  blockId,
  staff,
  daysOff,
  onDaysOffChange,
  onApplyShifts,
  onScoresUpdate,
}: Props) {
  const periodKey = `${year}-${month}-${blockId ?? "all"}`;
  const [open, setOpen] = useState(false);
  const [generation, setGeneration] = useState<{
    periodKey: string;
    status: GenerationStatus;
    commentary: string;
    result: SchedulerResult | null;
  }>({ periodKey, status: "idle", commentary: "", result: null });
  const [applying, setApplying] = useState(false);
  // 入力途中の公休数（null = 設定値をそのまま表示）
  const [daysOffDraft, setDaysOffDraft] = useState<string | null>(null);
  // アニメーション用ワンショットフラグ
  const [avatarAnimClass, setAvatarAnimClass] = useState("");
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 月やブロックを切り替えたら、前の作成結果は表示しない
  const current = generation.periodKey === periodKey;
  const status: GenerationStatus = current ? generation.status : "idle";
  const commentary = current ? generation.commentary : "";
  const result = current ? generation.result : null;
  const update = (status: GenerationStatus, commentary: string, result: SchedulerResult | null = null) =>
    setGeneration({ periodKey, status, commentary, result });

  const nameOf = (userId: string) =>
    staff.find((m) => m.id === userId)?.display_name ?? "（不明）";

  // ワンショットアニメーションをトリガーするヘルパー
  const triggerAvatarAnim = (cls: string, durationMs: number) => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    setAvatarAnimClass(cls);
    animTimerRef.current = setTimeout(() => setAvatarAnimClass(""), durationMs);
  };

  const saveDaysOff = async () => {
    if (daysOffDraft === null) return;
    const days = Number(daysOffDraft);
    if (daysOffDraft !== "" && Number.isInteger(days) && days >= 0 && days <= 31 && days !== daysOff) {
      await onDaysOffChange(days);
    }
    setDaysOffDraft(null);
  };

  const handleGenerate = async () => {
    update("generating", "");
    await saveDaysOff();

    try {
      const res = await fetch("/api/shifts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId,
          month: `${year}-${String(month).padStart(2, "0")}`,
          blockId,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        update(
          "error",
          `困ったのぉ…うまく組めんかったわ。${body?.error ? `（${body.error}）` : "もう一回試してみんさい。"}`,
        );
        triggerAvatarAnim("animate-yomogi-shake", 500);
        return;
      }
      const data = (await res.json()) as SchedulerResult;
      update("done", `${data.openingComment}\n${data.summaryComment}`, data);
      triggerAvatarAnim(
        data.unfilled.length > 0 ? "animate-yomogi-shake" : "animate-yomogi-pop",
        600,
      );
      onScoresUpdate?.(data.scores);
    } catch {
      update("error", "困ったのぉ…通信エラーじゃわ。");
      triggerAvatarAnim("animate-yomogi-shake", 500);
    }
  };

  const handleApply = async () => {
    if (!result) return;
    setApplying(true);
    await onApplyShifts(result.assignments);
    setApplying(false);
    update("idle", "カレンダーに入れといたけん。あとは手で微調整してみんさい。");
  };

  const facilityLabel = facilityType === "hospital" ? "病院" : "介護施設";
  const errors = result?.violations.filter((v) => v.severity === "error") ?? [];
  const warnings = result?.violations.filter((v) => v.severity === "warning") ?? [];

  // アバター背景色
  const avatarBg =
    status === "error"
      ? "bg-red-500"
      : status === "done"
        ? "bg-emerald-500"
        : "bg-emerald-600";

  // アバター継続アニメーション（generating 中はフロート）
  const avatarContinuousClass =
    status === "generating" ? "animate-yomogi-float" : "";

  return (
    <div className="border rounded-xl bg-linear-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-sm">
      {/* ヘッダー */}
      <button
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          {/* アバター */}
          <div className="relative shrink-0 w-8 h-8">
            {/* generating 中はピンリング */}
            {status === "generating" && (
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
            )}
            <div
              className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center text-white text-sm font-bold transition-colors duration-300 ${avatarContinuousClass} ${avatarAnimClass}`}
            >
              よ
            </div>
          </div>

          <div className="text-left">
            <div className="font-bold text-emerald-900 text-sm">ヨモギ主任</div>
            <div className="text-[11px] text-emerald-600">
              シフト自動作成（{facilityLabel}モード）
            </div>
          </div>

          {status === "done" && result && (
            <Badge
              variant="outline"
              className="ml-2 border-emerald-400 text-emerald-700 bg-emerald-50 text-[11px]"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              作成完了
            </Badge>
          )}
          {status === "error" && (
            <Badge variant="destructive" className="ml-2 text-[11px]">
              <AlertTriangle className="h-3 w-3 mr-1" />
              エラー
            </Badge>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-emerald-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-emerald-600" />
        )}
      </button>

      {/* パネル本体（grid trick でスムーズに展開） */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 space-y-3">
            {/* 公休数 + 作成ボタン */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-emerald-900">
                {month}月の公休数
                <Input
                  type="number"
                  min={0}
                  max={31}
                  value={daysOffDraft ?? String(daysOff)}
                  onChange={(e) => setDaysOffDraft(e.target.value)}
                  onBlur={saveDaysOff}
                  disabled={status === "generating"}
                  className="w-16 h-8 bg-white"
                />
                日
              </label>
              <Button
                onClick={handleGenerate}
                disabled={status === "generating" || applying}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              >
                {status === "generating" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : status === "done" ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {status === "generating"
                  ? "作成中…"
                  : status === "done"
                    ? "別の案を作る"
                    : `${year}年${month}月のシフトを作成`}
              </Button>
              <div className="text-xs text-emerald-700">
                対象スタッフ: {staff.length}名（希望休は公休に含み、有給などは別枠）
              </div>
            </div>

            {/* ぼやきコメント（スピーチバブル） */}
            {(commentary || status === "generating") && (
              <div className="relative">
                {/* バブルのしっぽ */}
                <div
                  className="absolute -top-2 left-6"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: "8px solid transparent",
                    borderRight: "8px solid transparent",
                    borderBottom: "8px solid #a7f3d0", // emerald-200
                  }}
                />
                <div
                  className="absolute z-10"
                  style={{
                    top: "-5px",
                    left: "33px",
                    width: 0,
                    height: 0,
                    borderLeft: "7px solid transparent",
                    borderRight: "7px solid transparent",
                    borderBottom: "7px solid white",
                  }}
                />
                <div className="bg-white rounded-lg border border-emerald-200 p-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {commentary || (
                    /* 作成中: 三点ドットアニメーション */
                    <span className="flex items-center gap-1 py-1">
                      <span className="text-gray-400 text-xs mr-1">
                        ちょっと待ちんさいよ…
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-thinking-dot-1 inline-block" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-thinking-dot-2 inline-block" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-thinking-dot-3 inline-block" />
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 作成結果 + 不満スコア */}
            {status === "done" && result && (
              <div className="space-y-3">
                {/* 全体サマリー */}
                <div className="bg-white rounded-lg border border-emerald-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-800">
                      追加するシフト: {result.assignments.length}件
                    </span>
                    <span className="text-sm text-gray-600">
                      全体不満スコア:
                      <span
                        className={`ml-1 font-bold ${result.overallScore >= 70 ? "text-red-500" : result.overallScore <= 30 ? "text-emerald-600" : "text-yellow-600"}`}
                      >
                        {result.overallScore}
                      </span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    制約エラー {errors.length}件 / 警告 {warnings.length}件
                  </p>
                </div>

                {/* 人数が足りない枠 */}
                {result.unfilled.length > 0 && (
                  <div className="bg-red-50 rounded-lg border border-red-200 p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      <span className="text-xs font-semibold text-red-700">
                        人数が足りない枠があります（{result.unfilled.length}件）
                      </span>
                    </div>
                    <ul className="space-y-0.5 max-h-40 overflow-y-auto">
                      {result.unfilled.map((u) => (
                        <li key={`${u.date}_${u.shiftTypeId}`} className="text-[11px] text-red-600">
                          {Number(u.date.slice(8))}日 {u.shiftTypeName}（{u.assigned}/{u.required}名）：{u.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 制約違反 */}
                {result.violations.length > 0 && (
                  <div className="bg-amber-50 rounded-lg border border-amber-200 p-3">
                    <div className="text-xs font-semibold text-amber-800 mb-1.5">
                      確認が必要な箇所
                    </div>
                    <ul className="space-y-0.5">
                      {[...errors, ...warnings].slice(0, MAX_LISTED_VIOLATIONS).map((v, i) => (
                        <li
                          key={`${v.userId}_${v.date}_${i}`}
                          className={`text-[11px] ${v.severity === "error" ? "text-red-600" : "text-amber-700"}`}
                        >
                          {Number(v.date.slice(8))}日 {nameOf(v.userId)}：{v.message}
                        </li>
                      ))}
                    </ul>
                    {result.violations.length > MAX_LISTED_VIOLATIONS && (
                      <p className="text-[11px] text-amber-700 mt-1">
                        ほか{result.violations.length - MAX_LISTED_VIOLATIONS}件（適用後にカレンダーで確認できます）
                      </p>
                    )}
                  </div>
                )}

                {/* スタッフ別不満スコア */}
                {result.scores.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b text-xs font-medium text-gray-600">
                      スタッフ別不満スコア
                    </div>
                    <div className="divide-y max-h-52 overflow-y-auto">
                      {[...result.scores]
                        .sort((a, b) => b.score - a.score)
                        .map((s) => {
                          const scoreColor =
                            s.score >= 70
                              ? "text-red-600 bg-red-50"
                              : s.score <= 30
                                ? "text-emerald-600 bg-emerald-50"
                                : "text-yellow-600 bg-yellow-50";
                          return (
                            <div
                              key={s.userId}
                              className="flex items-center gap-3 px-3 py-2"
                            >
                              <span className="text-xs text-gray-700 w-24 shrink-0 truncate">
                                {nameOf(s.userId)}
                              </span>
                              <span
                                className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${scoreColor}`}
                              >
                                {s.score}
                              </span>
                              <span className="text-[11px] text-gray-500 shrink-0">
                                勤務{s.workDays}/{s.targetWorkDays}日・夜勤{s.nightCount}回
                              </span>
                              <span className="text-[11px] text-gray-500 italic truncate">
                                「{s.comment}」
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* 適用ボタン */}
                <Button
                  onClick={handleApply}
                  disabled={applying || result.assignments.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  {applying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {applying ? "適用中…" : "シフトをカレンダーに適用"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
