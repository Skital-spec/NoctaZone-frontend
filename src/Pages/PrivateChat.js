import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import MainLayout from "../Components/MainLayout";

export default function WhatsAppStyleChat() {
  const { userId } = useParams();

  const [currentUser, setCurrentUser] = useState(null);

  // UI state
  const [searchUsername, setSearchUsername] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [chatUsers, setChatUsers] = useState([]); // {id, username, avatar_url, lastMessage, time}
  const [foundUser, setFoundUser] = useState(null); // selected chat user (profile object)
  const [messages, setMessages] = useState([]); // messages with foundUser
  const [message, setMessage] = useState("");

  // refs for cleanup and scroll
  const listChannelRef = useRef(null);
  const windowChannelRef = useRef(null);
  const messagesEndRef = useRef(null);
  const suggestionsDebounceRef = useRef(null);

  // --- Get current user once on mount ---
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setCurrentUser(data.user);
    })();
  }, []);

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
        .select("*")
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
      .subscribe();

    windowChannelRef.current = channel;

    return () => {
      cleanupWindowChannel();
    };
  }, [foundUser, currentUser]);

  const selectUser = (user) => {
    setFoundUser(user);
    setSearchUsername("");
    setSuggestions([]);
  };

  const sendMessage = async () => {
    if (!message.trim() || !currentUser || !foundUser) return;

    const payload = {
      sender_id: currentUser.id,
      receiver_id: foundUser.id,
      content: message.trim(),
    };

    const optimisticMsg = { ...payload, id: `temp-${Date.now()}`, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimisticMsg]);
    setChatUsers((prev) =>
      prev.map((c) => (c.id === foundUser.id ? { ...c, lastMessage: message.trim(), time: optimisticMsg.created_at } : c))
    );
    setMessage("");
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    const { error } = await supabase.from("private_messages").insert([payload]);
    if (error) {
      console.error("sendMessage error:", error);
    }
  };

  const neon = "#00ffcc";
  const dark = "#121212";
  const panel = "#1e1e1e";

  return (
    <MainLayout>
      <div className="chat-layout" style={{ height: "90vh", background: dark, color: "#fff" }}>
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
                    <div key={msg.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 10 }}>
                      <div
                        style={{
                          background: mine ? neon : panel,
                          color: mine ? "#000" : "#fff",
                          padding: "10px 14px",
                          borderRadius: 12,
                          maxWidth: "72%",
                          wordBreak: "break-word",
                        }}
                      >
                        {msg.content}
                        <div style={{ fontSize: 10, color: mine ? "#111" : "#ccc", marginTop: 6, textAlign: "right" }}>
                          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ""}
                        </div>
                      </div>
                    </div>
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
      </div>
    </MainLayout>
  );
}
