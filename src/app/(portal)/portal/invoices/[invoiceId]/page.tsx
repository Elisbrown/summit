'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PortalInvoicePDF } from '@/components/portal/PortalInvoicePDF';

interface InvoiceData {
  id: number;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: string;
  tax: string;
  total: string;
  currency: string;
  notes: string | null;
  xenditInvoiceUrl: string | null;
  paidAt: string | null;
  taxRate: string | null;
  items: Array<{
    id: number;
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }>;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = Number(params.invoiceId);
  
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/portal/invoices/${invoiceId}`);
        if (!response.ok) {
          router.push('/portal/invoices');
          return;
        }
        const data = await response.json();
        setInvoice(data);
      } catch (error) {
        console.error('Failed to fetch invoice:', error);
        router.push('/portal/invoices');
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) fetchInvoice();
  }, [invoiceId, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p>Invoice not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <Link 
          href="/portal/invoices" 
          className="flex items-center text-primary hover:text-primary/80"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Invoices
        </Link>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {/* Header */}
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Invoice #{invoice.invoiceNumber}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {new Date(invoice.issueDate).toLocaleDateString()} - {new Date(invoice.dueDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PortalInvoicePDF invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} />
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
              invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {invoice.status}
            </span>
          </div>
        </div>
        
        {/* Invoice details */}
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
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {Number(item.quantity).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {formatCurrency(Number(item.unitPrice), invoice.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {formatCurrency(Number(item.amount), invoice.currency)}
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
                      {formatCurrency(Number(invoice.subtotal), invoice.currency)}
                    </td>
                  </tr>
                  <tr>
                    <th colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                      Tax ({invoice.taxRate || '0'}%)
                    </th>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">
                      {formatCurrency(Number(invoice.tax), invoice.currency)}
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <th colSpan={3} className="px-6 py-3 text-right text-sm font-bold text-gray-700">
                      Total
                    </th>
                    <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                      {formatCurrency(Number(invoice.total), invoice.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-500">{invoice.notes}</p>
            </div>
          )}
          
          {/* Payment Info */}
          {invoice.status !== 'paid' && invoice.xenditInvoiceUrl && (
            <div className="mt-8 flex justify-end">
              <a
                href={invoice.xenditInvoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Pay Now
              </a>
            </div>
          )}
          
          {invoice.paidAt && (
            <div className="mt-6 text-right">
              <p className="text-sm text-gray-500">
                Paid on: {new Date(invoice.paidAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 