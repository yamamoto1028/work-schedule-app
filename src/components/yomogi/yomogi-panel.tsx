"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  AIShiftInput,
  AIStaffInput,
  AIShiftTypeInput,
  AILeaveInput,
  AIConstraintInput,
  AIResponsibleRoleInput,
  AIFixedShiftInput,
  GeneratedShift,
  DissatisfactionScore,
  YomogiResult,
  extractShiftsJson,
  extractCommentary,
} from "@/lib/ai/yomogi";
import HolidayJP from "@holiday-jp/holiday_jp";

type Props = {
  facilityId: string;
  facilityType: "hospital" | "care_facility";
  year: number;
  month: number;
  staff: AIStaffInput[];
  shiftTypes: AIShiftTypeInput[];
  constraints: AIConstraintInput[];
  fixedShifts?: AIFixedShiftInput[];
  onApplyShifts: (shifts: GeneratedShift[]) => Promise<void>;
  onScoresUpdate?: (scores: DissatisfactionScore[]) => void;
};

function getHolidays(year: number, month: number): string[] {
  const result: string[] = [];
  const lastDay = new Date(year, month, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month - 1, d);
    if (HolidayJP.isHoliday(date)) {
      result.push(
        `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      );
    }
  }
  return result;
}

type GenerationStatus = "idle" | "generating" | "done" | "error";

export default function YomogiPanel({
  facilityId,
  facilityType,
  year,
  month,
  staff,
  shiftTypes,
  constraints,
  fixedShifts = [],
  onApplyShifts,
  onScoresUpdate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [commentary, setCommentary] = useState("");
  const [result, setResult] = useState<YomogiResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [missingNightDates, setMissingNightDates] = useState<string[]>([]);
  const commentaryRef = useRef<HTMLDivElement>(null);
  const fullTextRef = useRef("");

  useEffect(() => {
    if (commentaryRef.current) {
      commentaryRef.current.scrollTop = commentaryRef.current.scrollHeight;
    }
  }, [commentary]);

  const handleGenerate = async () => {
    setStatus("generating");
    setCommentary("");
    setResult(null);
    setMissingNightDates([]);
    fullTextRef.current = "";

    const targetMonth = `${year}-${String(month).padStart(2, "0")}`;
    const holidays = getHolidays(year, month);

    // 承認済み休暇申請を取得
    const startDate = `${targetMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${targetMonth}-${String(lastDay).padStart(2, "0")}`;

    let approvedLeaves: AILeaveInput[] = [];
    try {
      const res = await fetch(
        `/api/leaves?facilityId=${facilityId}&from=${startDate}&to=${endDate}&status=approved`,
      );
      if (res.ok) approvedLeaves = await res.json();
    } catch {
      // 休暇申請なしで続行
    }

    const input: AIShiftInput & { facilityId: string } = {
      facilityId,
      facilityType,
      targetMonth,
      staff,
      shiftTypes,
      constraints,
      responsibleRoles: [] as AIResponsibleRoleInput[],
      approvedLeaves,
      holidays,
      fixedShifts,
    };

    try {
      const res = await fetch("/api/ai/generate-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok || !res.body) {
        setStatus("error");
        setCommentary("困ったのぉ…サーバーがおかしいのぉ。もう一回試してみ。");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) {
              setStatus("error");
              setCommentary(
                (prev) =>
                  prev +
                  "\n\nすまんの、エラーが発生してしもうた：" +
                  parsed.error,
              );
              return;
            }
            if (parsed.text) {
              fullTextRef.current += parsed.text;
              setCommentary(extractCommentary(fullTextRef.current));
            }
          } catch {
            // JSONパースエラーは無視
          }
        }
      }

      const parsed = extractShiftsJson(fullTextRef.current);
      if (parsed && parsed.shifts.length > 0) {
        // 夜間帯シフトが欠けている日を検出
        const nightShiftTypeIds = new Set(
          shiftTypes.filter((t) => t.time_zone === "night").map((t) => t.id)
        );
        const lastDay = new Date(year, month, 0).getDate();
        const allDates = Array.from({ length: lastDay }, (_, i) =>
          `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
        );
        const datesWithNight = new Set(
          parsed.shifts
            .filter((s) => nightShiftTypeIds.has(s.shift_type_id))
            .map((s) => s.date)
        );
        const missing = allDates.filter((d) => !datesWithNight.has(d));
        setMissingNightDates(missing);

        setResult(parsed);
        setStatus("done");
        onScoresUpdate?.(parsed.dissatisfaction_scores);
      } else {
        setStatus("error");
        setCommentary(
          (prev) =>
            prev +
            "\n\nシフトデータの解析に失敗してしもうた…もう一回やってみんさい。",
        );
      }
    } catch (err) {
      setStatus("error");
      setCommentary("困ったのぉ…通信エラーじゃわ。");
    }
  };

  const handleApply = async () => {
    if (!result) return;
    setApplying(true);
    await onApplyShifts(result.shifts);
    setApplying(false);
  };

  const facilityLabel = facilityType === "hospital" ? "病院" : "介護施設";

  return (
    <div className="border rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-sm">
      {/* ヘッダー */}
      <button
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
            よ
          </div>
          <div className="text-left">
            <div className="font-bold text-emerald-900 text-sm">ヨモギ主任</div>
            <div className="text-[11px] text-emerald-600">
              AI シフト自動生成（{facilityLabel}モード）
            </div>
          </div>
          {status === "done" && result && (
            <Badge
              variant="outline"
              className="ml-2 border-emerald-400 text-emerald-700 bg-emerald-50 text-[11px]"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              生成完了
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

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* 開始ボタン */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={status === "generating"}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {status === "generating" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {status === "generating"
                ? "生成中…"
                : `${year}年${month}月のシフトを生成`}
            </Button>
            <div className="text-xs text-emerald-700">
              対象スタッフ: {staff.length}名 / 勤務区分: {shiftTypes.length}種
            </div>
          </div>

          {/* ぼやきコメント */}
          {(commentary || status === "generating") && (
            <div
              ref={commentaryRef}
              className="bg-white rounded-lg border border-emerald-200 p-3 max-h-48 overflow-y-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
            >
              {commentary || (
                <span className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  ちょっと待ちんさいよ…シフト考えよるけん…
                </span>
              )}
              {status === "generating" && commentary && (
                <span className="inline-block w-1.5 h-4 bg-emerald-500 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          )}

          {/* 生成結果 + 不満スコア */}
          {status === "done" && result && (
            <div className="space-y-3">
              {/* 全体サマリー */}
              <div className="bg-white rounded-lg border border-emerald-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-800">
                    生成シフト: {result.shifts.length}件
                  </span>
                  <span className="text-sm text-gray-600">
                    全体不満スコア:
                    <span
                      className={`ml-1 font-bold ${result.overall_score >= 70 ? "text-red-500" : result.overall_score <= 30 ? "text-emerald-600" : "text-yellow-600"}`}
                    >
                      {result.overall_score}
                    </span>
                  </span>
                </div>
                {result.summary_comment && (
                  <p className="text-xs text-gray-600 italic">
                    「{result.summary_comment}」
                  </p>
                )}
              </div>

              {/* 夜勤未配置日の警告 */}
              {missingNightDates.length > 0 && (
                <div className="bg-red-50 rounded-lg border border-red-200 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                    <span className="text-xs font-semibold text-red-700">
                      夜勤未配置の日があります（{missingNightDates.length}日）
                    </span>
                  </div>
                  <p className="text-[11px] text-red-600">
                    {missingNightDates.map((d) => d.slice(8)).join("日・")}日
                  </p>
                  <p className="text-[11px] text-red-500 mt-1">
                    再生成するか、カレンダーで手動修正してください。
                  </p>
                </div>
              )}

              {/* スタッフ別不満スコア */}
              {result.dissatisfaction_scores.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b text-xs font-medium text-gray-600">
                    スタッフ別不満スコア
                  </div>
                  <div className="divide-y max-h-52 overflow-y-auto">
                    {result.dissatisfaction_scores
                      .sort((a, b) => b.score - a.score)
                      .map((s) => {
                        const member = staff.find((m) => m.id === s.user_id);
                        const scoreColor =
                          s.score >= 70
                            ? "text-red-600 bg-red-50"
                            : s.score <= 30
                              ? "text-emerald-600 bg-emerald-50"
                              : "text-yellow-600 bg-yellow-50";
                        return (
                          <div
                            key={s.user_id}
                            className="flex items-center gap-3 px-3 py-2"
                          >
                            <span className="text-xs text-gray-700 w-24 shrink-0 truncate">
                              {member?.display_name ?? s.user_id}
                            </span>
                            <span
                              className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${scoreColor}`}
                            >
                              {s.score}
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
                disabled={applying}
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
      )}
    </div>
  );
}
