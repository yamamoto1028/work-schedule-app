// ヨモギ主任のセリフ（安芸弁）。生成結果の統計からテンプレートを選ぶ。

import type { ScoreReason } from './types'

type FacilityType = 'hospital' | 'care_facility'

function choose(lines: string[], key: number): string {
  return lines[Math.abs(key) % lines.length]
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

export function openingComment(
  facilityType: FacilityType,
  stats: { staffCount: number; leaveCount: number; month: number },
  seed: number,
): string {
  const { staffCount, leaveCount, month } = stats
  const leaveLine = leaveCount >= staffCount
    ? `休み希望が${leaveCount}件もあるんか、たいぎいのぉ。`
    : leaveCount > 0
      ? `休み希望は${leaveCount}件じゃね。ちゃんと入れとくけん。`
      : '休み希望はなしか、珍しいのぉ。'
  const tone = facilityType === 'hospital'
    ? choose(['患者さんの命預かっとるんじゃけん、手は抜かんよ。', '夜勤の穴は一日たりとも空けんけんね。'], seed)
    : choose(['利用者さんが安心して過ごせるよう組んじゃるけんね。', 'みんなの顔思い浮かべながら組むけん、待っときんさい。'], seed)
  return `${month}月のシフトじゃね。スタッフ${staffCount}人分、${leaveLine}${tone}`
}

export function summaryComment(
  facilityType: FacilityType,
  stats: { unfilledCount: number; errorCount: number; overallScore: number },
  seed: number,
): string {
  if (stats.unfilledCount > 0) {
    return `人が足りん枠が${stats.unfilledCount}つ残ってしもうた。ここは手で調整してみんさい。`
  }
  if (stats.errorCount > 0) {
    return `できたけど、ルールに引っかかっとるところが${stats.errorCount}件あるけん確認しんさいよ。`
  }
  if (stats.overallScore <= 30) {
    return facilityType === 'hospital'
      ? choose(['はい、できたけん。ぶち締まったシフトじゃろ。', 'ほい、完成じゃ。これなら文句は出んじゃろ。'], seed)
      : choose(['はい、できたけぇね。みんな気持ちよう働けるじゃろ。', 'ほい、できあがり。ええ感じに収まったわ。'], seed)
  }
  return choose(['はい、できたけん。ちぃと無理させとる人もおるけん、声かけたってね。', 'なんとか組めたわ。きつい人には労いの一言かけんさいよ。'], seed)
}

const STAFF_LINES: Record<ScoreReason, string[]> = {
  consecutive: ['連勤が続くのぉ、たいぎかろう', '連勤きついけん労ったって'],
  night: ['夜勤多めじゃ、ようやりよる', '夜勤続きでぶちきついのぉ'],
  weekend: ['土日出勤が多いのぉ', '週末ばっかりですまんのぉ'],
  scattered: ['飛び石休みで休んだ気せんじゃろ', '休みが細切れじゃのぉ'],
  weekly_off: ['週の休みが少ないけん気をつけんさい', '今週は休みが足りんのぉ'],
  shortfall: ['もうちぃと入れたかったんじゃが', '勤務日数が足りとらんよ'],
  none: ['ええ感じじゃけん', 'よう頑張りよるんよぉ', 'バランスばっちりじゃ'],
}

export function staffComment(reason: ScoreReason, userId: string, seed: number): string {
  return choose(STAFF_LINES[reason], hashString(userId) + seed)
}
