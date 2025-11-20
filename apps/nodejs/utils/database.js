import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

/**
 * Cleans a database connection string by removing shell command artifacts
 * (e.g., removes "psql '" prefix and trailing "'")
 */
function cleanConnectionString(connectionString) {
  if (!connectionString) return connectionString;
  return connectionString
    .trim()
    .replace(/^psql\s+['"]?/, '') // Remove "psql '" or "psql " prefix
    .replace(/['"]$/, ''); // Remove trailing quote
}

// Configure Neon to use WebSocket
neonConfig.webSocketConstructor = ws;

let pool = null;

// Lazy initialization of database pool
function getPool() {
  if (!pool) {
    const connectionString = cleanConnectionString(process.env.DATABASE_URL);
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required. Please set it in your .env file.');
    }
    
    pool = new Pool({
      connectionString,
    });
  }
  return pool;
}

// SQL query helper function
export async function sql(query, params = []) {
  const dbPool = getPool();
  const result = await dbPool.query(query, params);
  return result.rows;
}

// Export pool getter for direct access if needed
export { getPool as pool };

export default getPool;

