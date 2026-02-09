import * as schema from "./schema/index.js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
