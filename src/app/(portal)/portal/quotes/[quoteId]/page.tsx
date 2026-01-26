'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PortalQuotePDF } from '@/components/portal/PortalQuotePDF';

interface QuoteData {
  id: number;
  quoteNumber: string;
  status: string;
  issueDate: string;
  expiryDate: string;
  subtotal: string;
  tax: string;
  total: string;
  currency: string;
  notes: string | null;
  taxRate: string | null;
  items: Array<{
    id: number;
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }>;
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = Number(params.quoteId);
  
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await fetch(`/api/portal/quotes/${quoteId}`);
        if (!response.ok) {
          router.push('/portal/quotes');
          return;
        }
        const data = await response.json();
        setQuote(data);
      } catch (error) {
        console.error('Failed to fetch quote:', error);
        router.push('/portal/quotes');
      } finally {
        setLoading(false);
      }
    };

    if (quoteId) fetchQuote();
  }, [quoteId, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p>Quote not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <Link 
          href="/portal/quotes" 
          className="flex items-center text-primary hover:text-primary/80"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Quotes
        </Link>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {/* Header */}
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Quote #{quote.quoteNumber}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Issued: {new Date(quote.issueDate).toLocaleDateString()} | Valid until: {new Date(quote.expiryDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PortalQuotePDF quoteId={quote.id} quoteNumber={quote.quoteNumber} />
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
              quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
              quote.status === 'expired' ? 'bg-gray-100 text-gray-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {quote.status}
            </span>
          </div>
        </div>
        
        {/* Quote details */}
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          {/* Items */}
          <div className="mt-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quote.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {Number(item.quantity).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {formatCurrency(Number(item.unitPrice), quote.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {formatCurrency(Number(item.amount), quote.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                      Subtotal
                    </th>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">
                      {formatCurrency(Number(quote.subtotal), quote.currency)}
                    </td>
                  </tr>
                  <tr>
                    <th colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                      Tax ({quote.taxRate || '0'}%)
                    </th>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">
                      {formatCurrency(Number(quote.tax), quote.currency)}
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <th colSpan={3} className="px-6 py-3 text-right text-sm font-bold text-gray-700">
                      Total
                    </th>
                    <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                      {formatCurrency(Number(quote.total), quote.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          {/* Notes */}
          {quote.notes && (
            <div className="mt-8">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-500">{quote.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
