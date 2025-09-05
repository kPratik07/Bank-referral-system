import { useState } from "react";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://bank-referral-system-3.onrender.com";

function App() {
  const [accountId, setAccountId] = useState("");
  const [introducerId, setIntroducerId] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);

  async function loadAccounts() {
    try {
      const res = await fetch(`${API_BASE_URL}/accounts`);
      if (!res.ok) throw new Error("Failed to load accounts");
      const data = await res.json();
      setAccounts(data);
    } catch (e) {
      // Silent fail for minimal UI
    }
  }

  if (accounts.length === 0) {
    loadAccounts();
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/addAccount`, {
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
