/**
 * Comprehensive API Integration Tests
 * Tests all CRUD operations for all API routes
 * Run with: pnpm test -- --testPathPattern="api-integration"
 */

import { NextRequest } from 'next/server';

// Mock authentication
const mockAuthInfo = {
  companyId: 1,
  userId: 1,
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin'
};

// Mock withAuth to bypass authentication
jest.mock('@/lib/auth/getAuthInfo', () => ({
  withAuth: jest.fn((request: NextRequest, handler: (authInfo: any) => Promise<any>) => {
    return handler(mockAuthInfo);
  }),
}));

// Mock getServerSession for routes that use it directly
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    user: { id: '1', companyId: '1', email: 'test@example.com', name: 'Test User', role: 'admin' }
  }))
}));

// Mock database with in-memory tracking
const mockDbData: {
  accounts: any[];
  clients: any[];
  vendors: any[];
  projects: any[];
  cards: any[];
  boards: any[];
  invoices: any[];
  quotes: any[];
  transactions: any[];
  expenses: any[];
  income: any[];
  expenseCategories: any[];
  incomeCategories: any[];
  users: any[];
  apiTokens: any[];
  calendarEvents: any[];
} = {
  accounts: [],
  clients: [],
  vendors: [],
  projects: [],
  cards: [],
  boards: [],
  invoices: [],
  quotes: [],
  transactions: [],
  expenses: [],
  income: [],
  expenseCategories: [],
  incomeCategories: [],
  users: [],
  apiTokens: [],
  calendarEvents: [],
};

let idCounter = 1;
const generateId = () => idCounter++;

// Mock db operations
const createMockDbOperation = (tableName: keyof typeof mockDbData) => ({
  insert: jest.fn(() => ({
    values: jest.fn((data: any) => ({
      returning: jest.fn(() => Promise.resolve([{ id: generateId(), ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]))
    }))
  })),
  select: jest.fn(() => ({
    from: jest.fn(() => ({
      where: jest.fn(() => Promise.resolve(mockDbData[tableName])),
      orderBy: jest.fn(() => ({
        limit: jest.fn(() => ({
          offset: jest.fn(() => Promise.resolve(mockDbData[tableName]))
        }))
      })),
      leftJoin: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve(mockDbData[tableName].map(item => ({ [tableName]: item }))))
      }))
    }))
  })),
  update: jest.fn(() => ({
    set: jest.fn(() => ({
      where: jest.fn(() => ({
        returning: jest.fn(() => Promise.resolve([{ id: 1, updatedAt: new Date().toISOString() }]))
      }))
    }))
  })),
  delete: jest.fn(() => ({
    where: jest.fn(() => Promise.resolve())
  })),
});

jest.mock('@/lib/db', () => ({
  db: {
    insert: jest.fn((table: any) => ({
      values: jest.fn((data: any) => ({
        returning: jest.fn(() => Promise.resolve([{ id: generateId(), ...data }])),
        onConflictDoNothing: jest.fn(() => Promise.resolve([{ id: generateId(), ...data }]))
      }))
    })),
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve([])),
        orderBy: jest.fn(() => ({
          limit: jest.fn(() => ({
            offset: jest.fn(() => Promise.resolve([]))
          }))
        })),
        leftJoin: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([]))
        })),
        innerJoin: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([]))
        })),
      }))
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          returning: jest.fn(() => Promise.resolve([{ id: 1, updatedAt: new Date().toISOString() }]))
        }))
      }))
    })),
    delete: jest.fn(() => ({
      where: jest.fn(() => Promise.resolve())
    })),
  }
}));

// Mock schema tables
jest.mock('@/lib/db/schema', () => ({
  accounts: { id: 'id', companyId: 'companyId', softDelete: 'softDelete' },
  clients: { id: 'id', companyId: 'companyId', softDelete: 'softDelete' },
  vendors: { id: 'id', companyId: 'companyId', softDelete: 'softDelete' },
  projects: { id: 'id', companyId: 'companyId', softDelete: 'softDelete' },
  cards: { id: 'id', boardId: 'boardId', softDelete: 'softDelete' },
  boards: { id: 'id', projectId: 'projectId' },
  invoices: { id: 'id', companyId: 'companyId', softDelete: 'softDelete' },
  invoiceItems: { id: 'id', invoiceId: 'invoiceId' },
  quotes: { id: 'id', companyId: 'companyId', softDelete: 'softDelete' },
  quoteItems: { id: 'id', quoteId: 'quoteId' },
  transactions: { id: 'id', companyId: 'companyId', softDelete: 'softDelete' },
  expenses: { id: 'id', companyId: 'companyId', softDelete: 'softDelete' },
  income: { id: 'id', companyId: 'companyId', softDelete: 'softDelete' },
  expenseCategories: { id: 'id', companyId: 'companyId', softDelete: 'softDelete' },
  incomeCategories: { id: 'id', companyId: 'companyId', softDelete: 'softDelete' },
  users: { id: 'id', companyId: 'companyId', softDelete: 'softDelete' },
  apiTokens: { id: 'id', userId: 'userId' },
  calendarEvents: { id: 'id', companyId: 'companyId', softDelete: 'softDelete' },
  projectMembers: { projectId: 'projectId', userId: 'userId' },
  cardAssignees: { cardId: 'cardId', userId: 'userId' },
  projectMessages: { id: 'id', projectId: 'projectId' },
  clientProjects: { clientId: 'clientId', projectId: 'projectId' },
  companies: { id: 'id' },
}));

// Helper to create mock Request
function createMockRequest(method: string, url: string, body?: any): NextRequest {
  const request = new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return request;
}

// Test Results Tracker
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const testResults: TestResult[] = [];

// Helper to track test results
function trackTest(name: string, passed: boolean, error?: string) {
  testResults.push({ name, passed, error });
}

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    idCounter = 1;
  });

  // ==================== ACCOUNTS ====================
  describe('Accounts API (/api/accounts)', () => {
    test('GET /api/accounts - List accounts', async () => {
      try {
        const { GET } = await import('@/app/api/accounts/route');
        const req = createMockRequest('GET', '/api/accounts');
        const response = await GET(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/accounts', true);
      } catch (error: any) {
        trackTest('GET /api/accounts', false, error.message);
        throw error;
      }
    });

    test('POST /api/accounts - Create account', async () => {
      try {
        const { POST } = await import('@/app/api/accounts/route');
        const req = createMockRequest('POST', '/api/accounts', {
          name: 'Test Account',
          type: 'checking',
          initialBalance: '1000',
          currency: 'USD'
        });
        const response = await POST(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('POST /api/accounts', true);
      } catch (error: any) {
        trackTest('POST /api/accounts', false, error.message);
        throw error;
      }
    });

    test('GET /api/accounts/[id] - Get single account', async () => {
      try {
        const { GET } = await import('@/app/api/accounts/[accountId]/route');
        const req = createMockRequest('GET', '/api/accounts/1');
        const response = await GET(req, { params: Promise.resolve({ accountId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/accounts/[id]', true);
      } catch (error: any) {
        trackTest('GET /api/accounts/[id]', false, error.message);
        throw error;
      }
    });

    test('PUT /api/accounts/[id] - Update account', async () => {
      try {
        const { PUT } = await import('@/app/api/accounts/[accountId]/route');
        const req = createMockRequest('PUT', '/api/accounts/1', {
          name: 'Updated Account',
          type: 'savings',
          initialBalance: '2000',
          currency: 'USD'
        });
        const response = await PUT(req, { params: Promise.resolve({ accountId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('PUT /api/accounts/[id]', true);
      } catch (error: any) {
        trackTest('PUT /api/accounts/[id]', false, error.message);
        throw error;
      }
    });

    test('DELETE /api/accounts/[id] - Delete account', async () => {
      try {
        const { DELETE } = await import('@/app/api/accounts/[accountId]/route');
        const req = createMockRequest('DELETE', '/api/accounts/1');
        const response = await DELETE(req, { params: Promise.resolve({ accountId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('DELETE /api/accounts/[id]', true);
      } catch (error: any) {
        trackTest('DELETE /api/accounts/[id]', false, error.message);
        throw error;
      }
    });
  });

  // ==================== CLIENTS ====================
  describe('Clients API (/api/clients)', () => {
    test('GET /api/clients - List clients', async () => {
      try {
        const { GET } = await import('@/app/api/clients/route');
        const req = createMockRequest('GET', '/api/clients');
        const response = await GET(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/clients', true);
      } catch (error: any) {
        trackTest('GET /api/clients', false, error.message);
        throw error;
      }
    });

    test('POST /api/clients - Create client', async () => {
      try {
        const { POST } = await import('@/app/api/clients/route');
        const req = createMockRequest('POST', '/api/clients', {
          name: 'Test Client',
          email: 'client@test.com',
          phone: '+1234567890',
          address: '123 Test St'
        });
        const response = await POST(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('POST /api/clients', true);
      } catch (error: any) {
        trackTest('POST /api/clients', false, error.message);
        throw error;
      }
    });

    test('GET /api/clients/[id] - Get client', async () => {
      try {
        const { GET } = await import('@/app/api/clients/[clientId]/route');
        const req = createMockRequest('GET', '/api/clients/1');
        const response = await GET(req, { params: Promise.resolve({ clientId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/clients/[id]', true);
      } catch (error: any) {
        trackTest('GET /api/clients/[id]', false, error.message);
        throw error;
      }
    });

    test('PUT /api/clients/[id] - Update client', async () => {
      try {
        const { PUT } = await import('@/app/api/clients/[clientId]/route');
        const req = createMockRequest('PUT', '/api/clients/1', {
          name: 'Updated Client',
          email: 'updated@test.com',
          phone: '+0987654321',
          address: '456 Updated St'
        });
        const response = await PUT(req, { params: Promise.resolve({ clientId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('PUT /api/clients/[id]', true);
      } catch (error: any) {
        trackTest('PUT /api/clients/[id]', false, error.message);
        throw error;
      }
    });

    test('DELETE /api/clients/[id] - Delete client', async () => {
      try {
        const { DELETE } = await import('@/app/api/clients/[clientId]/route');
        const req = createMockRequest('DELETE', '/api/clients/1');
        const response = await DELETE(req, { params: Promise.resolve({ clientId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('DELETE /api/clients/[id]', true);
      } catch (error: any) {
        trackTest('DELETE /api/clients/[id]', false, error.message);
        throw error;
      }
    });
  });

  // ==================== VENDORS ====================
  describe('Vendors API (/api/vendors)', () => {
    test('GET /api/vendors - List vendors', async () => {
      try {
        const { GET } = await import('@/app/api/vendors/route');
        const req = createMockRequest('GET', '/api/vendors');
        const response = await GET(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/vendors', true);
      } catch (error: any) {
        trackTest('GET /api/vendors', false, error.message);
        throw error;
      }
    });

    test('POST /api/vendors - Create vendor', async () => {
      try {
        const { POST } = await import('@/app/api/vendors/route');
        const req = createMockRequest('POST', '/api/vendors', {
          name: 'Test Vendor',
          email: 'vendor@test.com',
          phone: '+1234567890',
          address: '123 Vendor St'
        });
        const response = await POST(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('POST /api/vendors', true);
      } catch (error: any) {
        trackTest('POST /api/vendors', false, error.message);
        throw error;
      }
    });

    test('PUT /api/vendors/[id] - Update vendor', async () => {
      try {
        const { PUT } = await import('@/app/api/vendors/[vendorId]/route');
        const req = createMockRequest('PUT', '/api/vendors/1', {
          name: 'Updated Vendor',
          email: 'updated-vendor@test.com'
        });
        const response = await PUT(req, { params: Promise.resolve({ vendorId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('PUT /api/vendors/[id]', true);
      } catch (error: any) {
        trackTest('PUT /api/vendors/[id]', false, error.message);
        throw error;
      }
    });

    test('DELETE /api/vendors/[id] - Delete vendor', async () => {
      try {
        const { DELETE } = await import('@/app/api/vendors/[vendorId]/route');
        const req = createMockRequest('DELETE', '/api/vendors/1');
        const response = await DELETE(req, { params: Promise.resolve({ vendorId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('DELETE /api/vendors/[id]', true);
      } catch (error: any) {
        trackTest('DELETE /api/vendors/[id]', false, error.message);
        throw error;
      }
    });
  });

  // ==================== PROJECTS ====================
  describe('Projects API (/api/projects)', () => {
    test('GET /api/projects - List projects', async () => {
      try {
        const { GET } = await import('@/app/api/projects/route');
        const req = createMockRequest('GET', '/api/projects');
        const response = await GET(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/projects', true);
      } catch (error: any) {
        trackTest('GET /api/projects', false, error.message);
        throw error;
      }
    });

    test('POST /api/projects - Create project', async () => {
      try {
        const { POST } = await import('@/app/api/projects/route');
        const req = createMockRequest('POST', '/api/projects', {
          title: 'Test Project',
          description: 'A test project',
          status: 'active',
          priority: 'high'
        });
        const response = await POST(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('POST /api/projects', true);
      } catch (error: any) {
        trackTest('POST /api/projects', false, error.message);
        throw error;
      }
    });

    test('GET /api/projects/[id] - Get project', async () => {
      try {
        const { GET } = await import('@/app/api/projects/[projectId]/route');
        const req = createMockRequest('GET', '/api/projects/1');
        const response = await GET(req, { params: Promise.resolve({ projectId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/projects/[id]', true);
      } catch (error: any) {
        trackTest('GET /api/projects/[id]', false, error.message);
        throw error;
      }
    });

    test('PUT /api/projects/[id] - Update project', async () => {
      try {
        const { PUT } = await import('@/app/api/projects/[projectId]/route');
        const req = createMockRequest('PUT', '/api/projects/1', {
          title: 'Updated Project',
          description: 'Updated description',
          status: 'completed'
        });
        const response = await PUT(req, { params: Promise.resolve({ projectId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('PUT /api/projects/[id]', true);
      } catch (error: any) {
        trackTest('PUT /api/projects/[id]', false, error.message);
        throw error;
      }
    });

    test('DELETE /api/projects/[id] - Delete project', async () => {
      try {
        const { DELETE } = await import('@/app/api/projects/[projectId]/route');
        const req = createMockRequest('DELETE', '/api/projects/1');
        const response = await DELETE(req, { params: Promise.resolve({ projectId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('DELETE /api/projects/[id]', true);
      } catch (error: any) {
        trackTest('DELETE /api/projects/[id]', false, error.message);
        throw error;
      }
    });
  });

  // ==================== CARDS ====================
  describe('Cards API (/api/projects/[projectId]/cards)', () => {
    test('GET /api/projects/[id]/cards - List cards', async () => {
      try {
        const { GET } = await import('@/app/api/projects/[projectId]/cards/route');
        const req = createMockRequest('GET', '/api/projects/1/cards');
        const response = await GET(req, { params: Promise.resolve({ projectId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/projects/[id]/cards', true);
      } catch (error: any) {
        trackTest('GET /api/projects/[id]/cards', false, error.message);
        throw error;
      }
    });

    test('POST /api/projects/[id]/cards - Create card', async () => {
      try {
        const { POST } = await import('@/app/api/projects/[projectId]/cards/route');
        const req = createMockRequest('POST', '/api/projects/1/cards', {
          title: 'Test Card',
          description: 'A test card',
          boardId: 1,
          priority: 'high'
        });
        const response = await POST(req, { params: Promise.resolve({ projectId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('POST /api/projects/[id]/cards', true);
      } catch (error: any) {
        trackTest('POST /api/projects/[id]/cards', false, error.message);
        throw error;
      }
    });

    test('PUT /api/projects/[id]/cards - Move card', async () => {
      try {
        const { PUT } = await import('@/app/api/projects/[projectId]/cards/route');
        const req = createMockRequest('PUT', '/api/projects/1/cards', {
          cardId: 1,
          newBoardId: 2,
          newPosition: 0
        });
        const response = await PUT(req, { params: Promise.resolve({ projectId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('PUT /api/projects/[id]/cards (move)', true);
      } catch (error: any) {
        trackTest('PUT /api/projects/[id]/cards (move)', false, error.message);
        throw error;
      }
    });

    test('PUT /api/projects/[id]/cards/[cardId] - Update card', async () => {
      try {
        const { PUT } = await import('@/app/api/projects/[projectId]/cards/[cardId]/route');
        const req = createMockRequest('PUT', '/api/projects/1/cards/1', {
          title: 'Updated Card',
          description: 'Updated description',
          priority: 'low'
        });
        const response = await PUT(req, { params: Promise.resolve({ projectId: '1', cardId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('PUT /api/projects/[id]/cards/[cardId]', true);
      } catch (error: any) {
        trackTest('PUT /api/projects/[id]/cards/[cardId]', false, error.message);
        throw error;
      }
    });

    test('DELETE /api/projects/[id]/cards/[cardId] - Delete card', async () => {
      try {
        const { DELETE } = await import('@/app/api/projects/[projectId]/cards/[cardId]/route');
        const req = createMockRequest('DELETE', '/api/projects/1/cards/1');
        const response = await DELETE(req, { params: Promise.resolve({ projectId: '1', cardId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('DELETE /api/projects/[id]/cards/[cardId]', true);
      } catch (error: any) {
        trackTest('DELETE /api/projects/[id]/cards/[cardId]', false, error.message);
        throw error;
      }
    });
  });

  // ==================== BOARDS ====================
  describe('Boards API (/api/projects/[projectId]/boards)', () => {
    test('GET /api/projects/[id]/boards - List boards', async () => {
      try {
        const { GET } = await import('@/app/api/projects/[projectId]/boards/route');
        const req = createMockRequest('GET', '/api/projects/1/boards');
        const response = await GET(req, { params: Promise.resolve({ projectId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/projects/[id]/boards', true);
      } catch (error: any) {
        trackTest('GET /api/projects/[id]/boards', false, error.message);
        throw error;
      }
    });

    test('POST /api/projects/[id]/boards - Create board', async () => {
      try {
        const { POST } = await import('@/app/api/projects/[projectId]/boards/route');
        const req = createMockRequest('POST', '/api/projects/1/boards', {
          title: 'Test Board',
          position: 0
        });
        const response = await POST(req, { params: Promise.resolve({ projectId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('POST /api/projects/[id]/boards', true);
      } catch (error: any) {
        trackTest('POST /api/projects/[id]/boards', false, error.message);
        throw error;
      }
    });
  });

  // ==================== INVOICES ====================
  describe('Invoices API (/api/invoices)', () => {
    test('GET /api/invoices - List invoices', async () => {
      try {
        const { GET } = await import('@/app/api/invoices/route');
        const req = createMockRequest('GET', '/api/invoices');
        const response = await GET(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/invoices', true);
      } catch (error: any) {
        trackTest('GET /api/invoices', false, error.message);
        throw error;
      }
    });

    test('POST /api/invoices - Create invoice', async () => {
      try {
        const { POST } = await import('@/app/api/invoices/route');
        const req = createMockRequest('POST', '/api/invoices', {
          clientId: 1,
          invoiceNumber: 'INV-001',
          status: 'draft',
          issueDate: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          items: [{ description: 'Test Item', quantity: 1, unitPrice: 100 }],
          taxRate: 10
        });
        const response = await POST(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('POST /api/invoices', true);
      } catch (error: any) {
        trackTest('POST /api/invoices', false, error.message);
        throw error;
      }
    });

    test('GET /api/invoices/[id] - Get invoice', async () => {
      try {
        const { GET } = await import('@/app/api/invoices/[invoiceId]/route');
        const req = createMockRequest('GET', '/api/invoices/1');
        const response = await GET(req, { params: Promise.resolve({ invoiceId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/invoices/[id]', true);
      } catch (error: any) {
        trackTest('GET /api/invoices/[id]', false, error.message);
        throw error;
      }
    });

    test('PUT /api/invoices/[id] - Update invoice', async () => {
      try {
        const { PUT } = await import('@/app/api/invoices/[invoiceId]/route');
        const req = createMockRequest('PUT', '/api/invoices/1', {
          clientId: 1,
          invoiceNumber: 'INV-001-UPDATED',
          status: 'sent',
          issueDate: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          items: [{ description: 'Updated Item', quantity: 2, unitPrice: 150 }],
          taxRate: 15
        });
        const response = await PUT(req, { params: Promise.resolve({ invoiceId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('PUT /api/invoices/[id]', true);
      } catch (error: any) {
        trackTest('PUT /api/invoices/[id]', false, error.message);
        throw error;
      }
    });

    test('DELETE /api/invoices/[id] - Delete invoice', async () => {
      try {
        const { DELETE } = await import('@/app/api/invoices/[invoiceId]/route');
        const req = createMockRequest('DELETE', '/api/invoices/1');
        const response = await DELETE(req, { params: Promise.resolve({ invoiceId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('DELETE /api/invoices/[id]', true);
      } catch (error: any) {
        trackTest('DELETE /api/invoices/[id]', false, error.message);
        throw error;
      }
    });
  });

  // ==================== QUOTES ====================
  describe('Quotes API (/api/quotes)', () => {
    test('GET /api/quotes - List quotes', async () => {
      try {
        const { GET } = await import('@/app/api/quotes/route');
        const req = createMockRequest('GET', '/api/quotes');
        const response = await GET(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/quotes', true);
      } catch (error: any) {
        trackTest('GET /api/quotes', false, error.message);
        throw error;
      }
    });

    test('POST /api/quotes - Create quote', async () => {
      try {
        const { POST } = await import('@/app/api/quotes/route');
        const req = createMockRequest('POST', '/api/quotes', {
          clientId: 1,
          quoteNumber: 'QUO-001',
          status: 'draft',
          issueDate: new Date().toISOString(),
          expiryDate: new Date().toISOString(),
          items: [{ description: 'Test Item', quantity: 1, unitPrice: 100 }],
          taxRate: 10
        });
        const response = await POST(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('POST /api/quotes', true);
      } catch (error: any) {
        trackTest('POST /api/quotes', false, error.message);
        throw error;
      }
    });

    test('GET /api/quotes/[id] - Get quote', async () => {
      try {
        const { GET } = await import('@/app/api/quotes/[quoteId]/route');
        const req = createMockRequest('GET', '/api/quotes/1');
        const response = await GET(req, { params: Promise.resolve({ quoteId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/quotes/[id]', true);
      } catch (error: any) {
        trackTest('GET /api/quotes/[id]', false, error.message);
        throw error;
      }
    });

    test('PUT /api/quotes/[id] - Update quote', async () => {
      try {
        const { PUT } = await import('@/app/api/quotes/[quoteId]/route');
        const req = createMockRequest('PUT', '/api/quotes/1', {
          clientId: 1,
          quoteNumber: 'QUO-001-UPDATED',
          status: 'sent',
          issueDate: new Date().toISOString(),
          expiryDate: new Date().toISOString(),
          items: [{ description: 'Updated Item', quantity: 2, unitPrice: 150 }],
          taxRate: 15
        });
        const response = await PUT(req, { params: Promise.resolve({ quoteId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('PUT /api/quotes/[id]', true);
      } catch (error: any) {
        trackTest('PUT /api/quotes/[id]', false, error.message);
        throw error;
      }
    });

    test('DELETE /api/quotes/[id] - Delete quote', async () => {
      try {
        const { DELETE } = await import('@/app/api/quotes/[quoteId]/route');
        const req = createMockRequest('DELETE', '/api/quotes/1');
        const response = await DELETE(req, { params: Promise.resolve({ quoteId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('DELETE /api/quotes/[id]', true);
      } catch (error: any) {
        trackTest('DELETE /api/quotes/[id]', false, error.message);
        throw error;
      }
    });
  });

  // ==================== TRANSACTIONS ====================
  describe('Transactions API (/api/transactions)', () => {
    test('GET /api/transactions - List transactions', async () => {
      try {
        const { GET } = await import('@/app/api/transactions/route');
        const req = createMockRequest('GET', '/api/transactions');
        const response = await GET(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/transactions', true);
      } catch (error: any) {
        trackTest('GET /api/transactions', false, error.message);
        throw error;
      }
    });

    test('POST /api/transactions - Create transaction', async () => {
      try {
        const { POST } = await import('@/app/api/transactions/route');
        const req = createMockRequest('POST', '/api/transactions', {
          accountId: 1,
          type: 'credit',
          description: 'Test Transaction',
          amount: 100,
          currency: 'USD',
          transactionDate: new Date().toISOString()
        });
        const response = await POST(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('POST /api/transactions', true);
      } catch (error: any) {
        trackTest('POST /api/transactions', false, error.message);
        throw error;
      }
    });

    test('GET /api/transactions/[id] - Get transaction', async () => {
      try {
        const { GET } = await import('@/app/api/transactions/[transactionId]/route');
        const req = createMockRequest('GET', '/api/transactions/1');
        const response = await GET(req, { params: Promise.resolve({ transactionId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/transactions/[id]', true);
      } catch (error: any) {
        trackTest('GET /api/transactions/[id]', false, error.message);
        throw error;
      }
    });

    test('PUT /api/transactions/[id] - Update transaction', async () => {
      try {
        const { PUT } = await import('@/app/api/transactions/[transactionId]/route');
        const req = createMockRequest('PUT', '/api/transactions/1', {
          accountId: 1,
          type: 'debit',
          description: 'Updated Transaction',
          amount: 200,
          currency: 'USD',
          transactionDate: new Date().toISOString()
        });
        const response = await PUT(req, { params: Promise.resolve({ transactionId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('PUT /api/transactions/[id]', true);
      } catch (error: any) {
        trackTest('PUT /api/transactions/[id]', false, error.message);
        throw error;
      }
    });

    test('DELETE /api/transactions/[id] - Delete transaction', async () => {
      try {
        const { DELETE } = await import('@/app/api/transactions/[transactionId]/route');
        const req = createMockRequest('DELETE', '/api/transactions/1');
        const response = await DELETE(req, { params: Promise.resolve({ transactionId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('DELETE /api/transactions/[id]', true);
      } catch (error: any) {
        trackTest('DELETE /api/transactions/[id]', false, error.message);
        throw error;
      }
    });
  });

  // ==================== EXPENSES ====================
  describe('Expenses API (/api/expenses)', () => {
    test('GET /api/expenses - List expenses', async () => {
      try {
        const { GET } = await import('@/app/api/expenses/route');
        const req = createMockRequest('GET', '/api/expenses');
        const response = await GET(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/expenses', true);
      } catch (error: any) {
        trackTest('GET /api/expenses', false, error.message);
        throw error;
      }
    });

    test('POST /api/expenses - Create expense', async () => {
      try {
        const { POST } = await import('@/app/api/expenses/route');
        const req = createMockRequest('POST', '/api/expenses', {
          description: 'Test Expense',
          amount: 50,
          currency: 'USD',
          expenseDate: new Date().toISOString(),
          categoryId: 1
        });
        const response = await POST(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('POST /api/expenses', true);
      } catch (error: any) {
        trackTest('POST /api/expenses', false, error.message);
        throw error;
      }
    });

    test('PUT /api/expenses/[id] - Update expense', async () => {
      try {
        const { PUT } = await import('@/app/api/expenses/[expenseId]/route');
        const req = createMockRequest('PUT', '/api/expenses/1', {
          description: 'Updated Expense',
          amount: 100,
          currency: 'USD',
          expenseDate: new Date().toISOString(),
          categoryId: 1
        });
        const response = await PUT(req, { params: Promise.resolve({ expenseId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('PUT /api/expenses/[id]', true);
      } catch (error: any) {
        trackTest('PUT /api/expenses/[id]', false, error.message);
        throw error;
      }
    });

    test('DELETE /api/expenses/[id] - Delete expense', async () => {
      try {
        const { DELETE } = await import('@/app/api/expenses/[expenseId]/route');
        const req = createMockRequest('DELETE', '/api/expenses/1');
        const response = await DELETE(req, { params: Promise.resolve({ expenseId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('DELETE /api/expenses/[id]', true);
      } catch (error: any) {
        trackTest('DELETE /api/expenses/[id]', false, error.message);
        throw error;
      }
    });
  });

  // ==================== INCOME ====================
  describe('Income API (/api/income)', () => {
    test('GET /api/income - List income', async () => {
      try {
        const { GET } = await import('@/app/api/income/route');
        const req = createMockRequest('GET', '/api/income');
        const response = await GET(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/income', true);
      } catch (error: any) {
        trackTest('GET /api/income', false, error.message);
        throw error;
      }
    });

    test('POST /api/income - Create income', async () => {
      try {
        const { POST } = await import('@/app/api/income/route');
        const req = createMockRequest('POST', '/api/income', {
          description: 'Test Income',
          amount: 1000,
          currency: 'USD',
          incomeDate: new Date().toISOString(),
          categoryId: 1
        });
        const response = await POST(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('POST /api/income', true);
      } catch (error: any) {
        trackTest('POST /api/income', false, error.message);
        throw error;
      }
    });

    test('PUT /api/income/[id] - Update income', async () => {
      try {
        const { PUT } = await import('@/app/api/income/[incomeId]/route');
        const req = createMockRequest('PUT', '/api/income/1', {
          description: 'Updated Income',
          amount: 2000,
          currency: 'USD',
          incomeDate: new Date().toISOString(),
          categoryId: 1
        });
        const response = await PUT(req, { params: Promise.resolve({ incomeId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('PUT /api/income/[id]', true);
      } catch (error: any) {
        trackTest('PUT /api/income/[id]', false, error.message);
        throw error;
      }
    });

    test('DELETE /api/income/[id] - Delete income', async () => {
      try {
        const { DELETE } = await import('@/app/api/income/[incomeId]/route');
        const req = createMockRequest('DELETE', '/api/income/1');
        const response = await DELETE(req, { params: Promise.resolve({ incomeId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('DELETE /api/income/[id]', true);
      } catch (error: any) {
        trackTest('DELETE /api/income/[id]', false, error.message);
        throw error;
      }
    });
  });

  // ==================== EXPENSE CATEGORIES ====================
  describe('Expense Categories API (/api/expense-categories)', () => {
    test('GET /api/expense-categories - List categories', async () => {
      try {
        const { GET } = await import('@/app/api/expense-categories/route');
        const req = createMockRequest('GET', '/api/expense-categories');
        const response = await GET(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/expense-categories', true);
      } catch (error: any) {
        trackTest('GET /api/expense-categories', false, error.message);
        throw error;
      }
    });

    test('POST /api/expense-categories - Create category', async () => {
      try {
        const { POST } = await import('@/app/api/expense-categories/route');
        const req = createMockRequest('POST', '/api/expense-categories', {
          name: 'Test Category',
          description: 'A test expense category'
        });
        const response = await POST(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('POST /api/expense-categories', true);
      } catch (error: any) {
        trackTest('POST /api/expense-categories', false, error.message);
        throw error;
      }
    });

    test('PUT /api/expense-categories/[id] - Update category', async () => {
      try {
        const { PUT } = await import('@/app/api/expense-categories/[categoryId]/route');
        const req = createMockRequest('PUT', '/api/expense-categories/1', {
          name: 'Updated Category',
          description: 'Updated description'
        });
        const response = await PUT(req, { params: Promise.resolve({ categoryId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('PUT /api/expense-categories/[id]', true);
      } catch (error: any) {
        trackTest('PUT /api/expense-categories/[id]', false, error.message);
        throw error;
      }
    });

    test('DELETE /api/expense-categories/[id] - Delete category', async () => {
      try {
        const { DELETE } = await import('@/app/api/expense-categories/[categoryId]/route');
        const req = createMockRequest('DELETE', '/api/expense-categories/1');
        const response = await DELETE(req, { params: Promise.resolve({ categoryId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('DELETE /api/expense-categories/[id]', true);
      } catch (error: any) {
        trackTest('DELETE /api/expense-categories/[id]', false, error.message);
        throw error;
      }
    });
  });

  // ==================== INCOME CATEGORIES ====================
  describe('Income Categories API (/api/income-categories)', () => {
    test('GET /api/income-categories - List categories', async () => {
      try {
        const { GET } = await import('@/app/api/income-categories/route');
        const req = createMockRequest('GET', '/api/income-categories');
        const response = await GET(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/income-categories', true);
      } catch (error: any) {
        trackTest('GET /api/income-categories', false, error.message);
        throw error;
      }
    });

    test('POST /api/income-categories - Create category', async () => {
      try {
        const { POST } = await import('@/app/api/income-categories/route');
        const req = createMockRequest('POST', '/api/income-categories', {
          name: 'Test Income Category',
          description: 'A test income category'
        });
        const response = await POST(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('POST /api/income-categories', true);
      } catch (error: any) {
        trackTest('POST /api/income-categories', false, error.message);
        throw error;
      }
    });
  });

  // ==================== CALENDAR ====================
  describe('Calendar API (/api/calendar)', () => {
    test('GET /api/calendar - List events', async () => {
      try {
        const { GET } = await import('@/app/api/calendar/route');
        const req = createMockRequest('GET', '/api/calendar');
        const response = await GET(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/calendar', true);
      } catch (error: any) {
        trackTest('GET /api/calendar', false, error.message);
        throw error;
      }
    });

    test('POST /api/calendar - Create event', async () => {
      try {
        const { POST } = await import('@/app/api/calendar/route');
        const req = createMockRequest('POST', '/api/calendar', {
          title: 'Test Event',
          description: 'A test event',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          allDay: false
        });
        const response = await POST(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('POST /api/calendar', true);
      } catch (error: any) {
        trackTest('POST /api/calendar', false, error.message);
        throw error;
      }
    });

    test('PUT /api/calendar/[id] - Update event', async () => {
      try {
        const { PUT } = await import('@/app/api/calendar/[eventId]/route');
        const req = createMockRequest('PUT', '/api/calendar/1', {
          title: 'Updated Event',
          description: 'Updated description',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          allDay: true
        });
        const response = await PUT(req, { params: Promise.resolve({ eventId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('PUT /api/calendar/[id]', true);
      } catch (error: any) {
        trackTest('PUT /api/calendar/[id]', false, error.message);
        throw error;
      }
    });

    test('DELETE /api/calendar/[id] - Delete event', async () => {
      try {
        const { DELETE } = await import('@/app/api/calendar/[eventId]/route');
        const req = createMockRequest('DELETE', '/api/calendar/1');
        const response = await DELETE(req, { params: Promise.resolve({ eventId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('DELETE /api/calendar/[id]', true);
      } catch (error: any) {
        trackTest('DELETE /api/calendar/[id]', false, error.message);
        throw error;
      }
    });
  });

  // ==================== API TOKENS ====================
  describe('API Tokens API (/api/api-tokens)', () => {
    test('GET /api/api-tokens - List tokens', async () => {
      try {
        const { GET } = await import('@/app/api/api-tokens/route');
        const req = createMockRequest('GET', '/api/api-tokens');
        const response = await GET(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/api-tokens', true);
      } catch (error: any) {
        trackTest('GET /api/api-tokens', false, error.message);
        throw error;
      }
    });

    test('POST /api/api-tokens - Create token', async () => {
      try {
        const { POST } = await import('@/app/api/api-tokens/route');
        const req = createMockRequest('POST', '/api/api-tokens', {
          name: 'Test Token',
          scopes: ['read', 'write']
        });
        const response = await POST(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('POST /api/api-tokens', true);
      } catch (error: any) {
        trackTest('POST /api/api-tokens', false, error.message);
        throw error;
      }
    });

    test('DELETE /api/api-tokens/[id] - Delete token', async () => {
      try {
        const { DELETE } = await import('@/app/api/api-tokens/[tokenId]/route');
        const req = createMockRequest('DELETE', '/api/api-tokens/1');
        const response = await DELETE(req, { params: Promise.resolve({ tokenId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('DELETE /api/api-tokens/[id]', true);
      } catch (error: any) {
        trackTest('DELETE /api/api-tokens/[id]', false, error.message);
        throw error;
      }
    });
  });

  // ==================== USERS ====================
  describe('Users API (/api/users)', () => {
    test('GET /api/users - List users', async () => {
      try {
        const { GET } = await import('@/app/api/users/route');
        const req = createMockRequest('GET', '/api/users');
        const response = await GET(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/users', true);
      } catch (error: any) {
        trackTest('GET /api/users', false, error.message);
        throw error;
      }
    });

    test('PUT /api/users/[id] - Update user', async () => {
      try {
        const { PUT } = await import('@/app/api/users/[userId]/route');
        const req = createMockRequest('PUT', '/api/users/1', {
          name: 'Updated User',
          email: 'updated@example.com'
        });
        const response = await PUT(req, { params: Promise.resolve({ userId: '1' }) });
        
        expect(response.status).toBeLessThan(500);
        trackTest('PUT /api/users/[id]', true);
      } catch (error: any) {
        trackTest('PUT /api/users/[id]', false, error.message);
        throw error;
      }
    });
  });

  // ==================== PROFILE ====================
  describe('Profile API (/api/profile)', () => {
    test('GET /api/profile - Get profile', async () => {
      try {
        const { GET } = await import('@/app/api/profile/route');
        const req = createMockRequest('GET', '/api/profile');
        const response = await GET(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/profile', true);
      } catch (error: any) {
        trackTest('GET /api/profile', false, error.message);
        throw error;
      }
    });

    test('PUT /api/profile - Update profile', async () => {
      try {
        const { PUT } = await import('@/app/api/profile/route');
        const req = createMockRequest('PUT', '/api/profile', {
          name: 'Updated Profile',
          email: 'profile@example.com'
        });
        const response = await PUT(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('PUT /api/profile', true);
      } catch (error: any) {
        trackTest('PUT /api/profile', false, error.message);
        throw error;
      }
    });
  });

  // ==================== HEALTH CHECK ====================
  describe('Health API (/api/health)', () => {
    test('GET /api/health - Health check', async () => {
      try {
        const { GET } = await import('@/app/api/health/route');
        const req = createMockRequest('GET', '/api/health');
        const response = await GET(req);
        
        expect(response.status).toBeLessThan(500);
        trackTest('GET /api/health', true);
      } catch (error: any) {
        trackTest('GET /api/health', false, error.message);
        throw error;
      }
    });
  });

  // ==================== TEST SUMMARY ====================
  afterAll(() => {
    console.log('\n');
    console.log('='.repeat(60));
    console.log('API TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;
    const total = testResults.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log(`\nTotal Tests: ${total}`);
    console.log(`Passed: ${passed} (${passRate}%)`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n--- FAILED TESTS ---');
      testResults.filter(r => !r.passed).forEach(r => {
        console.log(`\n❌ ${r.name}`);
        console.log(`   Error: ${r.error}`);
      });
    }
    
    console.log('\n--- PASSED TESTS ---');
    testResults.filter(r => r.passed).forEach(r => {
      console.log(`✅ ${r.name}`);
    });
    
    console.log('\n' + '='.repeat(60));
  });
});
