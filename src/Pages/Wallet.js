import React, { useState, useEffect } from "react";
import MainLayout from "../Components/MainLayout";
import PaystackPop from "@paystack/inline-js";
import { createClient } from "@supabase/supabase-js";
import { config } from "../config";

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

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

        // Enhanced profile fetching with error handling
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", user.id)
            .maybeSingle(); // Use maybeSingle() to handle no results gracefully

          if (data && !error) {
            setUserEmail(data.email);
          } else {
            console.warn("Profile email fetch error:", error);
            // Fallback to user.email if profile fetch fails
            if (user.email) {
              setUserEmail(user.email);
            }
          }
        } catch (profileErr) {
          console.error("Profile fetch failed completely:", profileErr);
          // Fallback to user.email if profile fetch fails completely
          if (user.email) {
            setUserEmail(user.email);
          }
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
        `${config.API_BASE_URL}/api/wallet/transaction?user_id=${uid}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          // Add timeout for better UX
          signal: AbortSignal.timeout(10000) // 10 second timeout
        }
      );
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      const newBalance = data.balance || 0;
      setBalance(newBalance);
      window.dispatchEvent(new CustomEvent('balanceUpdated', { detail: { balance: newBalance } }));
    } catch (err) {
      console.error("Failed to fetch balance from external API:", err);
      // Fallback to Supabase
      await fetchBalanceFromSupabase(uid);
    }
  };

  // Supabase fallback for balance fetching
  const fetchBalanceFromSupabase = async (uid) => {
    try {
      console.log("Fetching balance from Supabase as fallback for user:", uid);
      
      const { data: wallet, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", uid)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Supabase balance fetch error:", error);
        setError("Unable to fetch balance. Please try again later.");
        setBalance(0);
        return;
      }

      const walletBalance = wallet ? (wallet.balance || 0) : 0;
      setBalance(walletBalance);
      window.dispatchEvent(new CustomEvent('balanceUpdated', { detail: { balance: walletBalance } }));
      
      if (!wallet) {
        setError("Wallet not found. Please contact support if you have made deposits.");
      }
    } catch (err) {
      console.error("Error fetching balance from Supabase:", err);
      setError("Unable to connect to wallet service. Please try again later.");
      setBalance(0);
    }
  };

  const fetchTransactions = async (uid) => {
    setTransactionLoading(true);
    try {
      const res = await fetch(
        `${config.API_BASE_URL}/api/wallet/transactions/${uid}?limit=50`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        }
      );
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error("Failed to fetch transactions from external API:", err);
      // Fallback to Supabase transactions if available
      await fetchTransactionsFromSupabase(uid);
    } finally {
      setTransactionLoading(false);
    }
  };

  // Supabase fallback for transactions
  const fetchTransactionsFromSupabase = async (uid) => {
    try {
      console.log("Fetching transactions from Supabase as fallback for user:", uid);
      
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Supabase transactions fetch error:", error);
        setTransactions([]);
        return;
      }

      setTransactions(transactions || []);
    } catch (err) {
      console.error("Error fetching transactions from Supabase:", err);
      setTransactions([]);
    }
  };

  const fetchStats = async (uid) => {
    try {
      const res = await fetch(
        `${config.API_BASE_URL}/api/wallet/stats/${uid}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
    } catch (err) {
      console.error("Failed to fetch stats from external API:", err);
      // For stats, we can just show null/default values if API fails
      setStats(null);
    }
  };

  const minDeposit = config.MIN_DEPOSIT;
  const minWithdrawal = config.MIN_WITHDRAWAL;

  // Email validation helper
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Enhanced Paystack deposit with better error handling
  const initiateDeposit = async () => {
    if (!amount) return setError("Please enter amount");
    if (parseFloat(amount) < minDeposit) return setError(`Minimum deposit is ${minDeposit} KES`);
    if (!userEmail) return setError("Email not found. Please refresh the page");
    if (!userId) return setError("User not authenticated");
    if (!validateEmail(userEmail)) return setError("Invalid email address");

    setLoading(true);
    setError("");
    setStatus("pending");

    try {
      // First, initialize payment with backend
      const resp = await fetch(`${config.API_BASE_URL}/api/paystack/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          email: userEmail,
          amount: parseFloat(amount)
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(errorData.error || `Failed to initialize payment (${resp.status})`);
      }
      
      const data = await resp.json();
      
      if (!data.authorization_url || !data.reference) {
        throw new Error("Invalid payment initialization response");
      }
      
      setTransactionRef(data.reference);
      setStatus("processing");

      // Initialize Paystack popup
      const paystack = new PaystackPop();
      
      paystack.newTransaction({
        key: config.PAYSTACK_PUBLIC_KEY,
        email: userEmail,
        amount: parseFloat(amount) * 100, // Convert to kobo
        currency: 'KES',
        reference: data.reference,
        callback: async (response) => {
          console.log('Paystack payment successful:', response);
          setStatus("verifying");
          
          // Verify payment with backend
          try {
            const verifyResp = await fetch(
              `${config.API_BASE_URL}/api/paystack/verify?reference=${encodeURIComponent(response.reference)}&user_id=${encodeURIComponent(userId)}`,
              {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(15000)
              }
            );
            
            if (!verifyResp.ok) {
              throw new Error(`Verification failed: ${verifyResp.status}`);
            }
            
            const verifyData = await verifyResp.json();
            
            if (verifyData.status === 'success') {
              setStatus("success");
              await fetchBalance(userId);
              await fetchTransactions(userId);
              await fetchStats(userId);
              setAmount("");
              alert("Deposit successful!");
            } else {
              setStatus("failed");
              setError(verifyData.gateway_response || "Payment verification failed");
            }
          } catch (verifyErr) {
            console.error("Payment verification error:", verifyErr);
            setStatus("unknown");
            setError("Could not verify payment. Please contact support if money was deducted.");
          } finally {
            setLoading(false);
          }
        },
        onClose: () => {
          console.log('Paystack popup closed');
          setStatus("cancelled");
          setError("Payment was cancelled");
          setLoading(false);
        }
      });
      
    } catch (e) {
      console.error("Deposit initiation error:", e);
      setError(e.message || "Failed to initialize payment. Please check your internet connection and try again.");
      setLoading(false);
      setStatus("failed");
    }
  };

  // Enhanced withdrawal request with better error handling
  const submitWithdrawRequest = async () => {
    if (!amount) return setError("Please enter amount");
    if (parseFloat(amount) < minWithdrawal) return setError(`Minimum withdrawal is ${minWithdrawal} KES`);
    if (!phone || !phone2) return setError("Enter and confirm your phone number");
    if (phone !== phone2) return setError("Phone numbers do not match");
    if (!userId) return setError("User not authenticated");
    if (parseFloat(amount) > balance) return setError("Insufficient balance for this withdrawal");

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${config.API_BASE_URL}/api/wallet/withdraw-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          phone: phone,
          amount: parseFloat(amount)
        }),
        // Add timeout
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || `Failed to submit withdrawal request (${res.status})`);
      }
      
      const data = await res.json();
      console.log("Withdrawal request response:", data);
      
      await fetchTransactions(userId);
      await fetchBalance(userId); // Refresh balance to show pending withdrawal
      setAmount("");
      setPhone("");
      setPhone2("");
      alert("Your withdrawal request has been submitted successfully! You'll receive your funds within 60 minutes.");
    } catch (e) {
      console.error("Withdrawal request error:", e);
      setError(e.message || "Failed to submit withdrawal request. Please check your internet connection and try again.");
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
                <div style={{ marginBottom: '10px', padding: '10px', background: '#e3f2fd', borderRadius: '5px', fontSize: '14px' }}>
                  💳 <strong>Paystack Payment:</strong> You will be redirected to a secure payment page to complete your deposit using card, bank transfer, or mobile money.
                </div>
              )}

              {mode === "withdraw" && (
                <>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone Number (e.g. 0712345678)"
                  />
                  <input
                    type="text"
                    value={phone2}
                    onChange={(e) => setPhone2(e.target.value)}
                    placeholder="Confirm Phone Number"
                  />
                </>
              )}

              {/* Enhanced Error and Status Display */}
              {error && (
                <div className="error-text" style={{
                  color: 'red', 
                  background: '#ffebee', 
                  padding: '10px', 
                  borderRadius: '5px', 
                  border: '1px solid #ffcdd2',
                  marginBottom: '15px'
                }}>
                  <strong>Error:</strong> {error}
                </div>
              )}
              
              {status && (
                <div className="status-text" style={{ 
                  color: status === 'success' ? '#4caf50' : status === 'failed' ? '#f44336' : status === 'cancelled' ? '#ff9800' : '#2196f3',
                  background: status === 'success' ? '#e8f5e8' : status === 'failed' ? '#ffebee' : status === 'cancelled' ? '#fff3e0' : '#e3f2fd',
                  padding: '10px',
                  borderRadius: '5px',
                  border: `1px solid ${status === 'success' ? '#c8e6c9' : status === 'failed' ? '#ffcdd2' : status === 'cancelled' ? '#ffcc02' : '#bbdefb'}`,
                  marginBottom: '15px',
                  fontWeight: 'bold'
                }}>
                  Status: {status === 'processing' ? 'Processing payment...' : status === 'verifying' ? 'Verifying payment...' : status.charAt(0).toUpperCase() + status.slice(1)}
                  {status === 'processing' && (
                    <div style={{ marginTop: '5px', fontSize: '14px', fontWeight: 'normal' }}>
                      Please complete the payment on the Paystack payment page.
                    </div>
                  )}
                  {status === 'verifying' && (
                    <div style={{ marginTop: '5px', fontSize: '14px', fontWeight: 'normal' }}>
                      Please wait while we verify your payment...
                    </div>
                  )}
                </div>
              )}

              <div className="action-buttons">
                {mode && (
                  <button
                    onClick={mode === "deposit" ? initiateDeposit : submitWithdrawRequest}
                    disabled={loading}
                    className={mode === "deposit" ? "deposit-btn" : "withdraw-btn"}
                  >
                    {loading ? "Processing..." : mode === "deposit" ? "Deposit" : "Withdraw"}
                  </button>
                )}
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