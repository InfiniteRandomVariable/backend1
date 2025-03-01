import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import { type DB } from "./kysely-types";
import pg from "pg";

import dotenv from "dotenv"; // Import dotenv to load environment variables
dotenv.config(); // Load environment variables from .env file

import "dotenv/config";
const { Pool } = pg;
export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL as string,
    }),
  }),
  plugins: [new CamelCasePlugin()],
});

// import type { Database } from "./types";

// const dialect = new PostgresJSDialect({
//   postgres,
//   database: process.env.POSTGRES_DATABASE,
//   host: process.env.POSTGRES_HOST,
//   password: process.env.POSTGRES_PASSWORD,
//   port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
//   user: process.env.POSTGRES_USER,
// });
