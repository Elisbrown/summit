import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

// Get database URL from environment variable
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required. Format: mysql://user:password@host:port/database');
}

// Create MySQL connection pool with speed optimizations
const pool = mysql.createPool({
  uri: databaseUrl,
  // Connection pool settings for speed
  connectionLimit: 10,
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  // Timeout settings
  connectTimeout: 10000,
  // Performance optimizations
  namedPlaceholders: true,
  decimalNumbers: true,
});

// Create Drizzle instance with schema
export const db = drizzle(pool, { schema, mode: 'default' });

// Export the pool for direct queries if needed
export const mysqlPool = pool;

// Initialize database - tables are managed by Drizzle migrations/push
export async function initializeDatabase() {
  try {
    // Test the connection
    const connection = await pool.getConnection();
    console.log('MySQL database connected successfully');
    connection.release();
  } catch (error) {
    console.error('Failed to connect to MySQL database:', error);
    throw error;
  }
}

// Auto-initialize on import
initializeDatabase().catch((error) => {
  console.error('Failed to initialize MySQL database:', error);
});