
import { saveLoginToken } from '@/lib/auth/client/utils';
import { db } from '@/lib/db';
import { clients, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Verifying saveLoginToken fix...');
  try {
    // Ensure we have a company and client to test with
    let [company] = await db.select().from(companies).limit(1);
    if (!company) {
      console.log('Creating dummy company...');
      const [result] = await db.insert(companies).values({ name: 'Test Company' });
      [company] = await db.select().from(companies).where(eq(companies.id, result.insertId));
    }

    let [client] = await db.select().from(clients).limit(1);
    if (!client) {
      console.log('Creating dummy client...');
      const [result] = await db.insert(clients).values({
        companyId: company.id,
        name: 'Test Client',
        email: 'test@client.com'
      });
      [client] = await db.select().from(clients).where(eq(clients.id, result.insertId));
    }

    console.log(`Testing with Client ID: ${client.id}, Email: ${client.email}`);
    const token = await saveLoginToken(client.id, client.email || 'test@client.com');
    console.log('✅ Token generated successfully:', token);
  } catch (error) {
    console.error('❌ Error generating token:', error);
  }
  process.exit(0);
}

main();
