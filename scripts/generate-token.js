const Database = require("better-sqlite3");
const { randomBytes } = require("crypto");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// Configuration
// Try to find the database file
const possibleDbPaths = [
  process.env.DATABASE_PATH,
  "./data/sigalix.db",
  "sqlite.db",
  "prisma/dev.db",
  "local.db",
].filter(Boolean);

let dbPath = "./data/sigalix.db"; // Default fallback

for (const p of possibleDbPaths) {
  // Fix relative paths
  const resolvedPath = path.isAbsolute(p) ? p : path.join(process.cwd(), p);

  if (fs.existsSync(resolvedPath)) {
    console.error(`Found database at: ${resolvedPath}`);
    dbPath = resolvedPath;
    break;
  }
}

// Check .env for DB_URL if needed, but for now assume sqlite.db based on better-sqlite3 usage

console.error(`Using database: ${dbPath}`);
const db = new Database(dbPath);

// Token Logic
const API_TOKEN_PREFIX = "skt_";
const PREFIX_RANDOM_LENGTH = 8;
const SECRET_LENGTH = 32;
const SALT_ROUNDS = 10;

function generateRandomString(length) {
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

async function main() {
  try {
    // 1. Ensure User and Company exist
    let user = db.prepare("SELECT id, company_id FROM users LIMIT 1").get();
    let userId;
    let companyId;

    if (!user) {
      console.log("No user found, creating dummy user...");
      // Create company first
      const companyResult = db
        .prepare(
          "INSERT INTO companies (name, created_at, updated_at) VALUES (?, ?, ?)",
        )
        .run(
          "Test Company",
          new Date().toISOString(),
          new Date().toISOString(),
        );
      companyId = companyResult.lastInsertRowid;

      // Create user
      const userResult = db
        .prepare(
          "INSERT INTO users (email, name, password, company_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          "test@example.com",
          "Test User",
          "hash",
          companyId,
          "admin",
          new Date().toISOString(),
          new Date().toISOString(),
        );
      userId = userResult.lastInsertRowid;
    } else {
      userId = user.id;
      companyId = user.company_id || 1; // Fallback
      if (!user.company_id) {
        // Create company if zero
        const companyResult = db
          .prepare(
            "INSERT INTO companies (name, created_at, updated_at) VALUES (?, ?, ?)",
          )
          .run(
            "Test Company",
            new Date().toISOString(),
            new Date().toISOString(),
          );
        companyId = companyResult.lastInsertRowid;
        db.prepare("UPDATE users SET company_id = ? WHERE id = ?").run(
          companyId,
          userId,
        );
      }
    }

    // 2. Generate Token
    const randomPrefixPart = generateRandomString(PREFIX_RANDOM_LENGTH);
    const prefix = `${API_TOKEN_PREFIX}${randomPrefixPart}`;
    const secret = generateRandomString(SECRET_LENGTH);
    const fullToken = `${prefix}_${secret}`;

    // Hash secret
    const tokenHash = await bcrypt.hash(secret, SALT_ROUNDS);

    // 3. Insert Token
    db.prepare(
      `
      INSERT INTO api_tokens (
        user_id, company_id, name, token_prefix, token_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      userId,
      companyId,
      "Test Script Token",
      prefix,
      tokenHash,
      new Date().toISOString(),
    );

    // 4. Output ONLY the token to stdout (last line) so shell script can grab it
    // We log info to stderr so it doesn't pollute the token output
    console.error(`Token created for User ${userId}, Company ${companyId}`);
    console.log(fullToken);
  } catch (error) {
    console.error("Error generating token:", error);
    process.exit(1);
  }
}

main();
