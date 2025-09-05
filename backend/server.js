// Express application and core middleware setup
// - Express handles routing
// - CORS allows the React dev server (5173) to call this API
// - pool is the PostgreSQL client (see db.js)
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint for quick liveness verification
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Example route mount (not used by the UI, kept as sample)
const referralRoutes = require("./routes/referralRoutes");
app.use("/api/referrals", referralRoutes);

// Ensure accounts table exists (simple bootstrap on server start)
async function ensureSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        introducer_id INTEGER,
        beneficiary_id INTEGER
      );
    `);
  } catch (e) {
    console.error("Schema init error", e);
  }
}

// Create a single account
// Request: { account_id, introducer_id }
// Behavior:
// 1) Insert row with beneficiary_id = NULL
// 2) Count how many referrals the introducer has (including this one)
// 3) If odd referral → beneficiary = introducer
//    If even referral → beneficiary = (beneficiary of introducer's introducer)
// 4) Update the row with computed beneficiary_id and return summary
app.post("/addAccount", async (req, res) => {
  const account_id = Number(req.body?.account_id);
  const introducer_id = Number(req.body?.introducer_id);

  if (!Number.isFinite(account_id) || !Number.isFinite(introducer_id)) {
    return res
      .status(400)
      .json({ error: "account_id and introducer_id must be numbers" });
  }

  try {
    // Step 1: Insert account with provided id and introducer (beneficiary null for now)
    await pool.query(
      "INSERT INTO accounts (id, introducer_id, beneficiary_id) VALUES ($1, $2, NULL)",
      [account_id, introducer_id]
    );

    // Step 2: Apply odd/even rule based on introducer's referral count
    // Count how many accounts this introducer has referred (including the one just inserted)
    const { rows: cntRows } = await pool.query(
      "SELECT COUNT(*)::int AS cnt FROM accounts WHERE introducer_id = $1",
      [introducer_id]
    );
    const referralCount = cntRows[0]?.cnt ?? 1;

    // Decide beneficiary according to the business rule
    let beneficiaryId = null;
    if (referralCount % 2 === 1) {
      // Odd referral → introducer is beneficiary
      beneficiaryId = introducer_id;
    } else {
      // Even referral → beneficiary of introducer's introducer
      const introducerRow = await pool.query(
        "SELECT introducer_id FROM accounts WHERE id = $1",
        [introducer_id]
      );
      const introducerIntroducerId =
        introducerRow.rows[0]?.introducer_id ?? null;
      if (introducerIntroducerId !== null) {
        const benRow = await pool.query(
          "SELECT beneficiary_id FROM accounts WHERE id = $1",
          [introducerIntroducerId]
        );
        beneficiaryId = benRow.rows[0]?.beneficiary_id ?? null;
      } else {
        beneficiaryId = null;
      }
    }

    // Step 3: Persist computed beneficiary back to the new account
    await pool.query("UPDATE accounts SET beneficiary_id = $1 WHERE id = $2", [
      beneficiaryId,
      account_id,
    ]);

    res.json({
      message: "Account created successfully",
      id: account_id,
      introducer_id,
      beneficiary_id: beneficiaryId,
    });
  } catch (err) {
    console.error(err);
    // If duplicate key or invalid foreign logic, surface a friendly message
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ error: "Account with this account_id already exists" });
    }
    res.status(500).json({ error: "Database error" });
  }
});

// Start HTTP server after ensuring schema
// ensureSchema().finally(() => {
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// });

// Read all accounts (used by the React table)
app.get("/accounts", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id AS account_id, introducer_id, beneficiary_id FROM accounts ORDER BY id ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Bulk create accounts (transactional). Body is an array of items:
// [ { account_id, introducer_id }, ... ]
// Each item applies the same referral rule as /addAccount.
app.post("/addAccountsBulk", async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [];
  if (items.length === 0) {
    return res.status(400).json({ error: "Body must be a non-empty array" });
  }

  const client = await pool.connect();
  const results = [];
  try {
    // Run all inserts in a single transaction
    await client.query("BEGIN");

    for (const item of items) {
      const account_id = Number(item?.account_id);
      const introducer_id = Number(item?.introducer_id);
      if (!Number.isFinite(account_id) || !Number.isFinite(introducer_id)) {
        throw new Error(
          "Invalid item: account_id and introducer_id must be numbers"
        );
      }

      // Insert with null beneficiary first
      await client.query(
        "INSERT INTO accounts (id, introducer_id, beneficiary_id) VALUES ($1, $2, NULL)",
        [account_id, introducer_id]
      );

      // Compute beneficiary using introducer's referral count (including this one)
      const cntRes = await client.query(
        "SELECT COUNT(*)::int AS cnt FROM accounts WHERE introducer_id = $1",
        [introducer_id]
      );
      const referralCount = cntRes.rows[0]?.cnt ?? 1;

      let beneficiaryId = null;
      if (referralCount % 2 === 1) {
        beneficiaryId = introducer_id;
      } else {
        const introRow = await client.query(
          "SELECT introducer_id FROM accounts WHERE id = $1",
          [introducer_id]
        );
        const introducerIntroducerId = introRow.rows[0]?.introducer_id ?? null;
        if (introducerIntroducerId !== null) {
          const benRow = await client.query(
            "SELECT beneficiary_id FROM accounts WHERE id = $1",
            [introducerIntroducerId]
          );
          beneficiaryId = benRow.rows[0]?.beneficiary_id ?? null;
        } else {
          beneficiaryId = null;
        }
      }

      // Persist the computed beneficiary for this new account
      await client.query(
        "UPDATE accounts SET beneficiary_id = $1 WHERE id = $2",
        [beneficiaryId, account_id]
      );

      results.push({
        id: account_id,
        introducer_id,
        beneficiary_id: beneficiaryId,
      });
    }

    await client.query("COMMIT");
    res.json({ message: "Accounts created", results });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message || "Database error" });
  } finally {
    client.release();
  }
});
