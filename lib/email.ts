type EmailPayload = {
  to: string
  subject: string
  html: string
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER

  // Default beta-safe mode: log only, no external provider required.
  if (!provider || provider === 'none') {
    console.log('[email:log-only]', {
      to: payload.to,
      subject: payload.subject,
      preview: payload.html.slice(0, 180),
    })
    return
  }

  if (provider === 'resend') {
    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.EMAIL_FROM
    if (!apiKey || !from) {
      console.warn('Resend configured but missing RESEND_API_KEY or EMAIL_FROM')
      return
    }
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    })
    return
  }

  console.warn(`Unknown EMAIL_PROVIDER: ${provider}`)
}
