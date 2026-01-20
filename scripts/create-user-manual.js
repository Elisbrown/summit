const bcrypt = require("bcryptjs");
const postgres = require("postgres");
require("dotenv").config();

async function createUser() {
  const email = process.argv[2] || "admin@example.com";
  const password = process.argv[3] || "password123";
  const name = process.argv[4] || "Admin User";
  const role = process.argv[5] || "admin";

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set in .env");
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL);

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if company exists, create one if not
    let companyId = 1;
    const companies = await sql`SELECT id FROM companies LIMIT 1`;
    if (companies.length === 0) {
      const [newCompany] = await sql`
        INSERT INTO companies (name, created_at, updated_at)
        VALUES ('Default Company', NOW(), NOW())
        RETURNING id
      `;
      companyId = newCompany.id;
      console.log(`Created new company with ID: ${companyId}`);
    } else {
      companyId = companies[0].id;
      console.log(`Using existing company with ID: ${companyId}`);
    }

    const [newUser] = await sql`
      INSERT INTO users (name, email, password, role, company_id, created_at, updated_at)
      VALUES (${name}, ${email}, ${hashedPassword}, ${role}, ${companyId}, NOW(), NOW())
      RETURNING id
    `;

    console.log(`Successfully created user: ${email} (ID: ${newUser.id})`);
  } catch (error) {
    console.error("Error creating user:", error);
  } finally {
    await sql.end();
  }
}

createUser();
