
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function verifySchema() {
    try {
        const connection = await mysql.createConnection(process.env.DATABASE_URL);
        console.log('✅ Connected.');

        console.log('Checking accounts table...');
        const [rows] = await connection.execute('SHOW COLUMNS FROM accounts');
        console.log('Columns in accounts table:');
        rows.forEach(row => {
            console.log(`- ${row.Field} (${row.Type})`);
        });

        await connection.end();
    } catch (error) {
        console.error('❌ Error verifying schema:', error.message);
    }
}

verifySchema();
