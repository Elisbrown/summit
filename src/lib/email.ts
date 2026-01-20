import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY || '');
  }
  return resendClient;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const resend = getResendClient();
    const data = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

export function getInvitationEmailHtml(projectName: string, inviterName: string, link: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You've been invited!</h2>
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has invited you to join the project <strong>${projectName}</strong> on SIGALIX LABS.</p>
      <p>Click the button below to accept the invitation:</p>
      <div style="margin: 24px 0;">
        <a href="${link}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Project</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This invitation will expire in 7 days.</p>
    </div>
  `;
}

export function getPaymentRequestEmailHtml(
  invoiceNumber: string,
  amount: string,
  clientName: string,
  rawAmount: number,
  logoUrl?: string
) {
  const accountName = "Elisbrown Sigala Sunyin";
  const accountNumber = "679690703";
  const mtnUssdCode = `*126*9*${accountNumber}*${rawAmount}#`;

  const logoHtml = logoUrl 
    ? `<div style="text-align: center; margin-bottom: 24px;"><img src="${logoUrl}" alt="Company Logo" style="max-height: 60px; max-width: 200px;" /></div>`
    : '';

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      ${logoHtml}
      <h2 style="color: #1a1a1a;">Payment Request for Invoice ${invoiceNumber}</h2>
      <p>Hello ${clientName},</p>
      <p>Please find below the payment details for your invoice <strong>${invoiceNumber}</strong>. The total amount due is <strong>${amount}</strong>.</p>
      
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #111827;">Mobile Money Payment Details</h3>
        
        <div style="margin-bottom: 16px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Account Name</p>
          <p style="margin: 4px 0 0; font-weight: 600; font-size: 16px;">${accountName}</p>
        </div>
        
        <div style="margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Account Number (MTN & Orange)</p>
          <p style="margin: 4px 0 0; font-weight: 600; font-size: 18px; letter-spacing: 0.5px;">${accountNumber}</p>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <!-- MTN Button -->
          <a href="tel:${encodeURIComponent(mtnUssdCode)}" style="background-color: #ffcc00; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; text-align: center;">
            Dial to Pay (MTN)
            <div style="font-weight: normal; font-size: 12px; margin-top: 2px;">${mtnUssdCode}</div>
          </a>
        </div>
        
        <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
          <strong>Orange Money:</strong> Please navigate to your Orange Money menu and send money to the account number above.
        </p>
      </div>
      
      <p>Once you have completed the payment, please reply to this email with the transaction confirmation.</p>
      <p>Thank you for your business!</p>
    </div>
  `;
}
