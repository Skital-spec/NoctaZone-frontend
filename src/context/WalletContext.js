import React, { createContext, useContext, useState } from "react";

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  const deposit = (amount, ref) => {
    setBalance(prev => prev + amount);
    setTransactions(prev => [
      { type: "Deposit", amount, ref, date: new Date().toISOString() },
      ...prev
    ]);
  };

  const withdraw = (amount) => {
    if (amount > balance) return false;
    setBalance(prev => prev - amount);
    setTransactions(prev => [
      { type: "Withdraw", amount, date: new Date().toISOString() },
      ...prev
    ]);
    return true;
  };

  return (
    <WalletContext.Provider value={{ balance, deposit, withdraw, transactions }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
