import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { X, Trophy, Calendar, User, GamepadIcon } from "lucide-react";
import MainLayout from "../Components/MainLayout";

export default function WhatsAppStyleChat() {
  const { userId } = useParams();

  const [currentUser, setCurrentUser] = useState(null);

  // UI state
  const [searchUsername, setSearchUsername] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [foundUser, setFoundUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [messageDropdown, setMessageDropdown] = useState(null);
  
  // NEW: Challenge modal states
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showLowBalanceModal, setShowLowBalanceModal] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isAccepting, setIsAccepting] = useState(false);
  const [alert, setAlert] = useState(null);

  // refs for cleanup and scroll
  const listChannelRef = useRef(null);
  const windowChannelRef = useRef(null);
  const messagesEndRef = useRef(null);
  const suggestionsDebounceRef = useRef(null);

  // Game types mapping (should match CreateChallenge component)
  const gameTypes = [
    { value: "pes", label: "PES (Pro Evolution Soccer)" },
    { value: "fifa", label: "FIFA" },
    { value: "cod", label: "Call of Duty" },
    { value: "fortnite", label: "Fortnite" },
    { value: "apex", label: "Apex Legends" },
    { value: "valorant", label: "Valorant" },
    { value: "pubg", label: "PUBG" },
    { value: "chess", label: "Chess" },
    { value: "dreamleague", label: "Dream League" },
    { value: "leagueoflegends", label: "League of Legends" },
    { value: "minecraft", label: "Minecraft" },
    { value: "asphaltlegends", label: "Asphalt Legends" },
    { value: "realpool3d", label: "Real Pool 3D" }
  ];

  // --- Get current user once on mount ---
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUser(data.user);
        // Fetch balance when user is loaded
        fetchBalance(data.user.id);
      }
    })();
  }, []);

  // NEW: Fetch user balance
  const fetchBalance = async (uid) => {
    try {
      console.log("Fetching balance for user:", uid);
      const res = await fetch(
        `https://safcom-payment.onrender.com/api/wallet/transaction?user_id=${uid}`
      );
      const data = await res.json();
      console.log("Balance response:", data);
      const newBalance = data.balance || 0;
      setBalance(newBalance);
    } catch (err) {
      console.error("Fetch balance failed", err);
    }
  };

  // --- Fetch profile from URL param userId ---
  useEffect(() => {
    if (!userId) return;

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user by id:", error.message);
        return;
      }
      setFoundUser(data);
    })();
  }, [userId]);

  // Function to mark messages as read
  const markAsRead = async (messageIds) => {
    if (!messageIds.length) return;
    
    const { error } = await supabase
      .from("private_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', messageIds)
      .eq('receiver_id', currentUser.id);
      
    if (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  // Function to delete messages
  const deleteMessage = async (messageId) => {
    const { error } = await supabase
      .from("private_messages")
      .delete()
      .eq('id', messageId)
      .eq('sender_id', currentUser.id);
      
    if (error) {
      console.error("Error deleting message:", error);
    } else {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setMessageDropdown(null);
    }
  };

  // NEW: Function to view challenge details
  const viewChallengeDetails = (challengeData) => {
    console.log("📋 Viewing challenge details:", challengeData);
    setSelectedChallenge(challengeData);
    setShowChallengeModal(true);
  };

  // NEW: Function to accept challenge
  const acceptChallenge = async () => {
    if (!selectedChallenge || !currentUser) return;

    const entryFee = parseFloat(selectedChallenge.entry_fee);
    setIsAccepting(true);
    setAlert(null);

    try {
      // Check balance first
      await fetchBalance(currentUser.id);
      
      if (balance < entryFee) {
        setShowConfirmModal(false);
        setShowLowBalanceModal(true);
        setIsAccepting(false);
        return;
      }

      console.log("🎮 Accepting challenge:", {
        challengeId: selectedChallenge.challenge_id,
        userId: currentUser.id,
        entryFee
      });

      // Call backend API to accept challenge
      const response = await fetch("https://safcom-payment.onrender.com/api/wallet/challenge-accept", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          user_id: currentUser.id,
          challenge_id: selectedChallenge.challenge_id,
          entry_fee: entryFee
        }),
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error("❌ Failed to parse response:", parseError);
        throw new Error("Invalid response from server");
      }

      console.log("🎮 Challenge acceptance response:", result);

      if (!response.ok) {
        console.error("❌ Challenge acceptance failed:", result);
        
        if (result.error === "Insufficient balance") {
          setShowConfirmModal(false);
          setShowLowBalanceModal(true);
          return;
        }
        
        throw new Error(result.error || result.details || `Server error: ${response.status}`);
      }

      if (!result.success && result.success !== undefined) {
        console.error("❌ Challenge acceptance was not successful:", result);
        throw new Error(result.error || "Challenge acceptance failed");
      }

      // Update local balance
      const newBalance = result.new_balance;
      if (newBalance !== undefined && newBalance !== null) {
        console.log("💰 Updating balance from", balance, "to", newBalance);
        setBalance(newBalance);
        
        // Update TopNavbar balance
        window.dispatchEvent(new CustomEvent('balanceUpdated', {
          detail: { balance: newBalance }
        }));
      } else {
        await fetchBalance(currentUser.id);
      }

      // Close modals and show success
      setShowConfirmModal(false);
      setShowChallengeModal(false);
      
      setAlert({ 
        type: "success", 
        message: `✅ Challenge accepted successfully! ${entryFee} tokens deducted. New balance: ${newBalance || balance - entryFee} tokens. Good luck! 🎮` 
      });

      // Auto-hide alert after 5 seconds
      setTimeout(() => setAlert(null), 5000);

    } catch (err) {
      console.error("🔥 Challenge acceptance error:", err);
      setAlert({ 
        type: "danger", 
        message: `❌ Failed to accept challenge: ${err.message}` 
      });
      setTimeout(() => setAlert(null), 5000);
    } finally {
      setIsAccepting(false);
    }
  };

  // --- Helper: fetch chat list (latest message per partner) ---
  const fetchChats = async (userId) => {
    if (!userId) return;

    const { data: messagesData, error: msgErr } = await supabase
      .from("private_messages")
      .select("id, sender_id, receiver_id, content, created_at")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (msgErr) {
      console.error("fetchChats messages error:", msgErr);
      return;
    }

    const chatMap = new Map();
    for (const msg of messagesData || []) {
      const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!chatMap.has(otherId)) {
        chatMap.set(otherId, {
          id: otherId,
          lastMessage: msg.content,
          time: msg.created_at,
        });
      }
    }

    const otherIds = [...chatMap.keys()];
    if (otherIds.length === 0) {
      setChatUsers([]);
      return;
    }

    const { data: profilesData, error: profErr } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", otherIds);

    if (profErr) {
      console.error("fetchChats profiles error:", profErr);
      return;
    }

    const merged = otherIds
      .map((id) => {
        const profile = (profilesData || []).find((p) => p.id === id);
        const last = chatMap.get(id);
        return {
          id,
          username: profile?.username || "Unknown",
          avatar_url: profile?.avatar_url || "https://via.placeholder.com/50",
          lastMessage: last?.lastMessage || "",
          time: last?.time || null,
        };
      })
      .sort((a, b) => new Date(b.time) - new Date(a.time));

    setChatUsers(merged);
  };

  // --- Chat list: initial load + realtime updates ---
  useEffect(() => {
    if (!currentUser) return;

    fetchChats(currentUser.id);

    const channel = supabase
      .channel("private-messages-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "private_messages" },
        async (payload) => {
          const msg = payload.new;
          if (msg.sender_id !== currentUser.id && msg.receiver_id !== currentUser.id) return;

          const otherUserId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;

          setChatUsers((prev) => {
            const exists = prev.find((p) => p.id === otherUserId);
            if (exists) {
              const updated = prev.map((p) =>
                p.id === otherUserId ? { ...p, lastMessage: msg.content, time: msg.created_at } : p
              );
              return updated.sort((a, b) => new Date(b.time) - new Date(a.time));
            } else {
              const newEntry = {
                id: otherUserId,
                username: "Unknown",
                avatar_url: "https://via.placeholder.com/50",
                lastMessage: msg.content,
                time: msg.created_at,
              };

              supabase
                .from("profiles")
                .select("id, username, avatar_url")
                .eq("id", otherUserId)
                .single()
                .then(({ data }) => {
                  if (data) {
                    setChatUsers((prev2) =>
                      [
                        { ...newEntry, username: data.username || "Unknown", avatar_url: data.avatar_url || newEntry.avatar_url },
                        ...prev2,
                      ].sort((a, b) => new Date(b.time) - new Date(a.time))
                    );
                  }
                })
                .catch(() => {
                  setChatUsers((prev2) => [newEntry, ...prev2].sort((a, b) => new Date(b.time) - new Date(a.time)));
                });

              return [newEntry, ...prev];
            }
          });
        }
      )
      .subscribe();

    listChannelRef.current = channel;

    return () => {
      try {
        if (listChannelRef.current) supabase.removeChannel(listChannelRef.current);
      } catch (err) {
        console.warn("removeChannel error:", err);
      }
    };
  }, [currentUser]);

  // --- Suggestions: debounced ilike search (case-insensitive) ---
  useEffect(() => {
    if (suggestionsDebounceRef.current) clearTimeout(suggestionsDebounceRef.current);
    if (!searchUsername || searchUsername.trim().length === 0) {
      setSuggestions([]);
      return;
    }
    suggestionsDebounceRef.current = setTimeout(async () => {
      const term = `%${searchUsername.trim()}%`;
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", term)
        .limit(6);
      setSuggestions(data || []);
    }, 250);
    return () => clearTimeout(suggestionsDebounceRef.current);
  }, [searchUsername]);

  // --- When a chat is selected: load messages + subscribe to chat updates ---
  useEffect(() => {
    const cleanupWindowChannel = async () => {
      if (windowChannelRef.current) {
        try {
          await supabase.removeChannel(windowChannelRef.current);
        } catch (err) {
          console.warn("removeChannel window error", err);
        }
        windowChannelRef.current = null;
      }
    };

    if (!currentUser || !foundUser) {
      cleanupWindowChannel();
      setMessages([]);
      return;
    }

    let userId = currentUser.id;
    let otherId = foundUser.id;

    (async () => {
      const { data: msgs } = await supabase
        .from("private_messages")
        .select("*, is_read, read_at")
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
        .order("created_at", { ascending: true });

      setMessages(msgs || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    })();

    const channel = supabase
      .channel(`private-messages-${[userId, otherId].sort().join("-")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "private_messages" },
        (payload) => {
          const msg = payload.new;
          if (
            (msg.sender_id === userId && msg.receiver_id === otherId) ||
            (msg.sender_id === otherId && msg.receiver_id === userId)
          ) {
            setMessages((prev) => [...prev, msg]);
            setChatUsers((prev) =>
              prev.map((c) => (c.id === otherId ? { ...c, lastMessage: msg.content, time: msg.created_at } : c))
            );
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "private_messages" },
        (payload) => {
          const msg = payload.new;
          if (
            (msg.sender_id === userId && msg.receiver_id === otherId) ||
            (msg.sender_id === otherId && msg.receiver_id === userId)
          ) {
            setMessages((prev) => prev.map(m => m.id === msg.id ? msg : m));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "private_messages" },
        (payload) => {
          const deletedId = payload.old.id;
          setMessages((prev) => prev.filter(m => m.id !== deletedId));
        }
      )
      .subscribe();

    windowChannelRef.current = channel;

    return () => {
      cleanupWindowChannel();
    };
  }, [foundUser, currentUser]);

  // Mark messages as read when chat window is viewed
  useEffect(() => {
    if (!currentUser || !foundUser || !messages.length) return;
    
    const unreadMessages = messages
      .filter(msg => 
        msg.receiver_id === currentUser.id && 
        msg.sender_id === foundUser.id && 
        !msg.is_read
      )
      .map(msg => msg.id);
      
    if (unreadMessages.length > 0) {
      markAsRead(unreadMessages);
    }
  }, [messages, currentUser, foundUser]);

  const selectUser = (user) => {
    setFoundUser(user);
    setSearchUsername("");
    setSuggestions([]);
    setMessageDropdown(null);
  };

  const sendMessage = async () => {
    if (!message.trim() || !currentUser || !foundUser) return;

    const payload = {
      sender_id: currentUser.id,
      receiver_id: foundUser.id,
      content: message.trim(),
    };

    setMessage("");
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    const { error } = await supabase.from("private_messages").insert([payload]);
    if (error) {
      console.error("sendMessage error:", error);
    }
  };

  // NEW: Challenge Message Component
  const ChallengeMessageComponent = ({ msg, challengeData }) => {
    const gameLabel = gameTypes.find(g => g.value === challengeData.game_type)?.label || challengeData.game_type;
    const isExpired = challengeData.expires_at && new Date(challengeData.expires_at) < new Date();
    
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "flex-start", 
        marginBottom: 10 
      }}>
        <div
          style={{
            background: "linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)",
            color: "#fff",
            padding: "16px",
            borderRadius: 12,
            maxWidth: "85%",
            border: "2px solid #00ffcc",
            boxShadow: "0 4px 15px rgba(0, 255, 204, 0.2)",
          }}
        >
          {/* Challenge Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: 12,
            color: '#00ffcc',
            fontWeight: 'bold'
          }}>
            <GamepadIcon size={20} style={{ marginRight: 8 }} />
            🎮 GAME CHALLENGE
          </div>

          {/* Challenge Details */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6 }}>
              <strong>Game:</strong> {gameLabel}
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong>Entry Fee:</strong> <span style={{ color: '#00ffcc' }}>{challengeData.entry_fee} tokens</span>
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong>Prize:</strong> <span style={{ color: '#00ffcc' }}>{challengeData.prize_amount} tokens</span>
            </div>
            
            {isExpired && (
              <div style={{ color: '#ff4444', fontSize: 12, marginTop: 8 }}>
                ⚠️ This challenge has expired
              </div>
            )}
          </div>

          {/* Action Button */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => viewChallengeDetails(challengeData)}
              style={{
                background: '#00ffcc',
                color: '#000',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#00e6b8'}
              onMouseLeave={(e) => e.target.style.background = '#00ffcc'}
            >
              View Details
            </button>
            {!isExpired && (
              <button
                onClick={() => {
                  setSelectedChallenge(challengeData);
                  setShowConfirmModal(true);
                }}
                style={{
                  background: 'transparent',
                  color: '#00ffcc',
                  border: '2px solid #00ffcc',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#00ffcc';
                  e.target.style.color = '#000';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#00ffcc';
                }}
              >
                Quick Accept
              </button>
            )}
          </div>

          <div style={{ 
            fontSize: 10, 
            color: "#ccc", 
            marginTop: 12, 
            textAlign: "right" 
          }}>
            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ""}
          </div>
        </div>
      </div>
    );
  };

  // Enhanced Message Component
  const MessageComponent = ({ msg, mine }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Check if this is a challenge message
    const isChallengeMessage = msg.message_type === 'challenge' && msg.challenge_data;

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setMessageDropdown(null);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const ReadTicks = ({ message, isMine }) => {
      if (!isMine) return null;
      
      const isRead = message.is_read;
      const tickColor = isRead ? '#00ffcc' : '#666';
      
      return (
        <div style={{ display: 'inline-flex', marginLeft: 4, alignItems: 'center' }}>
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path d="M1 4l2 2 3-3" stroke={tickColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 4l2 2 4-4" stroke={tickColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
    };

    // If it's a challenge message, render the special component
    if (isChallengeMessage && !mine) {
      return <ChallengeMessageComponent msg={msg} challengeData={msg.challenge_data} />;
    }

    // Regular message component
    return (
      <div 
        style={{ 
          display: "flex", 
          justifyContent: mine ? "flex-end" : "flex-start", 
          marginBottom: 10,
          position: 'relative'
        }}
      >
        <div
          style={{
            background: mine ? "#00ffcc" : "#1e1e1e",
            color: mine ? "#000" : "#fff",
            padding: "10px 14px",
            borderRadius: 12,
            maxWidth: "72%",
            wordBreak: "break-word",
            position: 'relative'
          }}
          onMouseEnter={() => mine && setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          {/* Three dots menu - only for own messages */}
          {mine && (
            <div 
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                cursor: 'pointer',
                opacity: showDropdown ? 1 : 0,
                transition: 'opacity 0.2s',
                fontSize: 16,
                color: '#666',
                fontWeight: 'bold'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setMessageDropdown(messageDropdown === msg.id ? null : msg.id);
              }}
            >
              ⋯
            </div>
          )}

          {/* Dropdown menu */}
          {messageDropdown === msg.id && (
            <div 
              ref={dropdownRef}
              style={{
                position: 'absolute',
                top: 20,
                right: 0,
                background: '#1e1e1e',
                border: '1px solid #00ffcc',
                borderRadius: 6,
                padding: '4px 0',
                minWidth: 80,
                zIndex: 1000,
                boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: '#ff4444',
                  fontSize: 14,
                  borderRadius: 4,
                  margin: '0 4px',
                  transition: 'background 0.2s'
                }}
                onClick={() => deleteMessage(msg.id)}
                onMouseEnter={(e) => e.target.style.background = '#2a2a2a'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                🗑️ Delete
              </div>
            </div>
          )}
          
          <div style={{ marginRight: mine ? 20 : 0 }}>
            {msg.content}
          </div>
          
          <div 
            style={{ 
              fontSize: 10, 
              color: mine ? "#111" : "#ccc", 
              marginTop: 6, 
              textAlign: "right",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 4
            }}
          >
            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ""}
            <ReadTicks message={msg} isMine={mine} />
          </div>
        </div>
      </div>
    );
  };

  // Modal styles
  const modalStyles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      position: "relative",
      backgroundColor: "#0d0d0d",
      border: "2px solid #00ffcc",
      borderRadius: "12px",
      padding: "24px",
      maxWidth: "500px",
      width: "90%",
      maxHeight: "80vh",
      overflow: "auto",
      margin: "0",
      inset: "auto",
      boxShadow: "0 0 15px #00ffcc55",
    },
  };

  const neon = "#00ffcc";
  const dark = "#121212";
  const panel = "#1e1e1e";

  return (
    <MainLayout>
      <div className="chat-layout" style={{ height: "90vh", background: dark, color: "#fff" }}>
        {/* Success/Error Alert */}
        {alert && (
          <div style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 10000,
            background: alert.type === 'success' ? '#28a745' : '#dc3545',
            color: 'white',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxWidth: '400px'
          }}>
            {alert.message}
          </div>
        )}

        {/* Left Sidebar */}
        <div className="chat-sidebar" style={{ width: "32%", borderRight: `1px solid ${neon}`, padding: 12, boxSizing: "border-box" }}>
          <div style={{ marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Search username..."
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                background: panel,
                border: `1px solid ${neon}`,
                color: "#fff",
                borderRadius: 8,
                outline: "none",
              }}
            />
            {suggestions.length > 0 && (
              <div style={{ border: `1px solid ${neon}`, background: panel, marginTop: 8, borderRadius: 6, overflow: "hidden" }}>
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => selectUser(s)}
                    style={{
                      padding: 10,
                      cursor: "pointer",
                      borderBottom: `1px solid rgba(0,255,204,0.06)`,
                      color: neon,
                    }}
                  >
                    <strong style={{ color: "#fff" }}>{s.username}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          <h3 style={{ color: neon, marginTop: 0, marginBottom: 12 }}>Chats</h3>

          <div style={{ overflowY: "auto", height: "calc(90vh - 170px)" }}>
            {chatUsers.length === 0 && <div style={{ color: "#aaa" }}>No chats yet</div>}
            {chatUsers.map((u) => (
              <div
                key={u.id}
                onClick={() => selectUser(u)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px",
                  borderRadius: 8,
                  marginBottom: 8,
                  cursor: "pointer",
                  background: foundUser?.id === u.id ? panel : "transparent",
                }}
              >
                <img
                  src={u.avatar_url}
                  alt="avatar"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    marginRight: 12,
                    border: `2px solid ${neon}`,
                    objectFit: "cover",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ color: "#fff" }}>{u.username}</strong>
                    <small style={{ color: "#999" }}>{u.time ? new Date(u.time).toLocaleTimeString() : ""}</small>
                  </div>
                  <div
                    style={{
                      color: "#bbb",
                      marginTop: 6,
                      maxWidth: "90%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {u.lastMessage}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Chat Window */}
        <div className="chat-window" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {foundUser ? (
            <>
              <div style={{ padding: 12, borderBottom: `1px solid ${neon}`, background: panel, color: neon, fontWeight: "bold" }}>
                {foundUser.username}
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: 16, background: dark }}>
                {messages.map((msg) => {
                  const mine = msg.sender_id === currentUser?.id;
                  return (
                    <MessageComponent 
                      key={msg.id}
                      msg={msg} 
                      mine={mine} 
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ padding: 12, background: panel, display: "flex", gap: 8 }}>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type message..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 8,
                    border: `1px solid ${neon}`,
                    background: dark,
                    color: "#fff",
                    outline: "none",
                  }}
                />
                <button
                  onClick={sendMessage}
                  style={{
                    padding: "10px 16px",
                    background: neon,
                    color: "#000",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: 24, color: "#888" }}>Select a chat to start messaging</div>
          )}
        </div>

        {/* Challenge Details Modal */}
        {showChallengeModal && selectedChallenge && (
          <div style={modalStyles.overlay}>
            <div style={modalStyles.content}>
              <div className="text-white">
                <button 
                  style={{
                    background: '#00ffcc', 
                    border:'none', 
                    borderRadius:'50%',
                    width: '30px',
                    height: '30px',
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowChallengeModal(false)}
                >
                  <X size={18} color="#000" />
                </button>
                
                <h2 className="text-xl font-bold mb-4 pr-8" style={{color: '#00ffcc'}} >
                  🎮 Challenge Details
                </h2>
                
                <div className="mb-6 text-gray-300">
                  <div style={{ marginBottom: 16, padding: 16, background: '#1a1a1a', borderRadius: 8, border: '1px solid #333' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                      <GamepadIcon size={20} style={{ marginRight: 8, color: '#00ffcc' }} />
                      <strong style={{ color: '#00ffcc' }}>Game Information</strong>
                    </div>
                    <p style={{ marginBottom: 8 }}>
                      <strong>Game:</strong> {gameTypes.find(g => g.value === selectedChallenge.game_type)?.label || selectedChallenge.game_type}
                    </p>
                  </div>

                  <div style={{ marginBottom: 16, padding: 16, background: '#1a1a1a', borderRadius: 8, border: '1px solid #333' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                     
                      <strong style={{ color: '#00ffcc' }}>Token Details</strong>
                    </div>
                    <p style={{ marginBottom: 8 }}>
                      <strong>Entry Fee:</strong> <span style={{color: '#00ffcc'}}>{selectedChallenge.entry_fee} tokens</span>
                    </p>
                    <p style={{ marginBottom: 8 }}>
                      <strong>Prize Pool:</strong> <span style={{color: '#00ffcc'}}>{selectedChallenge.prize_amount} tokens</span>
                    </p>
                    <p style={{ fontSize: 12, color: '#999' }}>
                      Your current balance: {balance} tokens
                    </p>
                  </div>

                  <div style={{ marginBottom: 16, padding: 16, background: '#1a1a1a', borderRadius: 8, border: '1px solid #333' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                      <Calendar size={20} style={{ marginRight: 8, color: '#00ffcc' }} />
                      <strong style={{ color: '#00ffcc' }}>Schedule</strong>
                    </div>
                    <p style={{ marginBottom: 8 }}>
                      <strong>Play Time:</strong> {selectedChallenge.play_time ? new Date(selectedChallenge.play_time).toLocaleString() : 'Not specified'}
                    </p>
                    <p style={{ marginBottom: 8 }}>
                      <strong>Expires:</strong> {selectedChallenge.expires_at ? new Date(selectedChallenge.expires_at).toLocaleString() : 'No expiration'}
                    </p>
                  </div>

                  {selectedChallenge.rules && (
                    <div style={{ marginBottom: 16, padding: 16, background: '#1a1a1a', borderRadius: 8, border: '1px solid #333' }}>
                      <strong style={{ color: '#00ffcc', display: 'block', marginBottom: 8 }}>Match Rules:</strong>
                      <p style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {selectedChallenge.rules}
                      </p>
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {selectedChallenge.expires_at && new Date(selectedChallenge.expires_at) > new Date() ? (
                    <>
                      <button 
                        style={{
                          background: '#00ffcc', 
                          border:'none', 
                          padding:'12px 24px', 
                          borderRadius:'8px',
                          color: '#000',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          flex: 1,
                          minWidth: '120px'
                        }}
                        onClick={() => {
                          setShowChallengeModal(false);
                          setShowConfirmModal(true);
                        }}
                      >
                        Accept Challenge
                      </button>
                      <button 
                        style={{
                          background: 'transparent', 
                          border:'2px solid #666', 
                          padding:'12px 24px', 
                          borderRadius:'8px',
                          color: '#666',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          flex: 1,
                          minWidth: '120px'
                        }}
                        onClick={() => setShowChallengeModal(false)}
                      >
                        Close
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ 
                        color: '#ff4444', 
                        textAlign: 'center', 
                        width: '100%', 
                        marginBottom: 12,
                        padding: 8,
                        background: '#2a1a1a',
                        borderRadius: 6,
                        border: '1px solid #ff4444'
                      }}>
                        ⚠️ This challenge has expired and can no longer be accepted
                      </div>
                      <button 
                        style={{
                          background: '#666', 
                          border:'none', 
                          padding:'12px 24px', 
                          borderRadius:'8px',
                          color: '#fff',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          width: '100%'
                        }}
                        onClick={() => setShowChallengeModal(false)}
                      >
                        Close
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Accept Challenge Modal */}
        {showConfirmModal && selectedChallenge && (
          <div style={modalStyles.overlay}>
            <div style={modalStyles.content}>
              <div className="text-white">
                <button 
                  style={{
                    background: '#00ffcc', 
                    border:'none', 
                    borderRadius:'50%',
                    width: '30px',
                    height: '30px',
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isAccepting}
                >
                  <X size={18} color="#000" />
                </button>
                
                <h2 className="text-xl font-bold mb-4 pr-8" style={{color: '#00ffcc'}} >
                  Confirm Challenge Acceptance
                </h2>
                
                <div className="mb-6 text-gray-300">
                  <p className="mb-3">
                    <strong>Game:</strong> {gameTypes.find(g => g.value === selectedChallenge.game_type)?.label}
                  </p>
                  <p className="mb-3">
                    <strong>Entry Fee:</strong> <span style={{color: '#00ffcc'}} className="font-bold">{selectedChallenge.entry_fee} tokens</span>
                  </p>
                  <p className="mb-3">
                    <strong>Prize:</strong> <span style={{color: '#00ffcc'}} className="font-bold">{selectedChallenge.prize} tokens</span>
                  </p>
                  <p className="mb-3">
                    <strong>Challenger:</strong> @{selectedChallenge.sender_username}
                  </p>
                  <div style={{ 
                    background: '#1a1a1a', 
                    padding: 12, 
                    borderRadius: 8, 
                    border: '1px solid #333',
                    marginTop: 16
                  }}>
                    <p style={{ fontSize: 14, marginBottom: 8 }}>
                      <strong>Your Balance:</strong> {balance} tokens
                    </p>
                    <p style={{ fontSize: 14, color: balance >= selectedChallenge.entry_fee ? '#00ffcc' : '#ff4444' }}>
                      <strong>After Acceptance:</strong> {balance - selectedChallenge.entry_fee} tokens
                    </p>
                  </div>
                  <p className="text-sm text-gray-400 mt-4">
                    Are you sure you want to accept this challenge?
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    style={{
                      background: '#00ffcc', 
                      border:'none', 
                      padding:'12px 24px', 
                      borderRadius:'8px',
                      color: '#000',
                      fontWeight: 'bold',
                      cursor: isAccepting ? 'not-allowed' : 'pointer',
                      flex: 1,
                      opacity: isAccepting ? 0.7 : 1
                    }}
                    onClick={acceptChallenge}
                    disabled={isAccepting}
                  >
                    {isAccepting ? "Processing..." : "Yes, Accept Challenge"}
                  </button>
                  <button 
                    style={{
                      background: 'transparent', 
                      border:'2px solid #666', 
                      padding:'12px 24px', 
                      borderRadius:'8px',
                      color: '#666',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      flex: 1
                    }}
                    onClick={() => setShowConfirmModal(false)}
                    disabled={isAccepting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Low Balance Modal */}
        {showLowBalanceModal && selectedChallenge && (
          <div style={modalStyles.overlay}>
            <div style={modalStyles.content}>
              <div className="text-white">
                <button 
                  style={{
                    background: '#00ffcc', 
                    border:'none', 
                    borderRadius:'50%',
                    width: '30px',
                    height: '30px',
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowLowBalanceModal(false)}
                >
                  <X size={18} color="#000" />
                </button>
                
                <h2 className="text-xl font-bold text-red-400 mb-4 pr-8">
                  Insufficient Balance
                </h2>
                
                <div className="mb-6">
                  <p className="text-gray-300 mb-2">
                    You don't have enough tokens to accept this challenge.
                  </p>
                  <div className="bg-[#1a1a1a] p-3 rounded border border-gray-700">
                    <p className="text-sm text-gray-400">Required:</p>
                    <p className="text-lg font-semibold" style={{color: '#00ffcc'}}>
                      {selectedChallenge.entry_fee} tokens
                    </p>
                    <p className="text-sm text-gray-400 mt-2">Your Balance:</p>
                    <p className="text-lg font-semibold text-red-400">
                      {balance} tokens
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    style={{
                      background: '#00ffcc', 
                      border:'none', 
                      padding:'12px 20px', 
                      borderRadius:'8px',
                      color: '#000',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      flex: 1
                    }}
                    onClick={() => {
                      setShowLowBalanceModal(false);
                      // Navigate to wallet (you might need to import useNavigate from react-router-dom)
                      window.location.href = '/wallet';
                    }}
                  >
                    Deposit Tokens
                  </button>
                  <button 
                    style={{
                      background: 'transparent', 
                      border:'2px solid #666', 
                      padding:'12px 20px', 
                      borderRadius:'8px',
                      color: '#666',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      flex: 1
                    }}
                    onClick={() => setShowLowBalanceModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}