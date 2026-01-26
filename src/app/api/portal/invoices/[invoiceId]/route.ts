import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, invoiceItems, clients, companies } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getClientSession } from '@/lib/auth/client/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await getClientSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { invoiceId } = await params;
    const id = parseInt(invoiceId);

    if (isNaN(id)) {
      return NextResponse.json({ message: 'Invalid invoice ID' }, { status: 400 });
    }

    // Get invoice with company data
    const invoiceData = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        subtotal: invoices.subtotal,
        tax: invoices.tax,
        total: invoices.total,
        currency: invoices.currency,
        notes: invoices.notes,
        taxRate: invoices.taxRate,
        clientId: invoices.clientId,
        companyId: invoices.companyId,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.clientId, session.clientId),
          eq(invoices.softDelete, false)
        )
      )
      .limit(1);

    if (!invoiceData.length) {
      return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoiceData[0];

    // Get invoice items
    const items = await db
      .select({
        id: invoiceItems.id,
        description: invoiceItems.description,
        quantity: invoiceItems.quantity,
        unitPrice: invoiceItems.unitPrice,
        amount: invoiceItems.amount,
      })
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, id));

    // Get client data
    const clientData = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        address: clients.address,
      })
      .from(clients)
      .where(eq(clients.id, invoice.clientId))
      .limit(1);

    // Get company data for PDF header
    const companyData = await db
      .select({
        name: companies.name,
        email: companies.email,
        phone: companies.phone,
        address: companies.address,
        logoUrl: companies.logoUrl,
        bankAccount: companies.bankAccount,
        defaultCurrency: companies.defaultCurrency,
      })
      .from(companies)
      .where(eq(companies.id, invoice.companyId))
      .limit(1);

    return NextResponse.json({
      ...invoice,
      items,
      client: clientData[0] || { id: invoice.clientId, name: 'Unknown' },
      company: companyData[0] || undefined,
    });

  } catch (error) {
    console.error('Error fetching invoice for PDF:', error);
    return NextResponse.json({ message: 'Failed to fetch invoice' }, { status: 500 });
  }
}
