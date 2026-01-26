import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/getAuthInfo';
import { db } from '@/lib/db';
import { invoices, clients, companies, paymentMethods } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendEmail, getPaymentRequestEmailHtml, PaymentMethodData } from '@/lib/email';
import { formatCurrency } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  return withAuth(request, async (authInfo) => {
    try {
      const { invoiceId } = await params;
      const parsedInvoiceId = parseInt(invoiceId);

      if (isNaN(parsedInvoiceId)) {
        return NextResponse.json({ message: 'Invalid invoice ID' }, { status: 400 });
      }

      // Fetch invoice with client and company details
      const invoiceData = await db
        .select({
          invoice: invoices,
          client: clients,
          company: companies,
        })
        .from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .leftJoin(companies, eq(invoices.companyId, companies.id))
        .where(
          and(
            eq(invoices.id, parsedInvoiceId),
            eq(invoices.companyId, authInfo.companyId)
          )
        )
        .limit(1);

      if (!invoiceData.length) {
        return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
      }

      const { invoice, client, company } = invoiceData[0];

      if (!client || !client.email) {
        return NextResponse.json(
          { message: 'Client does not have an email address' },
          { status: 400 }
        );
      }

      // Fetch payment methods for the company
      const paymentMethodsData = await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.companyId, authInfo.companyId));

      // Format currency
      const formattedAmount = formatCurrency(
        parseFloat(invoice.total),
        company?.defaultCurrency || 'XAF'
      );
      
      const rawAmount = Math.ceil(parseFloat(invoice.total));

      // Generate email HTML with dynamic payment methods
      const emailHtml = getPaymentRequestEmailHtml(
        invoice.invoiceNumber,
        formattedAmount,
        client.name,
        rawAmount,
        company?.logoUrl || undefined,
        paymentMethodsData as PaymentMethodData[]
      );

      // Send email
      const result = await sendEmail({
        to: client.email,
        subject: `Payment Request: Invoice ${invoice.invoiceNumber}`,
        html: emailHtml,
      });

      if (!result.success) {
        console.error('Failed to send email:', result.error);
        return NextResponse.json(
          { message: 'Failed to send payment email' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: 'Payment instructions sent' });
    } catch (error) {
      console.error('Error sending payment instructions:', error);
      return NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
