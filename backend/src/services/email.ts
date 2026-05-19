import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendAccessKeyEmail(to: string, name: string, accessKey: string): Promise<void> {
  await transporter.sendMail({
    from: `"Sales Test Portal" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your Sales Assessment Portal Access Key',
    html: `
      <p>Dear ${name},</p>
      <p>Your access key for the Sales Assessment Portal is:</p>
      <h2 style="font-family:monospace;letter-spacing:4px;background:#f5f5f5;padding:12px;border-radius:4px;">${accessKey}</h2>
      <p>Use this key to log in at: ${process.env.FRONTEND_URL}/login</p>
      <p>Keep this key confidential. Contact HR if you need a replacement.</p>
    `,
  })
}

export async function sendResultEmail(
  to: string,
  name: string,
  testTitle: string,
  score: number,
  passFail: string
): Promise<void> {
  await transporter.sendMail({
    from: `"Sales Test Portal" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Assessment Result: ${testTitle}`,
    html: `
      <p>Dear ${name},</p>
      <p>Your result for <strong>${testTitle}</strong> has been finalised.</p>
      <p>Score: <strong>${score}%</strong> — <strong>${passFail === 'pass' ? 'PASS' : 'FAIL'}</strong></p>
      <p>For further details, contact your HR team.</p>
    `,
  })
}
