import { Metadata } from 'next';
import { requireClientAuth } from '@/lib/auth/client/utils';
import { db } from '@/lib/db';
import { invoices, quotes, projects, clientProjects } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Client Portal Dashboard',
  description: 'Access your invoices and quotes',
};

export default async function DashboardPage() {
  // This function redirects to login if not authenticated
  const session = await requireClientAuth();
  
  // Get client invoices
  const clientInvoices = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      total: invoices.total,
      xenditInvoiceUrl: invoices.xenditInvoiceUrl,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.clientId, session.clientId),
        eq(invoices.softDelete, false)
      )
    )
    .orderBy(invoices.dueDate)
    .limit(5);
  
  // Get client quotes
  const clientQuotes = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      status: quotes.status,
      issueDate: quotes.issueDate,
      expiryDate: quotes.expiryDate,
      total: quotes.total,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.clientId, session.clientId),
        eq(quotes.softDelete, false)
      )
    )
    .orderBy(desc(quotes.expiryDate))
    .limit(5);

  // Get client projects
  const dashboardProjects = await db
    .select({
      id: projects.id,
      title: projects.title,
      status: projects.status,
      startDate: projects.startDate,
      endDate: projects.endDate,
      colorCode: projects.colorCode,
    })
    .from(projects)
    .innerJoin(clientProjects, eq(clientProjects.projectId, projects.id))
    .where(and(
      eq(clientProjects.clientId, session.clientId),
      eq(projects.softDelete, false)
    ))
    .orderBy(desc(projects.updatedAt))
    .limit(3);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Projects Overview */}
      <div className="mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Recent Projects</h2>
              <p className="mt-1 text-sm text-gray-500">Your active projects</p>
            </div>
            <Link
              href="/portal/projects"
              className="text-sm font-medium text-primary hover:text-primary/90"
            >
              View all
            </Link>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {dashboardProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboardProjects.map((project) => (
                  <Link key={project.id} href={`/portal/projects/${project.id}`} className="block group">
                    <div className="border rounded-md p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: project.colorCode || '#gray' }}
                          />
                          <h3 className="font-semibold text-gray-900 group-hover:text-primary truncate">
                            {project.title}
                          </h3>
                        </div>
                        <Badge variant="outline" className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-2 mt-4">
                        <Calendar className="h-4 w-4" />
                         <span>
                          {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'TBD'} 
                          {' - '}
                          {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'TBD'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No projects found.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
        {/* Recent Invoices */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Recent Invoices</h2>
              <p className="mt-1 text-sm text-gray-500">Your most recent invoices</p>
            </div>
            <Link
              href="/portal/invoices"
              className="text-sm font-medium text-primary hover:text-primary/90"
            >
              View all
            </Link>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {clientInvoices.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {clientInvoices.map((invoice) => (
                  <li key={invoice.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Invoice #{invoice.invoiceNumber}
                        </p>
                        <p className="text-sm text-gray-500">
                          Due: {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {invoice.status}
                        </span>
                        <div className="ml-4 flex-shrink-0">
                          <Link
                            href={`/portal/invoices/${invoice.id}`}
                            className="text-sm font-medium text-primary hover:text-primary/90"
                          >
                            View
                          </Link>
                          {/* Payment integration removed */}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No invoices found.</p>
            )}
          </div>
        </div>

        {/* Recent Quotes */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Recent Quotes</h2>
              <p className="mt-1 text-sm text-gray-500">Your most recent quotes</p>
            </div>
            <Link
              href="/portal/quotes"
              className="text-sm font-medium text-primary hover:text-primary/90"
            >
              View all
            </Link>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {clientQuotes.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {clientQuotes.map((quote) => (
                  <li key={quote.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Quote #{quote.quoteNumber}
                        </p>
                        <p className="text-sm text-gray-500">
                          Expires: {new Date(quote.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          quote.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {quote.status}
                        </span>
                        <div className="ml-4 flex-shrink-0">
                          <Link
                            href={`/portal/quotes/${quote.id}`}
                            className="text-sm font-medium text-primary hover:text-primary/90"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No quotes found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 