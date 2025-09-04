// React UI for the Bank Referral System
// - Left: form to create an account
// - Right: table to view all accounts from the backend
import { useState } from "react";
import "./App.css";

function App() {
  const [accountId, setAccountId] = useState("");
  const [introducerId, setIntroducerId] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Table data loaded from backend
  const [accounts, setAccounts] = useState([]);

  // Fetch all accounts to render the table
  async function loadAccounts() {
    try {
      const res = await fetch("http://localhost:5000/accounts");
      if (!res.ok) throw new Error("Failed to load accounts");
      const data = await res.json();
      setAccounts(data);
    } catch (e) {
      // keep UI minimal; show inline error if needed
    }
  }

  // initialize table
  if (accounts.length === 0) {
    // light-weight guard to avoid multiple fetches before mount effects
    loadAccounts();
  }

  // Submit the form → create one account via backend, then refresh table
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/addAccount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: Number(accountId),
          introducer_id: Number(introducerId),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
      setAccountId("");
      setIntroducerId("");
      await loadAccounts();
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <h1 className="page-title">Bank Referral System</h1>

      <div className="layout">
        <form onSubmit={handleSubmit} className="card form-card form-box">
          <label>Account ID:</label>
          <input
            type="number"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
          />

          <label>Introducer ID:</label>
          <input
            type="number"
            value={introducerId}
            onChange={(e) => setIntroducerId(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <div className="card table-card">
          <h3 className="card-title">Accounts</h3>
          {error && <div className="alert">{error}</div>}
          <table className="accounts-table">
            <thead>
              <tr>
                <th>Account no.</th>
                <th>Introducer</th>
                <th>Beneficiary</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((row) => (
                <tr key={row.account_id}>
                  <td>{row.account_id}</td>
                  <td>{row.introducer_id ?? ""}</td>
                  <td>{row.beneficiary_id ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
