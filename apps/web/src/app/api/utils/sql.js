import { neon } from '@neondatabase/serverless';

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

const NullishQueryFunction = () => {
  throw new Error(
    'No database connection string was provided to `neon()`. Perhaps process.env.DATABASE_URL has not been set'
  );
};
NullishQueryFunction.transaction = () => {
  throw new Error(
    'No database connection string was provided to `neon()`. Perhaps process.env.DATABASE_URL has not been set'
  );
};
const sql = process.env.DATABASE_URL ? neon(cleanConnectionString(process.env.DATABASE_URL)) : NullishQueryFunction;

export default sql;