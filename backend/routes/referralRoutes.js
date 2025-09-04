const express = require("express");
const { getReferrals } = require("../controllers/referralController");
const router = express.Router();

router.get("/", getReferrals);

module.exports = router;
