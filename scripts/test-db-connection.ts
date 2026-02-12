
import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env or .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testConnection() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('❌ DATABASE_URL is not defined in .env or .env.local');
        process.exit(1);
    }

    console.log('Testing database connection...');
    // Mask the password in logs
    const maskedUrl = url.replace(/:([^:@]+)@/, ':****@');
    console.log(`Connecting to: ${maskedUrl}`);

    try {
        const connection = await createConnection(url);
        console.log('✅ Successfully connected to the database!');
        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to connect to the database:');
        console.error(error);
        process.exit(1);
    }
}

testConnection();
