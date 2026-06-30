import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const dbCredentials = process.env.DATABASE_URL 
  ? { url: process.env.DATABASE_URL }
  : {
      host: process.env.SQL_HOST || 'localhost',
      database: process.env.SQL_DB_NAME || 'postgres',
      user: process.env.SQL_ADMIN_USER || process.env.SQL_USER || 'postgres',
      password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || 'postgres',
      ssl: false,
    };

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: dbCredentials as any,
  verbose: true,
});
