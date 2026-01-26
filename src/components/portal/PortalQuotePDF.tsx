'use client';

import { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { QuotePDF } from '@/components/pdf/QuotePDF';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

interface PortalQuotePDFProps {
  quoteId: number;
  quoteNumber: string;
}

export function PortalQuotePDF({ quoteId, quoteNumber }: PortalQuotePDFProps) {
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await fetch(`/api/portal/quotes/${quoteId}`);
        if (!response.ok) throw new Error('Failed to fetch quote');
        const data = await response.json();
        setQuote(data);
      } catch (err) {
        setError('Unable to load PDF');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, [quoteId]);

  if (loading) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (error || !quote) {
    return (
      <Button variant="outline" disabled>
        PDF Unavailable
      </Button>
    );
  }

  return (
    <PDFDownloadLink 
      document={<QuotePDF quote={quote} />} 
      fileName={`quote-${quoteNumber}.pdf`}
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
