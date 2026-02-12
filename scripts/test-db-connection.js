
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env or .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testConnection() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('❌ DATABASE_URL is not defined in .env or .env.local');
        // If not found, check providing it inline or assume it is in process.env already
        if (!process.env.DATABASE_URL) {
            process.exit(1);
        }
    }

    console.log('Testing database connection...');
    // Mask the password in logs
    const maskedUrl = (process.env.DATABASE_URL || '').replace(/:([^:@]+)@/, ':****@');
    console.log(`Connecting to: ${maskedUrl}`);

    try {
        const connection = await mysql.createConnection(process.env.DATABASE_URL);
        console.log('✅ Successfully connected to the database!');
        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to connect to the database:');
        console.error(error.message);
        process.exit(1);
    }
}

testConnection();
