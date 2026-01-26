'use client';

import { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/pdf/InvoicePDF';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

interface PortalInvoicePDFProps {
  invoiceId: number;
  invoiceNumber: string;
}

export function PortalInvoicePDF({ invoiceId, invoiceNumber }: PortalInvoicePDFProps) {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/portal/invoices/${invoiceId}`);
        if (!response.ok) throw new Error('Failed to fetch invoice');
        const data = await response.json();
        setInvoice(data);
      } catch (err) {
        setError('Unable to load PDF');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [invoiceId]);

  if (loading) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (error || !invoice) {
    return (
      <Button variant="outline" disabled>
        PDF Unavailable
      </Button>
    );
  }

  return (
    <PDFDownloadLink 
      document={<InvoicePDF invoice={invoice} />} 
      fileName={`invoice-${invoiceNumber}.pdf`}
      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
    >
      {({ loading: pdfLoading }) => 
        pdfLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Preparing...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </>
        )
      }
    </PDFDownloadLink>
  );
}
