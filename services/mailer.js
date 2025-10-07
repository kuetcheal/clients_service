import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export async function sendMail(to, subject, html) {
  try {
    const info = await transporter.sendMail({
      from: `"Service Client" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("✅ Email envoyé :", info.messageId);
  } catch (err) {
    console.error("❌ Erreur lors de l’envoi du mail :", err);
    throw err;
  }
}
