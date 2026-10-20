const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.GOOGLE_APP_EMAIL,
//     pass: process.env.GOOGLE_APP_PASSWORD,
//   },
// });

// const transporter = nodemailer.createTransport({
//   host: "smtppro.zoho.com",
//   port: 465,
//   secure: false, // TLS for port 465
//   auth: {
//     user: process.env.ZOHO_APP_MAIL,
//     pass: process.env.ZOHO_APP_MAIL_PASSWORD,
//   },
// });
const transporter = nodemailer.createTransport({
  host: "smtppro.zoho.in",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_APP_MAIL,
    pass: process.env.ZOHO_APP_MAIL_PASSWORD,
  },
});
/**
 * Send a password reset link to the given email address.
 * @param {string} toEmail  - Recipient email
 * @param {string} resetUrl - The full reset URL including the token
 */
const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  try {
  await transporter.sendMail({
    from: `"Hey Leban" <${process.env.ZOHO_APP_MAIL}>`,
    to: toEmail,
    subject: "Reset your Hey Leban POS  password",
    text: `You requested a password reset.\n\nClick the link below to reset your password (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #3d0c02;">Reset your password</h2>
        <p>You requested a password reset for your Hey Leban account.</p>
        <p>Click the button below to reset your password. This link is valid for <strong>1 hour</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#3d0c02;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
          Reset Password
        </a>
        <p style="color:#888;font-size:13px;">If the button doesn't work, copy and paste this link:<br/><a href="${resetUrl}">${resetUrl}</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
        <p style="color:#aaa;font-size:12px;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  } catch (error) {
    console.log(error)
  }
};

module.exports = { sendPasswordResetEmail };
