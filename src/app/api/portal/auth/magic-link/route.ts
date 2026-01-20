import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { saveLoginToken } from '@/lib/auth/client/utils';
import { db } from '@/lib/db';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { MagicLinkEmail } from '@/emails/MagicLinkEmail';

let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY || '');
  }
  return resendClient;
}

// Validation schema for the request body
const requestSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const result = requestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Find client by email
    const [clientData] = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        companyId: clients.companyId,
      })
      .from(clients)
      .where(eq(clients.email, email));

    if (!clientData) {
      return NextResponse.json(
        { error: 'Email not found. Please contact your administrator.' },
        { status: 404 }
      );
    }

    // Generate a login token
    const token = await saveLoginToken(clientData.id, email);

    // Create verification URL
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://summitfinance.app';
    const verificationUrl = `${baseUrl}/portal/verify?token=${token}`;

    // Send email
    await getResend().emails.send({
      from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL || 'kugie@summitfinance.app'}>`,
      to: email,
      subject: 'Sign in to Your Client Portal',
      react: MagicLinkEmail({
        clientName: clientData.name || 'Valued Client',
        magicLink: verificationUrl,
      }),
    });

    return NextResponse.json(
      { message: 'Magic link sent to your email' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating magic link:', error);
    // @ts-ignore
    if (error?.message) console.error('Error message:', error.message);
    // @ts-ignore
    if (error?.response) console.error('Error response:', JSON.stringify(error.response));
    
    return NextResponse.json(
      { error: 'An error occurred while generating your magic link' },
      { status: 500 }
    );
  }
} 