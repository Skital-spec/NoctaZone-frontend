import React, { useState, useEffect } from "react";
import MainLayout from "../Components/MainLayout";

const WalletPage = () => {
  const [activeTab, setActiveTab] = useState("wallet");
  const [balance, setBalance] = useState(0);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactionRef, setTransactionRef] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const minDeposit = 50;
  const minWithdrawal = 100;

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/wallet/transaction", {
        method: "GET",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance || 0);
      } else {
        setError("Failed to fetch balance");
      }
    } catch {
      setError("Network error");
    }
  };

  const updateBalance = async (newBalance) => {
    try {
      await fetch("http://localhost:5000/wallet/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ balance: newBalance }),
      });
      setBalance(newBalance);
    } catch {
      setError("Failed to update balance");
    }
  };

  const formatPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) return "254" + cleaned.substring(1);
    if (cleaned.startsWith("254")) return cleaned;
    if (cleaned.startsWith("7") || cleaned.startsWith("1"))
      return "254" + cleaned;
    return cleaned;
  };

  const initiateDeposit = async () => {
    if (!phone || !amount) {
      setError("Please fill all fields");
      return;
    }
    if (parseFloat(amount) < minDeposit) {
      setError(`Minimum deposit is ${minDeposit} KES`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("https://safcom-payment.onrender.com/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formatPhone(phone),
          amount: parseFloat(amount),
        }),
      });

      if (response.ok) {
        const result = await response.text();
        setTransactionRef(result);
        setStatus("pending");
        const newBalance = balance + parseFloat(amount);
        updateBalance(newBalance);
      } else {
        setError("Payment failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const withdraw = () => {
    if (parseFloat(amount) < minWithdrawal) {
      setError(`Minimum withdrawal is ${minWithdrawal} KES`);
      return;
    }
    if (parseFloat(amount) > balance) {
      setError("Insufficient balance");
      return;
    }
    const newBalance = balance - parseFloat(amount);
    updateBalance(newBalance);
    setAmount("");
    alert("Withdrawal request submitted!");
  };

  const quickAmount = (val) => {
    setAmount(val);
  };

  const reset = () => {
    setPhone("");
    setAmount("");
    setTransactionRef("");
    setStatus("");
    setError("");
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
                Balance: <span>{balance} KES</span>
              </p>

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
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712345678"
              />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />

              {error && <p className="error-text">{error}</p>}

              {/* Actions */}
              <div className="action-buttons">
                <button
                  onClick={initiateDeposit}
                  disabled={loading}
                  className="deposit-btn"
                >
                  {loading ? "Processing..." : "Deposit"}
                </button>
                <button onClick={withdraw} className="withdraw-btn">
                  Withdraw
                </button>
              </div>

              {/* Transaction Info */}
              {transactionRef && (
                <div className="transaction-info">
                  <p>Transaction Ref: {transactionRef}</p>
                  <p>Status: {status}</p>
                  {status === "pending" && (
                    <p className="pending-text">
                      Check your phone for M-Pesa prompt
                    </p>
                  )}
                  <button onClick={reset} className="new-txn-btn">
                    New Transaction
                  </button>
                </div>
              )}
            </>
          )}

          {/* Transactions Tab */}
          {activeTab === "transactions" && (
            <div className="placeholder-content">
              <h2>Transactions</h2>
              <p>Here you will see all your past deposits and withdrawals.</p>
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
