import { neon } from "@neondatabase/serverless"

// Create a SQL client with the database URL from environment variables
export const sql = neon(process.env.DATABASE_URL!)

// Helper function for raw SQL queries using tagged template literals
export async function executeQuery(queryText: string, params: any[] = []) {
  // Convert the conventional query to a tagged template query
  let query = queryText

  // Replace $1, $2, etc. with the actual values
  params.forEach((param, index) => {
    const placeholder = `$${index + 1}`
    // Escape single quotes in string parameters
    const value = typeof param === "string" ? param.replace(/'/g, "''") : param
    query = query.replace(
      new RegExp(placeholder, "g"),
      typeof param === "string" ? `'${value}'` : param === null ? "NULL" : String(param),
    )
  })

  return sql`${query}`
}
