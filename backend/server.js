const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

// Configure CORS for production
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://bank-referral-system.vercel.app", // Your actual frontend URL
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const referralRoutes = require("./routes/referralRoutes");
app.use("/api/referrals", referralRoutes);

// Initialize database schema
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

// Referral rule: odd referrals benefit the introducer, even referrals benefit the introducer's introducer
app.post("/addAccount", async (req, res) => {
  const account_id = Number(req.body?.account_id);
  const introducer_id = Number(req.body?.introducer_id);

  if (!Number.isFinite(account_id) || !Number.isFinite(introducer_id)) {
    return res
      .status(400)
      .json({ error: "account_id and introducer_id must be numbers" });
  }

  try {
    await pool.query(
      "INSERT INTO accounts (id, introducer_id, beneficiary_id) VALUES ($1, $2, NULL)",
      [account_id, introducer_id]
    );

    const { rows: cntRows } = await pool.query(
      "SELECT COUNT(*)::int AS cnt FROM accounts WHERE introducer_id = $1",
      [introducer_id]
    );
    const referralCount = cntRows[0]?.cnt ?? 1;

    let beneficiaryId = null;
    if (referralCount % 2 === 1) {
      beneficiaryId = introducer_id;
    } else {
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
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ error: "Account with this account_id already exists" });
    }
    res.status(500).json({ error: "Database error" });
  }
});

// Start server
ensureSchema().finally(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

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

// Bulk create accounts with transaction support
app.post("/addAccountsBulk", async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [];
  if (items.length === 0) {
    return res.status(400).json({ error: "Body must be a non-empty array" });
  }

  const client = await pool.connect();
  const results = [];
  try {
    await client.query("BEGIN");

    for (const item of items) {
      const account_id = Number(item?.account_id);
      const introducer_id = Number(item?.introducer_id);
      if (!Number.isFinite(account_id) || !Number.isFinite(introducer_id)) {
        throw new Error(
          "Invalid item: account_id and introducer_id must be numbers"
        );
      }

      await client.query(
        "INSERT INTO accounts (id, introducer_id, beneficiary_id) VALUES ($1, $2, NULL)",
        [account_id, introducer_id]
      );

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
