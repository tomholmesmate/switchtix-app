// Email updates so nobody has to keep checking the app. Switched off until SMTP_USER and SMTP_PASS are set
// (a Gmail address and a Gmail app password work for the beta). Never throws.
import nodemailer, { type Transporter } from "nodemailer";
import { adminClient, siteUrl } from "./supabase";

export function emailEnabled() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

let cached: Transporter | null = null;
function transport() {
  if (!cached) {
    cached = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return cached;
}

async function emailOf(userId: string | null) {
  if (!userId) return null;
  const { data } = await adminClient().auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

function escape(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

async function send(to: string, subject: string, lines: string[], path: string, button: string) {
  const url = `${siteUrl()}${path}`;
  const text = `${lines.join("\n\n")}\n\n${button}: ${url}\n\n— SwitchTix`;
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;line-height:1.5;color:#1b1330;max-width:520px">
${lines.map((l) => `<p>${escape(l)}</p>`).join("")}
<p><a href="${url}" style="display:inline-block;background:#a51890;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">${escape(button)}</a></p>
<p style="color:#807a92;font-size:13px">SwitchTix · safe ticket deals between people</p></div>`;
  await transport().sendMail({
    from: process.env.SMTP_FROM || `SwitchTix <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

/** Emails one person on a deal. */
export async function emailUser(userId: string | null, subject: string, lines: string[], path: string, button: string) {
  if (!emailEnabled()) return;
  try {
    const to = await emailOf(userId);
    if (to) await send(to, subject, lines, path, button);
  } catch (err) {
    console.error("Email failed", subject, err);
  }
}

/** Emails everyone in ADMIN_EMAILS. */
export async function emailAdmins(subject: string, lines: string[], path: string, button: string) {
  if (!emailEnabled()) return;
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean);
  for (const to of admins) {
    try {
      await send(to, subject, lines, path, button);
    } catch (err) {
      console.error("Admin email failed", err);
    }
  }
}
