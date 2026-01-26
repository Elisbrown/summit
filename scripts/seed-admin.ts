import 'dotenv/config';
import { db } from '../src/lib/db';
import { users, companies } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
  const email = 'elisbrown@sigalix.net';
  const rawPassword = '12345678';
  const companyName = 'Sigalix';

  try {
    console.log('Checking for existing company...');
    
    // Check if company exists
    let [company] = await db.select().from(companies).limit(1);
    
    if (!company) {
      console.log('Creating default company...');
      [company] = await db.insert(companies).values({
        name: companyName,
        defaultCurrency: 'XAF',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();
      console.log(`✅ Company created: ${company.name} (ID: ${company.id})`);
    } else {
      console.log(`✅ Company already exists: ${company.name} (ID: ${company.id})`);
    }

    console.log('Checking for Super Admin user...');
    
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser.length > 0) {
      // Update existing user to have companyId if missing
      if (!existingUser[0].companyId) {
        console.log('Updating existing user with companyId...');
        await db.update(users)
          .set({ companyId: company.id, updatedAt: new Date().toISOString() })
          .where(eq(users.id, existingUser[0].id));
        console.log('✅ Super Admin updated with companyId.');
      } else {
        console.log('✅ Super Admin already exists with companyId.');
      }
      return;
    }

    // Create user with companyId
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    
    console.log('Creating Super Admin user...');
    const [newUser] = await db.insert(users).values({
      email,
      password: passwordHash,
      name: 'Elisbrown Sigala Sunyin',
      role: 'admin',
      companyId: company.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();

    console.log(`✅ Super Admin created successfully: ${newUser.email} (Company ID: ${newUser.companyId})`);

  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedAdmin();
