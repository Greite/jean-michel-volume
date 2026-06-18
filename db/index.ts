import { DatabaseSync } from 'node:sqlite';

import { drizzle } from 'drizzle-orm/node-sqlite';

import * as schema from './schema';

const sqlite = new DatabaseSync(process.env.DATABASE_PATH ?? './data/sqlite.db');

export const db = drizzle({ client: sqlite, schema });
