// src/pages/Wallet.js
import React, { useState, useEffect } from "react";
import MainLayout from "../Components/MainLayout";

const WalletPage = () => {
  const [balance, setBalance] = useState(0);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactionRef, setTransactionRef] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const minDeposit = 50;
  const minWithdrawal = 100;

  // Fetch balance on mount
  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/wallet/balance", {
        method: "GET",
        credentials: "include", // if you're using cookies/session
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance || 0);
      } else {
        setError("Failed to fetch balance");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  const updateBalance = async (newBalance) => {
    try {
      await fetch("http://localhost:5000/api/wallet/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ balance: newBalance }),
      });
      setBalance(newBalance);
    } catch (err) {
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
      const response = await fetch("http://localhost:5000/stkpush", {
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
        updateBalance(newBalance); // Save to backend
      } else {
        setError("Payment failed");
      }
    } catch (err) {
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
    updateBalance(newBalance); // Save to backend
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

  return (
    <MainLayout>
      {/* Navbar */}
      <nav className="flex gap-6 bg-gray-900 text-white p-4 font-semibold">
        <button className="hover:text-yellow-400">Wallet</button>
        <button className="hover:text-yellow-400">Transactions</button>
        <button className="hover:text-yellow-400">Promos</button>
        <button className="hover:text-yellow-400">Rewards</button>
      </nav>

      {/* Wallet Content */}
      <div className="max-w-lg mx-auto mt-6 p-4 bg-gray-800 rounded-lg text-white">
        <h2 className="text-2xl font-bold mb-4">My Wallet</h2>
        <p className="text-lg mb-6">
          Balance:{" "}
          <span className="text-green-400 font-bold">{balance} KES</span>
        </p>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2 mb-4">
          {[100, 300, 500, 1000].map((val) => (
            <button
              key={val}
              onClick={() => quickAmount(val)}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
            >
              {val}+
            </button>
          ))}
        </div>

        {/* Phone Input */}
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0712345678"
          className="w-full p-2 mb-3 rounded text-black"
        />

        {/* Amount Input */}
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          className="w-full p-2 mb-3 rounded text-black"
        />

        {error && <p className="text-red-400 mb-3">{error}</p>}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={initiateDeposit}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded w-full"
          >
            {loading ? "Processing..." : "Deposit"}
          </button>
          <button
            onClick={withdraw}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded w-full"
          >
            Withdraw
          </button>
        </div>

        {/* Transaction Feedback */}
        {transactionRef && (
          <div className="mt-4 p-3 bg-gray-700 rounded">
            <p>Transaction Ref: {transactionRef}</p>
            <p>Status: {status}</p>
            {status === "pending" && (
              <p className="text-yellow-400">
                Check your phone for M-Pesa prompt
              </p>
            )}
            <button
              onClick={reset}
              className="mt-3 bg-blue-500 px-4 py-2 rounded"
            >
              New Transaction
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default WalletPage;
