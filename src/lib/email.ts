/**
 * ElderCare OS — Environment-Configured Email Provider
 * Dispatches verification, password recovery, and security alert emails.
 * Never hardcodes provider credentials or sends plaintext passwords.
 */

import nodemailer from 'nodemailer';
import fs from 'fs';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Optional in-memory/file capture for automated tests only when EMAIL_TEST_CAPTURE=true
const capturedTestEmails: Array<EmailMessage & { sentAt: string }> = [];

export function getCapturedTestEmails() {
  return [...capturedTestEmails];
}

export function clearCapturedTestEmails() {
  capturedTestEmails.length = 0;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
}

export async function sendEmail(message: EmailMessage): Promise<{ dispatched: boolean; mode: 'smtp' | 'dev_sink' }> {
  if (process.env.NODE_ENV !== 'production' && process.env.EMAIL_TEST_CAPTURE === 'true') {
    const entry = { ...message, sentAt: new Date().toISOString() };
    capturedTestEmails.push(entry);
    if (process.env.EMAIL_TEST_CAPTURE_FILE) {
      fs.appendFileSync(process.env.EMAIL_TEST_CAPTURE_FILE, JSON.stringify(entry) + '\n', 'utf8');
    }
    return { dispatched: true, mode: 'dev_sink' };
  }

  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || 'no-reply@eldercareos.com';

  if (!transporter) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[Email Fallback] SMTP_HOST is not configured; skipping external email delivery to ${message.to} | Subject: ${message.subject}`);
      return { dispatched: false, mode: 'dev_sink' };
    }
    // Safe local development sink: never log tokens or passwords
    console.info(`[Email Dev Sink] To: ${message.to} | Subject: ${message.subject}`);
    return { dispatched: true, mode: 'dev_sink' };
  }

  await transporter.sendMail({
    from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  return { dispatched: true, mode: 'smtp' };
}

function getAppBaseUrl(): string {
  return process.env.APP_URL || 'http://localhost:3000';
}

export async function sendVerificationEmail(to: string, fullName: string, rawToken: string) {
  const verifyUrl = `${getAppBaseUrl()}/email-verification?token=${encodeURIComponent(rawToken)}`;
  return sendEmail({
    to,
    subject: 'Verify your ElderCare OS email address',
    text: `Hello ${fullName},\n\nPlease verify your ElderCare OS account using the link below (expires in 24 hours):\n${verifyUrl}\n\nVerification Token: ${rawToken}\n\nIf you did not create this account, please ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E8E1F5; border-radius: 16px;">
        <h2 style="color: #6D28D9; margin-bottom: 8px;">Verify Your Email</h2>
        <p style="color: #17133A; font-size: 14px;">Hello ${fullName},</p>
        <p style="color: #686581; font-size: 13px;">Confirm your email address to activate your ElderCare OS workspace access. This link expires in 24 hours.</p>
        <a href="${verifyUrl}" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #6D28D9; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px;">Verify Email Address</a>
        <p style="color: #686581; font-size: 12px;">Or paste this one-time verification token:</p>
        <code style="display: block; padding: 10px; background: #FAF8FF; border: 1px solid #E8E1F5; border-radius: 8px; font-size: 12px; word-break: break-all;">${rawToken}</code>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, fullName: string, rawToken: string) {
  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  return sendEmail({
    to,
    subject: 'ElderCare OS — Password Reset Request',
    text: `Hello ${fullName},\n\nA password reset was requested for your ElderCare OS account. Use the link below within 30 minutes:\n${resetUrl}\n\nReset Token: ${rawToken}\n\nIf you did not request this, you can safely ignore this message.`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E8E1F5; border-radius: 16px;">
        <h2 style="color: #6D28D9; margin-bottom: 8px;">Reset Your Password</h2>
        <p style="color: #17133A; font-size: 14px;">Hello ${fullName},</p>
        <p style="color: #686581; font-size: 13px;">A password reset was requested for your account. This one-time token expires in 30 minutes.</p>
        <a href="${resetUrl}" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #6D28D9; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px;">Reset Password</a>
        <p style="color: #686581; font-size: 12px;">Or paste this one-time reset token:</p>
        <code style="display: block; padding: 10px; background: #FAF8FF; border: 1px solid #E8E1F5; border-radius: 8px; font-size: 12px; word-break: break-all;">${rawToken}</code>
      </div>
    `,
  });
}

export async function sendSecurityAlertEmail(to: string, fullName: string, summary: string) {
  return sendEmail({
    to,
    subject: 'ElderCare OS — Security Alert',
    text: `Hello ${fullName},\n\nSecurity notification for your account: ${summary}\n\nIf you did not perform this action, contact your administrator immediately.`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E8E1F5; border-radius: 16px;">
        <h2 style="color: #4C1D95; margin-bottom: 8px;">Security Notification</h2>
        <p style="color: #17133A; font-size: 14px;">Hello ${fullName},</p>
        <p style="color: #686581; font-size: 13px;">${summary}</p>
        <p style="color: #686581; font-size: 12px; margin-top: 16px;">If you did not authorize this activity, revoke all sessions and contact Platform Support immediately.</p>
      </div>
    `,
  });
}
