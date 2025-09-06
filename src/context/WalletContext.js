import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

// Import config
const SUPABASE_URL = 'https://azjgrgxigcdedkwcdbgf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6amdyZ3hpZ2NkZWRrd2NkYmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQzMjI4MzAsImV4cCI6MjAzOTg5ODgzMH0.wGNrKKQ5ynP0rGOwgtKsX7xqr-tnhO98rGKSWi6Xp7Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Initialize user and fetch balance on mount
  useEffect(() => {
    const initializeWallet = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        
        if (user) {
          setUserId(user.id);
          await fetchBalance(user.id);
        }
      } catch (error) {
        console.error('Failed to initialize wallet:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeWallet();
  }, []);

  // Fetch balance from backend
  const fetchBalance = async (uid = userId) => {
    if (!uid) return;
    
    try {
      const response = await fetch(
        `https://safcom-payment.onrender.com/api/wallet/transaction?user_id=${uid}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('balanceUpdated', {
          detail: { balance: data.balance || 0 }
        }));
      } else {
        console.error('Failed to fetch balance:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const deposit = async (amount, ref) => {
    try {
      // Optimistically update UI
      const newBalance = balance + amount;
      setBalance(newBalance);
      
      // Add transaction to local state
      setTransactions(prev => [
        { type: "Deposit", amount, ref, date: new Date().toISOString() },
        ...prev
      ]);

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('balanceUpdated', {
        detail: { balance: newBalance }
      }));

      // Refresh balance from backend to ensure consistency
      if (userId) {
        setTimeout(() => fetchBalance(userId), 1000);
      }
    } catch (error) {
      console.error('Error in deposit:', error);
    }
  };

  const withdraw = (amount) => {
    if (amount > balance) return false;
    
    try {
      const newBalance = balance - amount;
      setBalance(newBalance);
      
      setTransactions(prev => [
        { type: "Withdraw", amount, date: new Date().toISOString() },
        ...prev
      ]);

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('balanceUpdated', {
        detail: { balance: newBalance }
      }));

      return true;
    } catch (error) {
      console.error('Error in withdraw:', error);
      return false;
    }
  };

  // Refresh balance function for manual refresh
  const refreshBalance = () => {
    if (userId) {
      fetchBalance(userId);
    }
  };

  return (
    <WalletContext.Provider value={{ 
      balance, 
      deposit, 
      withdraw, 
      transactions, 
      loading, 
      refreshBalance,
      fetchBalance
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
