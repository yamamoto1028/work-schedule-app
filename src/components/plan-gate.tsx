"use client";

import { Sparkles, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Plan = 'free' | 'pro' | 'enterprise'

type Props = {
  currentPlan: Plan;
  requiredPlan: 'pro' | 'enterprise';
  feature?: string;
};

const PLAN_LABEL: Record<Plan, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const PRO_FEATURES = [
  'AI シフト自動生成（ヨモギ主任）',
  '不満スコア可視化',
  'メール通知・確認督促',
  'アプリ内 Realtime 通知',
];

const ENTERPRISE_FEATURES = [
  '複数フロア / ブロック単位でシフト管理',
  'ブロックごとに AI シフト自動生成',
  'フロア横断の人員配置確認',
  'フロアレベルの責任者制約（近日対応）',
];

export default function PlanGate({ currentPlan, requiredPlan, feature }: Props) {
  const isPro       = requiredPlan === 'pro';
  const Icon        = isPro ? Sparkles : Building2;
  const color       = isPro ? 'emerald' : 'violet';
  const featureList = isPro ? PRO_FEATURES : ENTERPRISE_FEATURES;
  const planName    = PLAN_LABEL[requiredPlan];

  return (
    <div className={`border-2 border-dashed rounded-xl p-8 text-center space-y-4 bg-linear-to-br
      ${isPro
        ? 'border-emerald-200 from-emerald-50 to-teal-50'
        : 'border-violet-200 from-violet-50 to-purple-50'}`}>
      <div className="flex justify-center">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center
          ${isPro ? 'bg-emerald-100' : 'bg-violet-100'}`}>
          <Icon className={`h-7 w-7 ${isPro ? 'text-emerald-600' : 'text-violet-600'}`} />
        </div>
      </div>
      <div className="space-y-1">
        <p className={`font-bold text-lg ${isPro ? 'text-emerald-900' : 'text-violet-900'}`}>
          {planName} プラン限定機能
        </p>
        <p className={`text-sm ${isPro ? 'text-emerald-700' : 'text-violet-700'}`}>
          {feature ?? 'この機能'}は {planName} プランでご利用いただけます。
          <br />
          <span className="text-xs opacity-70">現在のプラン: {PLAN_LABEL[currentPlan]}</span>
        </p>
      </div>
      <ul className="text-sm text-left max-w-xs mx-auto space-y-1.5">
        {featureList.map(f => (
          <li key={f} className={`flex items-center gap-2 ${isPro ? 'text-emerald-800' : 'text-violet-800'}`}>
            <Icon className={`h-3.5 w-3.5 shrink-0 ${isPro ? 'text-emerald-500' : 'text-violet-500'}`} />
            {f}
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        className={isPro
          ? 'border-emerald-400 text-emerald-700 hover:bg-emerald-100'
          : 'border-violet-400 text-violet-700 hover:bg-violet-100'}
        onClick={() => alert(`${planName} プランへのアップグレードについては管理者にお問い合わせください。`)}
      >
        {planName} にアップグレード
      </Button>
    </div>
  );
}
