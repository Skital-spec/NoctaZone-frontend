import React, { useState, useEffect, useCallback } from "react";
import { Navbar, Container, Nav } from "react-bootstrap";
import { Menu, MessageCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import OnlineUsersModal from "../Pages/OnlineUsersModal";
import UserSearchLogic from "../Pages/UserSearchLogic";
import { supabase } from "../supabaseClient";
import PublicChatModal from "../Pages/PublicChatModal";

// Simple debounce function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const TopNavbar = ({ onOpenPublicChat }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [balance, setBalance] = useState(0);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [searchUsers, setSearchUsers] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [userId, setUserId] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Function to fetch balance from backend API with improved error handling
  const fetchBalanceFromAPI = async (uid) => {
    try {
      setBalanceLoading(true);
      // console.log("Fetching balance from API for user:", uid);
      
      const response = await fetch(
        `https://safcom-payment.onrender.com/api/wallet/transaction?user_id=${uid}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          // Add timeout
          signal: AbortSignal.timeout(10000) // 10 second timeout
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // console.log("Balance API response:", data);
      
      const apiBalance = data.balance || 0;
      setBalance(apiBalance);
      return apiBalance;
    } catch (err) {
      console.error("Failed to fetch balance from API:", err);
      // Always fallback to Supabase when external API fails
      return await fetchBalanceFromSupabase(uid);
    } finally {
      setBalanceLoading(false);
    }
  };

  // Enhanced Supabase fallback function with better error handling
  const fetchBalanceFromSupabase = async (uid) => {
    try {
      console.log("Fetching balance from Supabase for user:", uid);
      
      // FIRST: Try to get existing wallet
      const { data: wallet, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", uid)
        .maybeSingle(); // Use maybeSingle() instead of single()

      if (error && error.code !== "PGRST116") {
        console.error("Supabase balance fetch error:", error);
        // Return 0 on any error but don't fail completely
        setBalance(0);
        return 0;
      }

      if (wallet) {
        // Wallet exists, use its balance
        console.log("Existing wallet found with balance:", wallet.balance);
        const walletBalance = wallet.balance || 0;
        setBalance(walletBalance);
        return walletBalance;
      } else {
        // Wallet doesn't exist, show 0 balance but don't auto-create
        console.log("No wallet found, showing 0 balance");
        setBalance(0);
        return 0;
      }
    } catch (err) {
      console.error("Error fetching balance from Supabase:", err);
      // Even if Supabase fails, show 0 instead of breaking
      setBalance(0);
      return 0;
    }
  };

  // Add debounced version to prevent rapid calls
  const debouncedFetchBalance = useCallback(
    debounce((uid) => fetchBalanceFromAPI(uid), 1000),
    []
  );

  // Manual refresh balance function with cooldown
  const refreshBalance = async () => {
    if (userId && !balanceLoading) {
      await fetchBalanceFromAPI(userId);
    }
  };

  useEffect(() => {
    let subscription;
    let intervalId;

    const fetchUserAndWallet = async () => {
      try {
        // ✅ get logged in user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) return;

        console.log("User authenticated:", user.id);
        setUserId(user.id);

        // ✅ fetch username with better error handling
        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("username, role")
            .eq("id", user.id)
            .maybeSingle(); // Use maybeSingle() to handle no results gracefully

          if (profile && !profileError) {
            setUsername(profile.username || user.email?.split('@')[0] || 'User');
            setIsAdmin(profile.role === "admin");
          } else {
            console.warn("Profile fetch error:", profileError);
            // Fallback to user email if username not found
            if (user.email) {
              setUsername(user.email.split('@')[0]);
            } else {
              setUsername('User');
            }
            setIsAdmin(false);
          }
        } catch (profileErr) {
          console.error("Profile fetch failed:", profileErr);
          // Fallback to user email if username fetch fails completely
          if (user.email) {
            setUsername(user.email.split('@')[0]);
          } else {
            setUsername('User');
          }
          setIsAdmin(false);
        }

        // ✅ CRITICAL FIX: Only fetch balance, DO NOT create/upsert wallet here
        console.log("Fetching existing wallet balance...");
        await fetchBalanceFromAPI(user.id);

        // ✅ real-time subscription for wallet updates
        subscription = supabase
          .channel(`wallet-changes-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "wallets",
              filter: `user_id=eq.${user.id}`,
            },
            async (payload) => {
              // console.log("Realtime wallet update:", payload);
              if (payload.new && payload.new.balance !== undefined) {
                setBalance(payload.new.balance);
              } else if (payload.eventType === "DELETE") {
                setBalance(0);
              } else {
                // Fallback: fetch fresh data from API
                await fetchBalanceFromAPI(user.id);
              }
            }
          )
          .subscribe((status) => {
            // console.log("Realtime subscription status:", status);
          });

        // ✅ Optional: Poll for balance updates every 30 seconds as backup
        intervalId = setInterval(async () => {
          await fetchBalanceFromAPI(user.id);
        }, 30000); // 30 seconds

      } catch (err) {
        console.error("Error fetching user/wallet:", err.message);
      }
    };

    fetchUserAndWallet();

    // Cleanup function
    return () => {
      if (subscription) {
        // console.log("Cleaning up subscription");
        supabase.removeChannel(subscription);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // Listen for custom balance update events (from wallet page)
  useEffect(() => {
    const handleBalanceUpdate = (event) => {
      // console.log("Custom balance update event:", event.detail);
      if (event.detail.balance !== undefined) {
        setBalance(event.detail.balance);
      }
    };

    window.addEventListener('balanceUpdated', handleBalanceUpdate);
    
    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdate);
    };
  }, []);

  return (
    <>
      <Navbar
        variant="dark"
        expand="lg"
        fixed="top"
        className="px-3 border-bottom border-secondary"
        style={{ backgroundColor: "#0a0a0a" }}
      >
        <Container fluid>
          <Navbar.Brand
            href="/"
            className="d-flex align-items-center text-neon"
            id="top-nav"
          >
            <img
              src="https://res.cloudinary.com/dm7edtofj/image/upload/v1754505778/logo_suleug.svg"
              alt="Logo"
              width="40"
              height="40"
              style={{ filter: "invert(1)" }}
              className="d-inline-block align-top me-2"
            />
            <h1 className="">NoctaZone</h1>
          </Navbar.Brand>

          <Navbar.Toggle
            aria-controls="navbar-nav"
            className="border-0"
            children={<Menu size={22} color="#00ffcc" />}
          />

          <Navbar.Collapse id="navbar-nav" className="bg=#111 p-3 p-lg-0">
            <Nav className="ms-auto align-items-lg-center">
              <Nav.Link 
                href="/wallet" 
                className="text-light d-flex align-items-center"
                style={{ cursor: 'pointer' }}
              >
                💰 Tokens {balance.toFixed(2)}
                {balanceLoading && (
                  <RefreshCw 
                    size={14} 
                    className="ms-1 animate-spin" 
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    refreshBalance();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00ffcc',
                    marginLeft: '5px',
                    cursor: 'pointer',
                    padding: '2px',
                    borderRadius: '3px'
                  }}
                  title="Refresh balance"
                >
                  ⟳
                </button>
              </Nav.Link>
              <Nav.Link
                onClick={() => setShowOnlineUsers(true)}
                className="text-success"
              >
                👥 Online Users
              </Nav.Link>
              <Nav.Link
                onClick={() => setSearchUsers(true)}
                className="text-success"
              >
                👥 Search Users
              </Nav.Link>
              <Nav.Link href="/account" className="text-light">
                {username || "Welcome..."}
              </Nav.Link>
              <Nav.Link
                href="#"
                className="text-info d-flex align-items-center"
                onClick={() => setShowChatModal(true)}
              >
                <MessageCircle size={18} className="me-1" />
                Public Chat
              </Nav.Link>
              {isAdmin && (
                <Nav.Link
                  onClick={() => navigate("/adminresults")}
                  className="text-warning"
                >
                  Admin Results
                </Nav.Link>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Modals */}
      <OnlineUsersModal
        show={showOnlineUsers}
        onClose={() => setShowOnlineUsers(false)}
      />
      <UserSearchLogic
        show={searchUsers}
        onClose={() => setSearchUsers(false)}
      />
      <PublicChatModal
        showModal={showChatModal}
        onClose={() => setShowChatModal(false)}
      />

      {/* Custom CSS for spin animation */}
      <style >{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </>
  );
};

export default TopNavbar;