const pool = require("../db");

const getReferrals = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM referrals");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

module.exports = { getReferrals };
