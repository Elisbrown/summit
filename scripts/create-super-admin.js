
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const EMAIL = 'elisbrown@sigalix.net';
const PASSWORD = '12345678';
const COMPANY_NAME = 'Sigalix HQ'; // Default company name

async function createSuperAdmin() {
    let connection;
    try {
        connection = await mysql.createConnection(process.env.DATABASE_URL);
        console.log('✅ Connected to database.');

        // 1. Check/Create Company
        console.log('Checking for existing company...');
        const [companies] = await connection.execute('SELECT id FROM companies LIMIT 1');

        let companyId;
        if (companies.length > 0) {
            companyId = companies[0].id;
            console.log(`Using existing company ID: ${companyId}`);
        } else {
            console.log('No company found. Creating default company...');
            const [result] = await connection.execute(
                'INSERT INTO companies (name, created_at, updated_at, soft_delete) VALUES (?, NOW(), NOW(), false)',
                [COMPANY_NAME]
            );
            companyId = result.insertId;
            console.log(`Created new company with ID: ${companyId}`);
        }

        // 2. Hash Password
        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(PASSWORD, 10);

        // 3. Create/Update User
        console.log(`Creating/Updating user ${EMAIL}...`);

        // Check if user exists
        const [users] = await connection.execute('SELECT id FROM users WHERE email = ?', [EMAIL]);

        if (users.length > 0) {
            // Update existing user
            console.log('User exists. Updating password and role...');
            await connection.execute(
                'UPDATE users SET password = ?, role = ?, company_id = ?, soft_delete = false, updated_at = NOW() WHERE email = ?',
                [hashedPassword, 'admin', companyId, EMAIL]
            );
            console.log('User updated successfully.');
        } else {
            // Create new user
            console.log('User does not exist. Creating new user...');
            await connection.execute(
                'INSERT INTO users (email, password, name, role, company_id, created_at, updated_at, soft_delete) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), false)',
                [EMAIL, hashedPassword, 'Elis Brown', 'admin', companyId]
            );
            console.log('User created successfully.');
        }

        console.log('\n🎉 Super Admin Account Ready:');
        console.log(`Email: ${EMAIL}`);
        console.log(`Password: ${PASSWORD}`);

    } catch (error) {
        console.error('❌ Error creating super admin:', error);
    } finally {
        if (connection) await connection.end();
    }
}

createSuperAdmin();
