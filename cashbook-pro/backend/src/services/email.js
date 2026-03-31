import nodemailer from 'nodemailer';

let _transporter;

function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST || 'smtp.gmail.com',
      port:   Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}

export async function sendPasswordResetEmail({ to, name, token }) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await getTransporter().sendMail({
    from:    process.env.SMTP_FROM || 'Managecash <noreply@managecash.com>',
    to,
    subject: 'Reset your Managecash password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
        <img src="${process.env.FRONTEND_URL}/logo.png" alt="Managecash" style="height:40px;margin-bottom:24px;" />
        <h2 style="color:#0f172a;font-size:22px;margin:0 0 8px;">Reset your password</h2>
        <p style="color:#475569;font-size:15px;margin:0 0 24px;">
          Hi ${name}, we received a request to reset your password. Click the button below to set a new one.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#2563eb;color:#fff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">
          Reset Password
        </a>
        <p style="color:#94a3b8;font-size:13px;margin:24px 0 0;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="color:#cbd5e1;font-size:12px;margin:0;">© ${new Date().getFullYear()} Managecash</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail({ to, name, token }) {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  await getTransporter().sendMail({
    from:    process.env.SMTP_FROM || 'Managecash <noreply@managecash.com>',
    to,
    subject: 'Verify your Managecash account',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
        <img src="${process.env.FRONTEND_URL}/logo.png" alt="Managecash" style="height:40px;margin-bottom:24px;" />
        <h2 style="color:#0f172a;font-size:22px;margin:0 0 8px;">Verify your email</h2>
        <p style="color:#475569;font-size:15px;margin:0 0 24px;">
          Hi ${name}, thanks for signing up! Click the button below to verify your email address and activate your account.
        </p>
        <a href="${verifyUrl}"
           style="display:inline-block;background:#2563eb;color:#fff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">
          Verify Email
        </a>
        <p style="color:#94a3b8;font-size:13px;margin:24px 0 0;">
          This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="color:#cbd5e1;font-size:12px;margin:0;">© ${new Date().getFullYear()} Managecash</p>
      </div>
    `,
  });
}
