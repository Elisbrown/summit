import 'dotenv/config';
import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
  const email = 'elisbrown@sigalix.net';
  const rawPassword = '12345678';

  try {
    console.log('Checking for Super Admin user...');
    
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser.length > 0) {
      console.log('✅ Super Admin already exists.');
      return;
    }

    // Create user
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    
    console.log('Creating Super Admin user...');
    const [newUser] = await db.insert(users).values({
      email,
      password: passwordHash,
      name: 'Elisbrown Sigala Sunyin',
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();

    console.log(`✅ Super Admin created successfully: ${newUser.email}`);

  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedAdmin();
