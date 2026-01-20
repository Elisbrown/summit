
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

async function main() {
  console.log('Listing users...');
  const allUsers = await db.select().from(users);
  
  if (allUsers.length === 0) {
    console.log('No users found.');
  } else {
    console.table(allUsers.map(u => ({ 
      id: u.id, 
      email: u.email, 
      role: u.role, 
      companyId: u.companyId 
    })));
  }
  process.exit(0);
}

main();
