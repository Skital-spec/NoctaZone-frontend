import React, { useEffect, useState, useRef } from "react";
import { Container, Form, Button, ListGroup, Spinner, Alert, Dropdown } from "react-bootstrap";
import { supabase } from "../supabaseClient";

const PublicChatPage = ({ currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [currentUserId, setCurrentUserId] = useState(null); 
  const messagesEndRef = useRef(null);

  // Get current user ID on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      if (currentUser?.id) {
        setCurrentUserId(currentUser.id);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          setCurrentUserId(user.id);
        }
      }
    };

    getCurrentUser();
  }, [currentUser]);

  // Fetch messages with usernames from profiles table
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      
      // First, get all messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("public_chat")
        .select("*")
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Error fetching messages:", messagesError.message);
        setError("Failed to load messages. Please try again.");
        setLoading(false);
        return;
      }

      // Then, get all unique user IDs from messages
      const userIds = [...new Set(messagesData.map(msg => msg.user_id))];
      
      // Fetch usernames for all users at once
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError.message);
        // Still show messages even if usernames fail to load
      }

      // Create a map of user_id -> username for quick lookup
      const usernameMap = {};
      if (profilesData) {
        profilesData.forEach(profile => {
          usernameMap[profile.id] = profile.username;
        });
      }

      // Add usernames to messages
      const messagesWithUsernames = messagesData.map(msg => ({
        ...msg,
        username: usernameMap[msg.user_id] || "Anonymous"
      }));

      setMessages(messagesWithUsernames);
      setLoading(false);
    };

    fetchMessages();

    // Set up real-time subscription for new messages and deletions
    const channel = supabase
      .channel("public-chat-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "public_chat" },
        async (payload) => {
          console.log("🔥 New message received in real-time:", payload.new);
          
          // The message already includes username from the insert, so we can use it directly
          const newMessage = {
            ...payload.new,
            username: payload.new.username || "Anonymous"
          };

          setMessages((prev) => {
            // Prevent duplicates by checking if message already exists
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "public_chat" },
        (payload) => {
          console.log("🗑️ Message deleted in real-time:", payload.old);
          setMessages((prev) => prev.filter(msg => msg.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log("📡 Real-time subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    // More flexible user check - if we don't have currentUser, get current session
    let user = currentUser;
    if (!user) {
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      user = sessionUser;
    }

    if (!user) {
      setError("Please log in to send messages.");
      return;
    }

    setSending(true);
    setError(null);

    // Get username from profiles table
    const { data: profileData } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    const username = profileData?.username || "Anonymous";

    const { error } = await supabase.from("public_chat").insert([
      {
        user_id: user.id,
        username: username, // Include username in the insert
        message: trimmed,
      },
    ]) ;

    if (error) {
      console.error("Error sending message:", error.message);
      setError("Failed to send message. Please try again.");
    } else {
      setMessage(""); // Clear input on success
    }
    
    setSending(false);
  };

  const deleteMessage = async (messageId, messageUserId) => {
    let user = currentUser;
    if (!user) {
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      user = sessionUser;
    }

    if (!user) {
      setError("Please log in to delete messages.");
      return;
    }

    // Double check user owns the message
    if (user.id !== messageUserId) {
      setError("You can only delete your own messages.");
      return;
    }

    setDeletingIds(prev => new Set([...prev, messageId]));

    const { error } = await supabase
      .from("public_chat")
      .delete()
      .eq("id", messageId);

    if (error) {
      console.error("Error deleting message:", error.message);
      setError(`Failed to delete message: ${error.message}`);
    } else {
      console.log("✅ Message deleted successfully");
      window.location.reload();
    }

    setDeletingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(messageId);
      return newSet;
    });
  }; const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const getCurrentUserId = () => {
    return currentUserId;
  };

  // Add this useEffect to debug user state
  useEffect(() => {
    console.log("🔍 Debug - Current User ID state:", currentUserId);
    console.log("🔍 Debug - CurrentUser prop:", currentUser);
    console.log("🔍 Debug - Sample message user_ids:", messages.slice(0, 2).map(m => m.user_id));
  }, [messages, currentUser, currentUserId]);

  return (
    <Container fluid className="py-4" style={{ maxWidth: 800 }}>
      <h2 className="text-center mb-4">🌍 Public Chat</h2>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Messages Container */}
      <div
        style={{
          border: "1px solid #dee2e6",
          borderRadius: 8,
          padding: 16,
          height: "60vh",
          overflowY: "auto",
          backgroundColor: "#f8f9fa",
          marginBottom: 16,
        }}
      >
        {loading ? (
          <div className="text-center my-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted my-5">
            <p>No messages yet. Be the first to say something! 👋</p>
          </div>
        ) : (
          <ListGroup variant="flush">
            {messages.map((msg) => (
              <ListGroup.Item 
                key={msg.id} 
                className="border-0 bg-transparent px-0 py-2"
                style={{
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <strong className="text-primary">
                      {msg.username || "Anonymous"}:
                    </strong>
                    <span className="ms-2">{msg.message}</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <small className="text-muted" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </small>
                    
                    {/* Show delete option for user's own messages */}
                    {(() => {
                      const canDelete = currentUserId === msg.user_id;
                      
                      console.log("🔍 Delete check:", {
                        currentUserId,
                        msgUserId: msg.user_id,
                        canDelete,
                        msgId: msg.id
                      });
                      
                      return canDelete;
                    })() && (
                      <Dropdown align="end">
                        <Dropdown.Toggle 
                          variant="link" 
                          size="sm"
                          className="text-muted p-0 border-0 shadow-none"
                          style={{ fontSize: "1rem", lineHeight: 1 }}
                          disabled={deletingIds.has(msg.id)}
                        >
                          {deletingIds.has(msg.id) ? (
                            <Spinner animation="border" size="sm" />
                          ) : (
                            "⋯"
                          )}
                        </Dropdown.Toggle>

                        <Dropdown.Menu>
                          <Dropdown.Item 
                            onClick={() => deleteMessage(msg.id, msg.user_id)}
                            className="text-danger"
                            disabled={deletingIds.has(msg.id)}
                          >
                            🗑️ Delete Message
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    )}
                  </div>
                </div>
              </ListGroup.Item>
            ))}
            <div ref={messagesEndRef} />
          </ListGroup>
        )}
      </div>

      {/* Message Input Form */}
      <Form onSubmit={sendMessage}>
        <div className="d-flex gap-2">
          <Form.Control
            type="text"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            autoFocus
            maxLength={500}
          />
          <Button 
            type="submit" 
            variant="success" 
            disabled={!message.trim() || sending}
            style={{ minWidth: "80px" }}
          >
            {sending ? (
              <Spinner animation="border" size="sm" />
            ) : (
              "Send"
            )}
          </Button>
        </div>
        <small className="text-muted mt-1 d-block">
          Press Enter to send • {message.length}/500 characters
        </small>
      </Form>
    </Container>
  );
};

export default PublicChatPage; 