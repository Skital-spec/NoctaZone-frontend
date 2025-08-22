import React, { useState, useEffect } from "react";
import MainLayout from "../Components/MainLayout";
import PaystackPop from "@paystack/inline-js";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yfboormaqzgjxbskjnuk.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmYm9vcm1hcXpnanhic2tqbnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0Nzc0MDYsImV4cCI6MjA3MDA1MzQwNn0.CnQkxFOD8LgImr5NCFV3m7z1FpLqdBoPqDEns5J6d6k";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const WalletPage = () => {
  const [activeTab, setActiveTab] = useState("wallet");
  const [balance, setBalance] = useState(0); // in tokens
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactionRef, setTransactionRef] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [phone, setPhone] = useState(""); // withdrawals only

  // ✅ New state for transaction history
  const [transactions, setTransactions] = useState([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [stats, setStats] = useState(null);

  // const minDeposit = 50; // min 50 KSh → 50 tokens
  const minWithdrawal = 100; // min 100 tokens

  // ✅ Get logged-in user and their email from Supabase
  useEffect(() => {
    const getProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);

        // fetch email from profiles table
        const { data, error } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", user.id)
          .single();

        if (data) {
          setUserEmail(data.email);
        } else if (error) {
          console.error("Profile fetch error:", error.message);
          // Fallback to user.email if available
          if (user.email) {
            setUserEmail(user.email);
          }
        }

        // fetch wallet balance once user is ready
        fetchBalance(user.id);
        // fetch transaction history
        fetchTransactions(user.id);
        // fetch stats
        fetchStats(user.id);
      }
    };

    getProfile();
  }, []);

  // ✅ Fetch balance from backend (tokens stored in Supabase)
  const fetchBalance = async (uid) => {
    try {
      console.log("Fetching balance for user:", uid);
      const res = await fetch(
        `http://localhost:5000/api/wallet/transaction?user_id=${uid}`
      );
      const data = await res.json();
      console.log("Balance response:", data);
      const newBalance = data.balance || 0;
      setBalance(newBalance);
      
      // ✅ Dispatch custom event to update TopNavbar
      window.dispatchEvent(new CustomEvent('balanceUpdated', {
        detail: { balance: newBalance }
      }));
      
    } catch (err) {
      console.error("Fetch balance failed", err);
      setError("Failed to fetch balance");
    }
  };

  // ✅ NEW: Fetch transaction history
  const fetchTransactions = async (uid) => {
    setTransactionLoading(true);
    try {
      console.log("Fetching transactions for user:", uid);
      const res = await fetch(
        `http://localhost:5000/api/wallet/transactions/${uid}?limit=50`
      );
      const data = await res.json();
      
      if (res.ok) {
        console.log("Transactions response:", data);
        setTransactions(data.transactions || []);
      } else {
        console.error("Transaction fetch failed:", data);
        setTransactions([]);
      }
    } catch (err) {
      console.error("Fetch transactions failed", err);
      setTransactions([]);
    } finally {
      setTransactionLoading(false);
    }
  };

  // ✅ NEW: Fetch wallet statistics
  const fetchStats = async (uid) => {
    try {
      const res = await fetch(`http://localhost:5000/api/wallet/stats/${uid}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Fetch stats failed", err);
    }
  };

  // ✅ Paystack Deposit - IMPROVED VERSION
  const initiateDeposit = async () => {
    if (!amount) {
      setError("Please enter amount");
      return;
    }
    // if (parseFloat(amount) < minDeposit) {
    //   setError(`Minimum deposit is ${minDeposit} KES`);
    //   return;
    // }
    if (!userEmail) {
      setError("Could not fetch user email");
      return;
    }
    if (!userId) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("");

    const paystack = new PaystackPop();
    paystack.newTransaction({
      key: 'pk_live_41a0a96ab5079e3c62ac6e37786b6e31641119eb', 
      amount: parseFloat(amount) * 100, // Paystack expects in kobo
      email: userEmail,
      onSuccess: async (transaction) => {
        console.log("Payment successful:", transaction);
        
        const tokens = parseFloat(amount); // 1 KSh = 1 Token
        setTransactionRef(transaction.reference);
        setStatus("Processing...");

        try {
          // Save deposit to backend → Supabase
          const response = await fetch("http://localhost:5000/api/wallet/deposit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              user_id: userId,
              reference: transaction.reference,
              amount: parseFloat(amount),
              tokens: tokens,
            }),
          });

          const result = await response.json();
          console.log("Deposit backend response:", result);

          if (response.ok) {
            setStatus("success");
            // Refresh balance from backend
            await fetchBalance(userId);
            // ✅ Refresh transaction history after successful deposit
            await fetchTransactions(userId);
            await fetchStats(userId);
            setAmount(""); // Clear amount input
            console.log("Deposit completed successfully");
          } else {
            throw new Error(result.error || "Deposit failed");
          }
        } catch (err) {
          console.error("Deposit backend error:", err);
          setError(`Deposit processing failed: ${err.message}`);
          setStatus("failed");
        }
        
        setLoading(false);
      },
      onCancel: () => {
        setError("Payment cancelled");
        setLoading(false);
      },
    });
  };

  // ✅ Withdrawal via Daraja B2C
  const withdraw = async () => {
    if (parseFloat(amount) < minWithdrawal) {
      setError(`Minimum withdrawal is ${minWithdrawal} tokens`);
      return;
    }
    if (parseFloat(amount) > balance) {
      setError("Insufficient balance");
      return;
    }
    if (!phone) {
      setError("Please enter your M-Pesa phone number for withdrawal");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: userId,
          phone: phone,
          amount: parseFloat(amount), // in tokens → same as KSh
        }),
      });

      if (res.ok) {
        // Refresh balance from backend
        await fetchBalance(userId);
        // ✅ Refresh transaction history after withdrawal
        await fetchTransactions(userId);
        await fetchStats(userId);
        setAmount("");
        setPhone("");
        alert("Withdrawal request submitted via M-Pesa!");
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Withdrawal failed");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const quickAmount = (val) => setAmount(val.toString());
  
  const reset = () => {
    setPhone("");
    setAmount("");
    setTransactionRef("");
    setStatus("");
    setError("");
  };

  // Add a refresh balance function
  const refreshBalance = () => {
    if (userId) {
      fetchBalance(userId);
    }
  };

  // ✅ NEW: Refresh all data
  const refreshAllData = () => {
    if (userId) {
      fetchBalance(userId);
      fetchTransactions(userId);
      fetchStats(userId);
    }
  };

  // ✅ NEW: Get transaction type styling
  const getTransactionStyle = (type) => {
    switch (type) {
      case 'deposit':
        return { color: '#00ff88', symbol: '+' };
      case 'withdrawal':
        return { color: '#ff6b6b', symbol: '-' };
      case 'tournament_join':
        return { color: '#ffa500', symbol: '🎮' };
      default:
        return { color: '#cccccc', symbol: '' };
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
        {/* Tabs */}
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
          {/* Wallet Tab */}
          {activeTab === "wallet" && (
            <>
              <h2 className="wallet-title">My Wallet</h2>
              <p className="wallet-balance">
                Balance: <span>{balance} Tokens</span>
                <button 
                  onClick={refreshBalance} 
                  style={{ 
                    marginLeft: '10px', 
                    padding: '5px 10px', 
                    fontSize: '12px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Refresh
                </button>
              </p>

              {/* User Info */}
              <div style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
                <p>User ID: {userId}</p>
                <p>Email: {userEmail}</p>
              </div>

              {/* ✅ NEW: Quick Stats */}
              {stats && (
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  background: 'grey', 
                  borderRadius: '8px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '10px',
                  fontSize: '14px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#00ff88' }}>
                      +{stats.total_deposits}
                    </div>
                    <div>Total Deposits</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#ff6b6b' }}>
                      -{stats.total_withdrawals}
                    </div>
                    <div>Total Withdrawals</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#ffa500' }}>
                      {stats.tournament_count}
                    </div>
                    <div>Tournaments</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#007bff' }}>
                      {stats.net_amount}
                    </div>
                    <div>Net Amount</div>
                  </div>
                </div>
              )}

              {/* Quick Amount Buttons */}
              <div className="quick-buttons">
                {[100, 300, 500, 1000].map((val) => (
                  <button key={val} onClick={() => quickAmount(val)}>
                    {val}+
                  </button>
                ))}
              </div>

              {/* Inputs */}
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />

              {/* Phone only for Withdrawals */}
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="M-Pesa Phone (for withdrawals only)"
              />

              {error && <p className="error-text" style={{color: 'red'}}>{error}</p>}
              {status && (
                <p className="status-text" style={{
                  color: status === 'success' ? 'green' : status === 'failed' ? 'red' : 'orange'
                }}>
                  Status: {status}
                </p>
              )}

              {/* Actions */}
              <div className="action-buttons">
                <button
                  onClick={initiateDeposit}
                  disabled={loading}
                  className="deposit-btn"
                >
                  {loading ? "Processing..." : "Deposit"}
                </button>
                <button 
                  onClick={withdraw} 
                  className="withdraw-btn"
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Withdraw"}
                </button>
              </div>

              {/* Transaction Info */}
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

          {/* ✅ UPDATED: Transactions Tab with Real Data */}
          {activeTab === "transactions" && (
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h2>Transaction History</h2>
                <button 
                  onClick={refreshAllData}
                  style={{ 
                    padding: '8px 15px', 
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
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
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '18px' }}>
                              {style.symbol}
                            </span>
                            <div>
                              <div style={{ 
                                fontWeight: 'bold',
                                textTransform: 'capitalize',
                                color: style.color
                              }}>
                                {tx.type.replace('_', ' ')}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {tx.date} at {tx.time}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ 
                              fontSize: '16px',
                              fontWeight: 'bold',
                              color: style.color
                            }}>
                              {style.symbol === '+' ? '+' : style.symbol === '-' ? '-' : ''}
                              {tx.tokens || tx.amount} Tokens
                            </div>
                            {tx.status && (
                              <div style={{ 
                                fontSize: '12px',
                                color: tx.status === 'completed' ? 'green' : 'orange',
                                textTransform: 'capitalize'
                              }}>
                                {tx.status}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Transaction Details */}
                        <div style={{ fontSize: '12px', color: '#888' }}>
                          {tx.reference && (
                            <div>Ref: {tx.reference}</div>
                          )}
                          {tx.phone && (
                            <div>Phone: {tx.phone}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Promos Tab */}
          {activeTab === "promos" && (
            <div className="placeholder-content">
              <h2>Promos</h2>
              <p>Check out ongoing and upcoming promotions here.</p>
            </div>
          )}

          {/* Rewards Tab */}
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