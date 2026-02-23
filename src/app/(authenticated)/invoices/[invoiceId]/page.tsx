'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isPast, addDays } from 'date-fns';
import { ArrowLeft, Download, Send, Pencil, Trash2, CreditCard, ExternalLink, RefreshCw, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Client {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
}

interface InvoiceItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  subtotal: string;
  tax: string;
  taxRate: string;
  total: string;
  discountType?: string | null;
  discountValue?: string | null;
  discountAmount?: string | null;
  amountPaid?: string;
  notes: string | null;
  clientId: number;
  client?: Client;
  items: InvoiceItem[];
  company?: {
    defaultCurrency: string;
  };
  createdAt?: string;
  updatedAt?: string;
  paidAt?: string | null;
  companyId?: number;
  xenditInvoiceId?: string | null;
  xenditInvoiceUrl?: string | null;
  payments?: Payment[];
}

interface Payment {
  id: number;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);
  const [regeneratingPaymentLink, setRegeneratingPaymentLink] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer' | 'cash' | 'other'>('bank_transfer');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const { invoiceId } = await params;
        const response = await fetch(`/api/invoices/${invoiceId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch invoice');
        }

        const data = await response.json();
        setInvoice({
          id: data.id,
          invoiceNumber: data.invoiceNumber,
          status: data.status,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          subtotal: data.subtotal,
          tax: data.tax,
          taxRate: data.taxRate,
          total: data.total,
          notes: data.notes,
          clientId: data.clientId,
          client: data.client || {
            id: 0,
            name: '',
            email: '',
            phone: null,
            address: null,
          },
          company: data.company || {
            defaultCurrency: 'XAF'
          },
          items: data.items || [],
        });
      } catch (error) {
        console.error('Error fetching invoice:', error);
        toast.error('Failed to load invoice details');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [params]);

  const handleDelete = async () => {
    try {
      const { invoiceId } = await params;
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete invoice');
      }

      toast.success('Invoice deleted successfully');
      router.push('/invoices');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const handleStatusUpdate = async (newStatus: Invoice['status']) => {
    try {
      if (!invoice) return;

      const { invoiceId } = await params;
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...invoice,
          clientId: invoice.clientId,
          status: newStatus,
          notes: invoice.notes || '',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update invoice status to ${newStatus}`);
      }

      // fetch the updated invoice
      const updatedInvoiceResponse = await fetch(`/api/invoices/${invoiceId}`);
      const updatedInvoice = await updatedInvoiceResponse.json();
      setInvoice(updatedInvoice);
      toast.success(`Invoice marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;

    try {
      const { invoiceId } = await params;

      // Directly fetch the PDF from the API
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Create a blob from the PDF data
      const blob = await response.blob();

      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary anchor element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleSendEmail = async () => {
    if (!invoice) return;

    // Check if client has an email
    if (!invoice.client?.email) {
      toast.error('Client does not have an email address');
      return;
    }

    setSendingEmail(true);

    try {
      const { invoiceId } = await params;
      const response = await fetch(`/api/invoices/${invoiceId}/send-email`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send email');
      }

      toast.success('Email sent successfully');

      // Refresh invoice data if status was updated
      if (invoice.status === 'draft') {
        const { invoiceId } = await params;
        const updatedInvoiceResponse = await fetch(`/api/invoices/${invoiceId}`);
        if (updatedInvoiceResponse.ok) {
          const updatedInvoice = await updatedInvoiceResponse.json();
          setInvoice(updatedInvoice);
        }
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error((error as Error).message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  // Check if the payment link is expired based on due date
  const isPaymentLinkExpired = (invoice: Invoice) => {
    if (!invoice.dueDate) return false;

    // Define "expired" as either:
    // 1. Due date is in the past, or
    // 2. The invoice has status of 'overdue'
    return isPast(new Date(invoice.dueDate)) || invoice.status === 'overdue';
  };

  const handleSendPaymentInstructions = async () => {
    if (!invoice) return;

    // Check if client has an email
    if (!invoice.client?.email) {
      toast.error('Client must have an email address to receive payment instructions');
      return;
    }

    setGeneratingPaymentLink(true); // Using same state variable for loading

    try {
      const { invoiceId } = await params;
      const response = await fetch(`/api/invoices/${invoiceId}/send-payment-info`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send payment instructions');
      }

      toast.success('Payment instructions sent to client');
    } catch (error) {
      console.error('Error sending payment instructions:', error);
      toast.error((error as Error).message || 'Failed to send payment instructions');
    } finally {
      setGeneratingPaymentLink(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <p>Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <p>Invoice not found or you don&apos;t have permission to view it.</p>
        </div>
      </div>
    );
  }

  const handleRecordPayment = async () => {
    if (!invoice) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setRecordingPayment(true);
    try {
      const { invoiceId } = await params;
      const response = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          paymentDate: new Date(paymentDate).toISOString(),
          paymentMethod,
          notes: paymentNotes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to record payment');
      }

      toast.success('Payment recorded successfully');
      setShowPaymentDialog(false);
      setPaymentAmount('');
      setPaymentNotes('');

      // Refresh invoice data
      const updatedResponse = await fetch(`/api/invoices/${invoiceId}`);
      if (updatedResponse.ok) {
        const updatedInvoice = await updatedResponse.json();
        setInvoice(updatedInvoice);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error((error as Error).message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'sent': return 'bg-blue-500';
      case 'paid': return 'bg-green-500';
      case 'partially_paid': return 'bg-yellow-500';
      case 'overdue': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };


  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push('/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoice {invoice.invoiceNumber}</h1>
          </div>
        </div>

        <div className="flex gap-2">
          <Badge className={`${getStatusColor(invoice.status)} text-white`}>
            {invoice.status === 'partially_paid'
              ? 'Partially Paid'
              : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </Badge>

          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>

          {invoice.status === 'draft' && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleStatusUpdate('sent')}>
                <Send className="h-4 w-4 mr-2" />
                Mark as Sent
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </>
          )}

          {/* Actions for Sent, Overdue, or Partially Paid invoices */}
          {(invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'partially_paid') && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleStatusUpdate('paid')}>
                Mark as Paid
              </Button>

              <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                      Record a payment for Invoice {invoice.invoiceNumber}.
                      Balance due: {formatCurrency(
                        parseFloat(invoice.total) - parseFloat(invoice.amountPaid || '0'),
                        invoice.company?.defaultCurrency
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentAmount">Amount</Label>
                      <Input
                        id="paymentAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentDate">Payment Date</Label>
                      <Input
                        id="paymentDate"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={(v) => setPaymentMethod(v as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentNotes">Notes (optional)</Label>
                      <Input
                        id="paymentNotes"
                        placeholder="Payment notes..."
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleRecordPayment} disabled={recordingPayment}>
                      {recordingPayment ? 'Recording...' : 'Record Payment'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSendPaymentInstructions}
                disabled={generatingPaymentLink || !invoice.client?.email}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {generatingPaymentLink ? 'Sending...' : 'Send Payment Instructions'}
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleSendEmail}
            disabled={sendingEmail || !invoice.client?.email}
          >
            <Send className="h-4 w-4 mr-2" />
            {sendingEmail ? 'Sending...' : 'Send Invoice Email'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this invoice? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-semibold">{invoice.client?.name}</p>
              {invoice.client?.email && <p>{invoice.client?.email}</p>}
              {invoice.client?.phone && <p>{invoice.client?.phone}</p>}
              {invoice.client?.address && <p className="whitespace-pre-line">{invoice.client?.address}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Number:</span>
                <span>{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue Date:</span>
                <span>{format(new Date(invoice.issueDate), 'PPP')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date:</span>
                <span>{format(new Date(invoice.dueDate), 'PPP')}</span>
              </div>
              {invoice.paidAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid Date:</span>
                  <span>{format(new Date(invoice.paidAt), 'PPP')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Amount Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(
                parseFloat(invoice.total) - parseFloat(invoice.amountPaid || '0'),
                invoice.company?.defaultCurrency
              )}
            </div>
            {parseFloat(invoice.amountPaid || '0') > 0 && (
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                <div>Paid: {formatCurrency(parseFloat(invoice.amountPaid || '0'), invoice.company?.defaultCurrency)}</div>
                <div>Total: {formatCurrency(parseFloat(invoice.total), invoice.company?.defaultCurrency)}</div>
              </div>
            )}
            <div className="text-muted-foreground mt-2">
              Status: <span className="font-medium">
                {invoice.status === 'partially_paid' ? 'Partially Paid' : invoice.status}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[400px]">Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{parseFloat(item.quantity)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(parseFloat(item.unitPrice), invoice.company?.defaultCurrency)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(parseFloat(item.amount), invoice.company?.defaultCurrency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex flex-col items-end">
            <div className="space-y-2 w-64">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                {formatCurrency(parseFloat(invoice.subtotal), invoice.company?.defaultCurrency)}
              </div>
              {invoice.discountAmount && parseFloat(invoice.discountAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Discount{invoice.discountType === 'percentage' && invoice.discountValue
                      ? ` (${invoice.discountValue}%)`
                      : ''}:
                  </span>
                  <span className="text-red-500">
                    -{formatCurrency(parseFloat(invoice.discountAmount), invoice.company?.defaultCurrency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({invoice.taxRate || '0'}%)</span>
                {formatCurrency(parseFloat(invoice.tax), invoice.company?.defaultCurrency)}
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                {formatCurrency(parseFloat(invoice.total), invoice.company?.defaultCurrency)}
              </div>
              {parseFloat(invoice.amountPaid || '0') > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>Amount Paid:</span>
                    {formatCurrency(parseFloat(invoice.amountPaid || '0'), invoice.company?.defaultCurrency)}
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Balance Due:</span>
                    {formatCurrency(
                      parseFloat(invoice.total) - parseFloat(invoice.amountPaid || '0'),
                      invoice.company?.defaultCurrency
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {invoice.payments && invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment: Payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{format(new Date(payment.paymentDate), 'PPP')}</TableCell>
                    <TableCell className="capitalize">
                      {payment.paymentMethod.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      <Badge className={payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(parseFloat(payment.amount), invoice.company?.defaultCurrency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{payment.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 