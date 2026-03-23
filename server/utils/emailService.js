// ==============================
// server/utils/emailService.js
// ==============================
// Setup: add these to your server/.env file
//   EMAIL_USER=your-gmail@gmail.com
//   EMAIL_PASS=your-gmail-app-password   (NOT your normal password — generate an App Password in Google Account > Security > 2FA > App Passwords)

const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send test invite to a list of email addresses
// testLink is the full URL e.g. https://yourapp.com/test/abc123
const sendTestInvites = async (emails, testTitle, testLink, duration, expiryDate) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS must be set in .env to send invites');
  }

  const transporter = createTransporter();

  const expiryText = expiryDate
    ? `<p style="color:#64748b; font-size:14px;">⏰ This test expires on <strong>${new Date(expiryDate).toLocaleString()}</strong></p>`
    : '';

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0; padding:0; background:#f1f5f9; font-family: Arial, sans-serif;">
      <div style="max-width:560px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <div style="background:linear-gradient(135deg,#6366f1,#a855f7); padding:32px; text-align:center;">
          <h1 style="color:#fff; margin:0; font-size:24px;">LTTS Test Portal</h1>
          <p style="color:rgba(255,255,255,0.85); margin:8px 0 0; font-size:15px;">You have been invited to take an assessment</p>
        </div>

        <div style="padding:32px;">
          <h2 style="color:#1e293b; margin:0 0 8px; font-size:20px;">${testTitle}</h2>
          <p style="color:#64748b; font-size:14px; margin:0 0 24px;">⏱ Duration: <strong>${duration} minutes</strong></p>
          ${expiryText}

          <p style="color:#334155; font-size:15px; line-height:1.6; margin:0 0 28px;">
            You have been selected to complete this assessment. Please click the button below to begin. Make sure you have a stable internet connection before starting.
          </p>

          <div style="text-align:center; margin-bottom:28px;">
            <a href="${testLink}"
               style="display:inline-block; background:linear-gradient(135deg,#6366f1,#4f46e5); color:#fff;
                      text-decoration:none; padding:14px 36px; border-radius:12px; font-size:16px;
                      font-weight:bold; letter-spacing:0.02em;">
              Start Assessment →
            </a>
          </div>

          <p style="color:#94a3b8; font-size:13px; text-align:center; margin:0;">
            Or copy this link: <a href="${testLink}" style="color:#6366f1;">${testLink}</a>
          </p>
        </div>

        <div style="background:#f8fafc; padding:20px; text-align:center; border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8; font-size:12px; margin:0;">
            This is an automated message from LTTS Test Portal. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send to all emails — collect results
  const results = await Promise.allSettled(
    emails.map(email =>
      transporter.sendMail({
        from: `"LTTS Test Portal" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `You've been invited to take: ${testTitle}`,
        html: htmlBody
      })
    )
  );

  const sent = [];
  const failed = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      sent.push(emails[index]);
    } else {
      failed.push({ email: emails[index], error: result.reason?.message });
    }
  });

  return { sent, failed };
};

module.exports = { sendTestInvites };
