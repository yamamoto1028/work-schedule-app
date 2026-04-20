import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// onboarding@resend.dev はテスト用。Resend アカウント登録メールアドレス宛にしか送れない
const isSandbox = FROM === 'onboarding@resend.dev'

function html(body: string) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;color:#1f2937;">
${body}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
<p style="font-size:12px;color:#9ca3af;">YOMOGI シフト管理システム</p>
</body></html>`
}

async function send(to: string, subject: string, htmlBody: string) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY が未設定のためスキップ')
    return
  }
  if (isSandbox) {
    console.warn(`[email] sandbox モード: onboarding@resend.dev からは Resend アカウント登録メール宛にのみ送信可能。送信先: ${to}`)
  }
  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html: htmlBody })
  if (error) {
    console.error('[email] 送信エラー:', JSON.stringify(error), '| to:', to, '| subject:', subject)
  } else {
    console.log('[email] 送信成功 id:', data?.id, '| to:', to)
  }
}

/** シフト公開通知（全スタッフへ一括送信） */
export async function sendShiftPublishedEmails(
  staffEmails: { email: string; displayName: string }[],
  year: number,
  month: number,
  facilityName: string,
) {
  if (staffEmails.length === 0) return
  await Promise.allSettled(
    staffEmails.map(({ email, displayName }) =>
      send(
        email,
        `【YOMOGI】${year}年${month}月のシフトが公開されました`,
        html(`
<h2 style="color:#059669;">シフトが公開されました</h2>
<p>${displayName} さん、</p>
<p><strong>${facilityName}</strong> の ${year}年${month}月のシフトが公開されました。</p>
<p>以下のリンクからご確認ください。</p>
<a href="${APP_URL}/staff/my-shifts" style="display:inline-block;background:#059669;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px;">シフトを確認する</a>
`),
      )
    )
  )
}

/** 休暇申請承認通知 */
export async function sendLeaveApprovedEmail(
  email: string,
  displayName: string,
  date: string,
  leaveTypeName: string,
) {
  await send(
    email,
    '【YOMOGI】休暇申請が承認されました',
    html(`
<h2 style="color:#059669;">休暇申請が承認されました</h2>
<p>${displayName} さん、</p>
<p>以下の休暇申請が<strong>承認</strong>されました。</p>
<table style="border-collapse:collapse;margin-top:12px;">
  <tr><td style="padding:4px 16px 4px 0;color:#6b7280;">日付</td><td style="padding:4px 0;font-weight:600;">${date}</td></tr>
  <tr><td style="padding:4px 16px 4px 0;color:#6b7280;">区分</td><td style="padding:4px 0;font-weight:600;">${leaveTypeName}</td></tr>
</table>
`),
  )
}

/** 確認督促通知（未確認スタッフへ一括送信） */
export async function sendShiftReminderEmails(
  staffEmails: { email: string; displayName: string }[],
  year: number,
  month: number,
  facilityName: string,
) {
  if (staffEmails.length === 0) return
  await Promise.allSettled(
    staffEmails.map(({ email, displayName }) =>
      send(
        email,
        `【YOMOGI】${year}年${month}月のシフト確認をお願いします`,
        html(`
<h2 style="color:#d97706;">シフトの確認をお願いします</h2>
<p>${displayName} さん、</p>
<p><strong>${facilityName}</strong> の ${year}年${month}月のシフトがまだ確認されていません。</p>
<p>以下のリンクからシフトをご確認の上、「確認しました」ボタンを押してください。</p>
<a href="${APP_URL}/staff/my-shifts" style="display:inline-block;background:#d97706;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px;">シフトを確認する</a>
`),
      )
    )
  )
}

/** 希望休申請督促通知 */
export async function sendLeaveWishReminderEmails(
  staffEmails: { email: string; displayName: string; submittedCount: number }[],
  targetYear: number,
  targetMonth: number,
  minWishes: number,
  deadlineDay: number,
  facilityName: string,
) {
  if (staffEmails.length === 0) return
  await Promise.allSettled(
    staffEmails.map(({ email, displayName, submittedCount }) =>
      send(
        email,
        `【YOMOGI】${targetYear}年${targetMonth}月分の希望休申請をお願いします`,
        html(`
<h2 style="color:#7c3aed;">希望休の申請をお願いします</h2>
<p>${displayName} さん、</p>
<p><strong>${facilityName}</strong> では ${targetYear}年${targetMonth}月分の希望休申請を今月<strong>${deadlineDay}日</strong>までに提出いただく必要があります。</p>
<table style="border-collapse:collapse;margin-top:12px;">
  <tr><td style="padding:4px 16px 4px 0;color:#6b7280;">提出済み</td><td style="padding:4px 0;font-weight:600;">${submittedCount}日</td></tr>
  <tr><td style="padding:4px 16px 4px 0;color:#6b7280;">必要数</td><td style="padding:4px 0;font-weight:600;">${minWishes}日以上</td></tr>
  <tr><td style="padding:4px 16px 4px 0;color:#6b7280;">残り</td><td style="padding:4px 0;font-weight:600;color:#dc2626;">${minWishes - submittedCount}日</td></tr>
</table>
<p style="margin-top:12px;">以下のリンクから希望休を申請してください。</p>
<a href="${APP_URL}/staff/requests" style="display:inline-block;background:#7c3aed;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px;">希望休を申請する</a>
`),
      )
    )
  )
}

/** Enterprise プランお問い合わせ通知（YOMOGI 運営宛） */
export async function sendEnterpriseInquiryToAdmin(params: {
  facilityName: string
  contactName: string
  contactEmail: string
  floorCount: number
  blockCount: number
  message: string
}) {
  const salesEmail = process.env.YOMOGI_SALES_EMAIL ?? FROM
  await send(
    salesEmail,
    `【YOMOGI】Enterprise プランお問い合わせ: ${params.facilityName}`,
    html(`
<h2 style="color:#7c3aed;">Enterprise プランお問い合わせ</h2>
<table style="border-collapse:collapse;width:100%;margin-top:12px;">
  <tr><td style="padding:6px 16px 6px 0;color:#6b7280;white-space:nowrap;">施設名</td><td style="padding:6px 0;font-weight:600;">${params.facilityName}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#6b7280;white-space:nowrap;">担当者名</td><td style="padding:6px 0;">${params.contactName}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#6b7280;white-space:nowrap;">メールアドレス</td><td style="padding:6px 0;"><a href="mailto:${params.contactEmail}">${params.contactEmail}</a></td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#6b7280;white-space:nowrap;">フロア数（予定）</td><td style="padding:6px 0;">${params.floorCount} フロア</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#6b7280;white-space:nowrap;">ブロック数（予定）</td><td style="padding:6px 0;">${params.blockCount} ブロック</td></tr>
</table>
${params.message ? `<h3 style="margin-top:20px;color:#374151;">ご要望・質問</h3><p style="background:#f9fafb;padding:12px;border-radius:6px;white-space:pre-wrap;">${params.message}</p>` : ''}
`),
  )
}

/** Enterprise プランお問い合わせ受付確認（施設管理者宛） */
export async function sendEnterpriseInquiryAck(params: {
  contactName: string
  contactEmail: string
  facilityName: string
}) {
  await send(
    params.contactEmail,
    '【YOMOGI】Enterprise プランのお問い合わせを受け付けました',
    html(`
<h2 style="color:#7c3aed;">お問い合わせありがとうございます</h2>
<p>${params.contactName} 様、</p>
<p><strong>${params.facilityName}</strong> からの Enterprise プランへのお問い合わせを受け付けました。</p>
<p>担当者より <strong>2〜3営業日以内</strong> にご連絡いたします。今しばらくお待ちください。</p>
<p style="margin-top:16px;font-size:13px;color:#6b7280;">※ このメールに返信いただいても対応できかねます。お急ぎの場合は直接ご連絡ください。</p>
`),
  )
}

/** 休暇申請却下通知 */
export async function sendLeaveRejectedEmail(
  email: string,
  displayName: string,
  date: string,
  leaveTypeName: string,
) {
  await send(
    email,
    '【YOMOGI】休暇申請が却下されました',
    html(`
<h2 style="color:#dc2626;">休暇申請が却下されました</h2>
<p>${displayName} さん、</p>
<p>以下の休暇申請が<strong>却下</strong>されました。詳細は管理者にお問い合わせください。</p>
<table style="border-collapse:collapse;margin-top:12px;">
  <tr><td style="padding:4px 16px 4px 0;color:#6b7280;">日付</td><td style="padding:4px 0;font-weight:600;">${date}</td></tr>
  <tr><td style="padding:4px 16px 4px 0;color:#6b7280;">区分</td><td style="padding:4px 0;font-weight:600;">${leaveTypeName}</td></tr>
</table>
`),
  )
}
