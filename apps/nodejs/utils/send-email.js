export async function sendEmail({ to, from, subject, html, text, replyTo }) {
  // Provider key must be configured
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Email provider not configured');
  }

  // Determine From address: prefer explicit 'from', else env FROM_EMAIL
  const fromAddress = from || process.env.FROM_EMAIL;
  if (!fromAddress) {
    throw new Error('FROM_EMAIL not configured');
  }

  const payload = {
    from: fromAddress,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  };

  if (replyTo) {
    payload.reply_to = Array.isArray(replyTo) ? replyTo : [replyTo];
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to send email');
  }
  return { id: data.id };
}

