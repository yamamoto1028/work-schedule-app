/**
 * Enterprise プランのブロック数に応じた月額料金を計算する。
 *
 * REQUIREMENTS.md 9.1 の料金表より:
 *   2ブロック →  ¥5,980
 *   3ブロック →  ¥7,980
 *   5ブロック → ¥12,800
 *  10ブロック → ¥24,800
 *
 * 上記のアンカー点を直線補間し、10ブロック超は10ブロック時の
 * 1ブロックあたり単価（¥2,480）を延長する。
 */
export function calcEnterpriseMonthlyTotal(blocks: number): number {
  const n = Math.max(2, Math.floor(blocks))

  if (n === 2) return 5_980
  if (n === 3) return 7_980

  if (n <= 5) {
    // 3→5 ブロック: 7,980〜12,800 を線形補間
    return Math.round(7_980 + ((n - 3) * (12_800 - 7_980)) / (5 - 3))
  }

  if (n <= 10) {
    // 5→10 ブロック: 12,800〜24,800 を線形補間
    return Math.round(12_800 + ((n - 5) * (24_800 - 12_800)) / (10 - 5))
  }

  // 10 ブロック超: 10ブロック時の単価 ¥2,480/ブロック で延長
  return Math.round(24_800 + (n - 10) * 2_480)
}

/** 参考表示用: Pro 定価（割引なし）との比較額 */
export function calcEnterpriseListPrice(blocks: number): number {
  return Math.max(2, Math.floor(blocks)) * 3_980
}

/** 割引率（小数点なし、例: 25 → 25%OFF） */
export function calcEnterpriseDiscountPct(blocks: number): number {
  const actual = calcEnterpriseMonthlyTotal(blocks)
  const list   = calcEnterpriseListPrice(blocks)
  return Math.round((1 - actual / list) * 100)
}
