// PostgreSQL connection pool
// Adjust credentials/port to match your local Postgres installation
const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "bankdb",
  password: "Pratik@1997",
  port: 8080,
});

module.exports = pool;
