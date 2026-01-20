
import { saveLoginToken } from '@/lib/auth/client/utils';
import { db } from '@/lib/db';
import { clients, companies } from '@/lib/db/schema';

async function main() {
  console.log('Verifying saveLoginToken fix...');
  try {
    // Ensure we have a company and client to test with
    let [company] = await db.select().from(companies).limit(1);
    if (!company) {
      console.log('Creating dummy company...');
      [company] = await db.insert(companies).values({ name: 'Test Company' }).returning();
    }

    let [client] = await db.select().from(clients).limit(1);
    if (!client) {
      console.log('Creating dummy client...');
      [client] = await db.insert(clients).values({ 
        companyId: company.id, 
        name: 'Test Client',
        email: 'test@client.com'
      }).returning();
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
