import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useParams } from "react-router-dom";

const ChatWindow = () => {
  const { id: otherUserId } = useParams();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let userId = null;

    const initChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);
      userId = user.id;

      // Fetch existing messages
      const { data, error } = await supabase
        .from("private_messages")
        .select("*")
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .order("created_at", { ascending: true });

      if (!error) setMessages(data || []);

      // Subscribe to new messages instantly
      const channel = supabase
        .channel(`chat-room-${otherUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "private_messages" },
          (payload) => {
            const newMessage = payload.new;
            if (
              (newMessage.sender_id === userId && newMessage.receiver_id === otherUserId) ||
              (newMessage.sender_id === otherUserId && newMessage.receiver_id === userId)
            ) {
              setMessages((prev) => [...prev, newMessage]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    initChat();
  }, [otherUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() || !currentUser) return;
    await supabase.from("private_messages").insert([
      {
        sender_id: currentUser.id,
        receiver_id: otherUserId,
        content: message.trim(),
      },
    ]);
    setMessage("");
  };

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ height: "70vh", overflowY: "auto", border: "1px solid #ddd", padding: "10px" }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              textAlign: msg.sender_id === currentUser?.id ? "right" : "left",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: "15px",
                backgroundColor: msg.sender_id === currentUser?.id ? "#DCF8C6" : "#EEE",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: "flex", marginTop: "10px" }}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          style={{ flex: 1, padding: "10px" }}
        />
        <button onClick={sendMessage} style={{ padding: "10px" }}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
