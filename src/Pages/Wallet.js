import React, { useState, useEffect } from "react";
import MainLayout from "../Components/MainLayout";
// import PaystackPop from "@paystack/inline-js";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yfboormaqzgjxbskjnuk.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmYm9vcm1hcXpnanhic2tqbnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0Nzc0MDYsImV4cCI6MjA3MDA1MzQwNn0.CnQkxFOD8LgImr5NCFV3m7z1FpLqdBoPqDEns5J6d6k";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const WalletPage = () => {
  const [activeTab, setActiveTab] = useState("wallet");
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactionRef, setTransactionRef] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [mode, setMode] = useState(""); // "deposit" | "withdraw"
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const getProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);

        const { data, error } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", user.id)
          .single();

        if (data) {
          setUserEmail(data.email);
        } else if (error && user.email) {
          setUserEmail(user.email);
        }

        fetchBalance(user.id);
        fetchTransactions(user.id);
        fetchStats(user.id);
      }
    };

    getProfile();
  }, []);

  const fetchBalance = async (uid) => {
    try {
      const res = await fetch(
        `https://safcom-payment.onrender.com/api/wallet/transaction?user_id=${uid}`
      );
      const data = await res.json();
      const newBalance = data.balance || 0;
      setBalance(newBalance);
      window.dispatchEvent(new CustomEvent('balanceUpdated', { detail: { balance: newBalance } }));
    } catch {
      setError("Failed to fetch balance");
    }
  };

  const fetchTransactions = async (uid) => {
    setTransactionLoading(true);
    try {
      const res = await fetch(
        `https://safcom-payment.onrender.com/api/wallet/transactions/${uid}?limit=50`
      );
      const data = await res.json();
      setTransactions(res.ok ? (data.transactions || []) : []);
    } finally {
      setTransactionLoading(false);
    }
  };

  const fetchStats = async (uid) => {
    try {
      const res = await fetch(`https://safcom-payment.onrender.com/api/wallet/stats/${uid}`);
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  const minDeposit = 50;
  const minWithdrawal = 100;

  const formatPhone = (raw) => {
    if (typeof raw !== "string") return "254708374149";
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("254")) return digits;
    if (digits.startsWith("0")) return "254" + digits.substring(1);
    if (digits.startsWith("7") || digits.startsWith("1")) return "254" + digits;
    return "254708374149";
  };

  // Daraja STK Push deposit
  const initiateDeposit = async () => {
    if (!amount) return setError("Please enter amount");
    if (parseFloat(amount) < minDeposit) return setError(`Minimum deposit is ${minDeposit} KES`);
    if (!phone) return setError("Please enter your M-Pesa phone number");
    if (!userId) return setError("User not authenticated");

    setLoading(true);
    setError("");
    setStatus("pending");

    try {
      const resp = await fetch("https://safcom-payment.onrender.com/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          phone: formatPhone(phone),
          amount: parseFloat(amount)
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to initiate deposit");

      const ref = data.checkoutRequestId;
      setTransactionRef(ref);

      // Quick poll once after a short delay
      setTimeout(async () => {
        try {
          const st = await fetch(`https://safcom-payment.onrender.com/api/mpesa/stkpush/status?checkoutRequestId=${encodeURIComponent(ref)}&user_id=${encodeURIComponent(userId)}`);
          const stData = await st.json();
          if (st.ok && stData.ResultCode?.toString() === "0") {
            setStatus("success");
            await fetchBalance(userId);
            await fetchTransactions(userId);
            await fetchStats(userId);
            setAmount("");
            alert("Deposit successful!");
          } else if (st.ok && stData.ResultCode?.toString() === "1032") {
            setStatus("cancelled");
            setError("Payment cancelled");
          } else {
            setStatus("failed");
            setError(stData.ResultDesc || "Deposit failed");
          }
        } catch {
          setError("Failed to check deposit status");
        } finally {
          setLoading(false);
        }
      }, 4000);
    } catch (e) {
      setError(e.message);
      setLoading(false);
      setStatus("failed");
    }
  };

  // Withdrawal request (admin review)
  const submitWithdrawRequest = async () => {
    if (!amount) return setError("Please enter amount");
    if (parseFloat(amount) < minWithdrawal) return setError(`Minimum withdrawal is ${minWithdrawal} KES`);
    if (!phone || !phone2) return setError("Enter and confirm your M-Pesa phone number");
    if (formatPhone(phone) !== formatPhone(phone2)) return setError("Phone numbers do not match");
    if (!userId) return setError("User not authenticated");

    setLoading(true);
    setError("");

    try {
      const res = await fetch("https://safcom-payment.onrender.com/api/wallet/withdraw-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          phone: formatPhone(phone),
          amount: parseFloat(amount)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit withdrawal request");

      await fetchTransactions(userId);
      setAmount("");
      setPhone("");
      setPhone2("");
      alert("Your withdrawal is being processed, you'll receive your funds in the next 60 minutes.");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const quickAmount = (val) => setAmount(val.toString());

  const reset = () => {
    setPhone("");
    setPhone2("");
    setAmount("");
    setTransactionRef("");
    setStatus("");
    setError("");
    setMode("");
  };

  const refreshBalance = () => { if (userId) fetchBalance(userId); };
  const refreshAllData = () => { if (userId) { fetchBalance(userId); fetchTransactions(userId); fetchStats(userId); } };

  const getTransactionStyle = (type) => {
    switch (type) {
      case 'deposit': return { color: '#00ff88', symbol: '+' };
      case 'withdrawal': return { color: '#ff6b6b', symbol: '-' };
      case 'withdraw_request': return { color: '#ff8c00', symbol: '-' };
      case 'tournament_join': return { color: '#ffa500', symbol: '🎮' };
      default: return { color: '#cccccc', symbol: '' };
    }
  };

  const tabs = [
    { id: "wallet", label: "Wallet" },
    { id: "transactions", label: "Transactions" },
    { id: "promos", label: "Promos" },
    { id: "rewards", label: "Rewards" },
  ];

  return (
    <MainLayout>
      <div className="wallet-page">
        <div className="help-tabs">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`help-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {activeTab === tab.id && <div className="tab-arrow" />}
            </div>
          ))}
        </div>

        <div className="wallet-container">
          {activeTab === "wallet" && (
            <>
              <h2 className="wallet-title">My Wallet</h2>
              <p className="wallet-balance">
                Balance: <span>{balance} Tokens</span>
                <button onClick={refreshBalance} style={{ marginLeft: '10px', padding: '5px 10px', fontSize: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Refresh
                </button>
              </p>

              <div style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
                <p>User ID: {userId}</p>
                <p>Email: {userEmail}</p>
              </div>

              {stats && (
                <div style={{ marginBottom: '20px', padding: '15px', background: 'grey', borderRadius: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', fontSize: '14px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#00ff88' }}>+{stats.total_deposits}</div>
                    <div>Total Deposits</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#ff6b6b' }}>-{stats.total_withdrawals}</div>
                    <div>Total Withdrawals</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#ffa500' }}>{stats.tournament_count}</div>
                    <div>Tournaments</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#007bff' }}>{stats.net_amount}</div>
                    <div>Net Amount</div>
                  </div>
                </div>
              )}

              {/* Action selector */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <button onClick={() => setMode("deposit")} className={`deposit-btn ${mode === "deposit" ? "active" : ""}`}>Deposit</button>
                <button onClick={() => setMode("withdraw")} className={`withdraw-btn ${mode === "withdraw" ? "active" : ""}`}>Withdraw</button>
                <button onClick={reset} style={{ marginLeft: 'auto' }}>Clear</button>
              </div>

              {/* Quick Amount Buttons */}
              <div className="quick-buttons">
                {[100, 300, 500, 1000].map((val) => (
                  <button key={val} onClick={() => quickAmount(val)}>
                    {val}+
                  </button>
                ))}
              </div>

              {/* Amount */}
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />

              {/* Phone inputs based on mode */}
              {mode === "deposit" && (
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="M-Pesa Phone for STK Push (e.g. 07XXXXXXXX)"
                />
              )}

              {mode === "withdraw" && (
                <>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="M-Pesa Phone"
                  />
                  <input
                    type="text"
                    value={phone2}
                    onChange={(e) => setPhone2(e.target.value)}
                    placeholder="Confirm M-Pesa Phone"
                  />
                </>
              )}

              {error && <p className="error-text" style={{color: 'red'}}>{error}</p>}
              {status && (
                <p className="status-text" style={{ color: status === 'success' ? 'green' : status === 'failed' ? 'red' : 'orange' }}>
                  Status: {status}
                </p>
              )}

              <div className="action-buttons">
                <button
                  onClick={mode === "deposit" ? initiateDeposit : submitWithdrawRequest}
                  disabled={loading || !mode}
                  className={mode === "deposit" ? "deposit-btn" : "withdraw-btn"}
                >
                  {loading ? "Processing..." : mode === "deposit" ? "Deposit" : "Withdraw"}
                </button>
              </div>

              {transactionRef && (
                <div className="transaction-info">
                  <p>Transaction Ref: {transactionRef}</p>
                  <p>Status: {status}</p>
                  <button onClick={reset} className="new-txn-btn">
                    New Transaction
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === "transactions" && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Transaction History</h2>
                <button 
                  onClick={refreshAllData}
                  style={{ padding: '8px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}
                >
                  Refresh
                </button>
              </div>

              {transactionLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p>Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <p>No transactions found.</p>
                  <p>Start by making a deposit or withdrawal!</p>
                </div>
              ) : (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {transactions.map((tx, index) => {
                    const style = getTransactionStyle(tx.type);
                    return (
                      <div 
                        key={tx.id || index}
                        style={{
                          padding: '15px',
                          margin: '10px 0',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          background: 'white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '18px' }}>
                              {style.symbol}
                            </span>
                            <div>
                              <div style={{ fontWeight: 'bold', textTransform: 'capitalize', color: style.color }}>
                                {tx.type.replace('_', ' ')}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {tx.date} at {tx.time}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: style.color }}>
                              {style.symbol === '+' ? '+' : style.symbol === '-' ? '-' : ''}
                              {tx.tokens || tx.amount} Tokens
                            </div>
                            {tx.status && (
                              <div style={{ fontSize: '12px', color: tx.status === 'completed' ? 'green' : 'orange', textTransform: 'capitalize' }}>
                                {tx.status}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#888' }}>
                          {tx.reference && (<div>Ref: {tx.reference}</div>)}
                          {tx.phone && (<div>Phone: {tx.phone}</div>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "promos" && (
            <div className="placeholder-content">
              <h2>Promos</h2>
              <p>Check out ongoing and upcoming promotions here.</p>
            </div>
          )}

          {activeTab === "rewards" && (
            <div className="placeholder-content">
              <h2>Rewards</h2>
              <p>View your earned points and redeem rewards.</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default WalletPage;