import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { quotes, quoteItems, clients, companies } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getClientSession } from '@/lib/auth/client/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const session = await getClientSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { quoteId } = await params;
    const id = parseInt(quoteId);

    if (isNaN(id)) {
      return NextResponse.json({ message: 'Invalid quote ID' }, { status: 400 });
    }

    // Get quote data
    const quoteData = await db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        status: quotes.status,
        issueDate: quotes.issueDate,
        expiryDate: quotes.expiryDate,
        subtotal: quotes.subtotal,
        tax: quotes.tax,
        total: quotes.total,
        currency: quotes.currency,
        notes: quotes.notes,
        taxRate: quotes.taxRate,
        clientId: quotes.clientId,
        companyId: quotes.companyId,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.id, id),
          eq(quotes.clientId, session.clientId),
          eq(quotes.softDelete, false)
        )
      )
      .limit(1);

    if (!quoteData.length) {
      return NextResponse.json({ message: 'Quote not found' }, { status: 404 });
    }

    const quote = quoteData[0];

    // Get quote items
    const items = await db
      .select({
        id: quoteItems.id,
        description: quoteItems.description,
        quantity: quoteItems.quantity,
        unitPrice: quoteItems.unitPrice,
        amount: quoteItems.amount,
      })
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, id));

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
      .where(eq(clients.id, quote.clientId))
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
      .where(eq(companies.id, quote.companyId))
      .limit(1);

    return NextResponse.json({
      ...quote,
      items,
      client: clientData[0] || { id: quote.clientId, name: 'Unknown' },
      company: companyData[0] || undefined,
    });

  } catch (error) {
    console.error('Error fetching quote for PDF:', error);
    return NextResponse.json({ message: 'Failed to fetch quote' }, { status: 500 });
  }
}
