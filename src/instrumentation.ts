
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // We import dynamically to avoid issues with edge runtime if this file is included there
      // although register runs in nodejs env.
      const { db } = await import('./lib/db');
      const { users } = await import('./lib/db/schema');
      const { eq } = await import('drizzle-orm');
      const bcrypt = (await import('bcryptjs')).default;
      
      const email = 'elisbrown@sigalix.net';
      
      console.log('[Instrumentation] Checking for Super Admin user...');
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (existingUser.length === 0) {
        console.log('[Instrumentation] Creating Super Admin user...');
        const passwordHash = await bcrypt.hash('12345678', 10);
        
        await db.insert(users).values({
          email,
          password: passwordHash,
          name: 'Elisbrown Sigala Sunyin',
          role: 'admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log('[Instrumentation] Super Admin created.');
      }
    } catch (error) {
      // Squelch errors during build/startup if DB isn't ready
      console.error('[Instrumentation] Failed to seed admin:', error);
    }
  }
}
