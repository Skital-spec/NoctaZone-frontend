import React, { useEffect, useState, useRef } from "react";
import { Container, Form, Button, ListGroup, Spinner, Alert, Dropdown, Modal, Badge, Card } from "react-bootstrap";
import { supabase } from "../supabaseClient";
import { Trophy, Users, Clock, Eye, PlusCircle } from "lucide-react";

const PublicChatModal = ({ currentUser, showModal, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [challengesLoading, setChallengesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [currentUserId, setCurrentUserId] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [joiningChallenge, setJoiningChallenge] = useState(false);
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
        .neq("message_type", "challenge") // avoid fetching challenge announcements at all
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Error fetching messages:", messagesError.message);
        setError("Failed to load messages. Please try again.");
        setLoading(false);
        return;
      }

      // Filter out public challenge announcements from chat feed
      const nonChallengeMessages = (messagesData || []).filter(m => m.message_type !== 'challenge');

      // Then, get all unique user IDs from messages
      const userIds = [...new Set(nonChallengeMessages.map(msg => msg.user_id))];
      
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
      const messagesWithUsernames = nonChallengeMessages.map(msg => ({
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
          // Ignore public challenge announcements in the chat feed
          if (payload.new?.message_type === 'challenge') return;

          const newMessage = {
            ...payload.new,
            username: payload.new.username || "Anonymous"
          };

          setMessages((prev) => {
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

  // Fetch public challenges
  useEffect(() => {
    const fetchChallenges = async () => {
      setChallengesLoading(true);
      try {
        // Use the backend API instead of direct Supabase query
        const response = await fetch(`https://safcom-payment.onrender.com/api/challenges/public?user_id=${currentUserId}`, {
          method: "GET",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          credentials: "include"
        });
    
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
    
        const result = await response.json();
        console.log("🔍 Public challenges API response:", result);
    
        if (result.success && result.data) {
          // Filter challenges to only show those with exactly 1 participant (creator only)
          const availableChallenges = result.data.filter(challenge => 
            challenge.participants === 1 && challenge.status === "pending"
          );
          
          // Check if current user has already joined any challenges
          if (currentUserId && availableChallenges.length > 0) {
            const challengeIds = availableChallenges.map(c => c.id);
            
            const { data: participationsData } = await supabase
              .from("challenge_participants")
              .select("challenge_id")
              .in("challenge_id", challengeIds)
              .eq("user_id", currentUserId);
            
            // Mark challenges the user has already joined
            const userParticipations = participationsData || [];
            const challengesWithParticipation = availableChallenges.map(challenge => ({
              ...challenge,
              hasJoined: userParticipations.some(p => p.challenge_id === challenge.id),
              // Map backend response to frontend expected format
              game_type: challenge.game_type,
              entry_fee: challenge.entry_fee,
              creator: { 
                username: challenge.creator_username || "Unknown"
              },
              current_participants: challenge.participants,
              total_participants: 2 // Public challenges are 1v1
            }));
            
            setChallenges(challengesWithParticipation);
          } else {
            // Map backend response to frontend expected format
            const formattedChallenges = availableChallenges.map(challenge => ({
              ...challenge,
              game_type: challenge.game_type,
              entry_fee: challenge.entry_fee,
              creator: { 
                username: challenge.creator_username || "Unknown"
              },
              current_participants: challenge.participants,
              total_participants: 2 // Public challenges are 1v1
            }));
            setChallenges(formattedChallenges);
          }
        } else {
          console.log("No public challenges found or API returned unsuccessful response");
          setChallenges([]);
        }
      } catch (err) {
        console.error("Error in fetchChallenges:", err);
        setError("Failed to load challenges.");
      } finally {
        setChallengesLoading(false);
      }
    };

    if (showModal) {
      fetchChallenges();
      
      // Set up real-time subscription for challenges
      const challengesChannel = supabase
        .channel("public-challenges-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "challenges" },
          (payload) => {
            if (payload.new.challenge_type === "open" && payload.new.status === "pending") {
              // Fetch creator username for the new challenge
              supabase
                .from("profiles")
                .select("username, avatar_url")
                .eq("id", payload.new.user_id)
                .single()
                .then(({ data: profile }) => {
                  const newChallenge = {
                    ...payload.new,
                    creator: profile
                  };
                  setChallenges(prev => [newChallenge, ...prev]);
                });
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "challenges" },
          (payload) => {
            // Remove challenges that are no longer open/pending or are full
            if (payload.new.challenge_type !== "open" || payload.new.status !== "pending" ||
                (payload.new.current_participants >= payload.new.participants)) {
              setChallenges(prev => prev.filter(c => c.id !== payload.new.id));
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "challenge_participants" },
          (payload) => {
            // Update challenge participant count and remove when full
            setChallenges(prev => {
              return prev.reduce((acc, challenge) => {
                if (challenge.id !== payload.new.challenge_id) {
                  acc.push(challenge);
                  return acc;
                }
                const updated = {
                  ...challenge,
                  current_participants: (challenge.current_participants || 1) + 1
                };
                if (updated.current_participants >= updated.participants) {
                  // Challenge is now full; remove from list
                  return acc;
                }
                acc.push(updated);
                return acc;
              }, []);
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(challengesChannel);
      };
    }
  }, [showModal, currentUserId]);

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
    ]);

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
    }

    setDeletingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(messageId);
      return newSet;
    });
  };

  const viewChallengeDetails = (challenge) => {
    setSelectedChallenge(challenge);
    setShowChallengeModal(true);
  };

  const viewChallengeFromMessage = async (challengeData) => {
    try {
      console.log("🔍 Challenge data from message:", challengeData);
      console.log("🔍 Challenge ID type:", typeof challengeData.challenge_id);
      console.log("�� Challenge ID value:", challengeData.challenge_id);
      
      // First, let's check what challenges exist in the database
      const { data: allChallenges, error: listError } = await supabase
        .from("challenges")
        .select("id, game_type, status")
        .order("created_at", { ascending: false })
        .limit(10);
      
      console.log("🔍 Recent challenges in DB:", allChallenges);
      
      // Now try to fetch the specific challenge
      const { data: challenge, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", challengeData.challenge_id)
        .maybeSingle();

      console.log("🔍 Query result:", { challenge, error });

      if (error) {
        console.error("❌ Error fetching challenge:", error);
        setError("Failed to load challenge details");
        return;
      }

      if (!challenge) {
        console.log("❌ Challenge not found in DB, using message data instead");
        
        // Use the challenge data from the message instead
        const challengeFromMessage = {
          id: challengeData.challenge_id,
          game_type: challengeData.game_type,
          entry_fee: challengeData.entry_fee,
          prize_amount: challengeData.prize,
          rules: challengeData.rules,
          play_time: challengeData.play_time,
          status: 'pending',
          creator: { username: challengeData.sender_username || "Unknown" },
          note: "Showing challenge details from message (may be outdated)"
        };

        setSelectedChallenge(challengeFromMessage);
        setShowChallengeModal(true);
        return;
      }

      console.log("✅ Challenge found:", challenge);

      // Fetch creator profile separately to avoid foreign key issues
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", challenge.creator_id)
        .maybeSingle();

      // Combine challenge data with creator info
      const challengeWithCreator = {
        ...challenge,
        creator: creatorProfile || { username: "Unknown", avatar_url: null }
      };

      // Check if current user has already joined this challenge
      if (currentUserId) {
        const { data: participation } = await supabase
          .from("challenge_participants")
          .select("id")
          .eq("challenge_id", challengeData.challenge_id)
          .eq("user_id", currentUserId)
          .maybeSingle();

        challengeWithCreator.hasJoined = !!participation;
        challengeWithCreator.isOwnChallenge = challenge.creator_id === currentUserId;
      }

      console.log("✅ Challenge details loaded:", challengeWithCreator);
      setSelectedChallenge(challengeWithCreator);
      setShowChallengeModal(true);
    } catch (err) {
      console.error("❌ Error viewing challenge from message:", err);
      setError("Failed to load challenge details");
    }
  };

  const joinChallenge = async () => {
    if (!currentUserId) {
      setError("Please log in to join challenges.");
      setShowChallengeModal(false);
      return;
    }

    setJoiningChallenge(true);
    
    try {
      // Check if user has sufficient balance
      const entryFee = selectedChallenge.entry_fee;
      
      // Fetch user's wallet balance
      const response = await fetch(
        `https://safcom-payment.onrender.com/api/wallet/transaction?user_id=${currentUserId}`
      );
      const data = await response.json();
      const balance = data.balance || 0;
      
      if (balance < entryFee) {
        setError(`Insufficient balance. You need ${entryFee} tokens to join this challenge.`);
        setShowChallengeModal(false);
        return;
      }
      
      // Deduct entry fee and join challenge via backend API
      // Deduct entry fee and join challenge via backend API
      const joinResponse = await fetch("https://safcom-payment.onrender.com/api/wallet/join-public-challenge", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: currentUserId,
          challenge_id: selectedChallenge.id
        }),
      });
      
      const result = await joinResponse.json();
      
      if (!joinResponse.ok) {
        throw new Error(result.error || "Failed to join challenge");
      }
      
      // Update local state
      setChallenges(prev => {
        const updated = prev.map(c =>
          c.id === selectedChallenge.id
            ? {
                ...c,
                hasJoined: true,
                current_participants: (c.current_participants || 1) + 1
              }
            : c
        );
        // If after join it's full, remove it
        return updated.filter(c =>
          c.id !== selectedChallenge.id
            ? true
            : ((c.current_participants || 1) < c.participants)
        );
      });
      
      setShowChallengeModal(false);
      setError(null);
      // Show success message
      setMessages(prev => [...prev, {
        id: `join-${Date.now()}`,
        user_id: currentUserId,
        username: "System",
        message: `You've joined the ${selectedChallenge.game_type} challenge!`,
        created_at: new Date().toISOString()
      }]);
      
    } catch (err) {
      console.error("Error joining challenge:", err);
      setError(err.message || "Failed to join challenge. Please try again.");
    } finally {
      setJoiningChallenge(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Modal show={showModal} onHide={onClose} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>🌍 Public Chat & Challenges</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container fluid className="py-2">
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Challenges Section */}
{/* Challenges Section - Updated */}
<div className="mb-4">
  <h5>🎯 Available Public Challenges</h5>
  {challengesLoading ? (
    <div className="text-center my-3">
      <Spinner animation="border" size="sm" variant="primary" />
      <p className="mt-2 text-muted">Loading challenges...</p>
    </div>
  ) : challenges.length === 0 ? (
    <div className="text-center text-muted my-3 p-3 border rounded">
      <p>No available public challenges. Create one to get started! 🎮</p>
    </div>
  ) : (
    <div className="challenges-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
      {challenges.map((challenge) => (
        <Card key={challenge.id} className="mb-2">
          <Card.Body className="p-2">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-0">{challenge.game_type} Challenge</h6>
                <small className="text-muted">
                  By: {challenge.creator?.username || challenge.creator_username || "Unknown"} • 
                  Entry: {challenge.entry_fee} tokens • 
                  Prize: {challenge.prize_amount} tokens • 
                  Players: {challenge.current_participants || challenge.participants}/2
                </small>
              </div>
              <div className="d-flex align-items-center">
                <Badge bg={challenge.hasJoined ? "success" : "primary"} className="me-2">
                  {challenge.hasJoined ? "Joined" : "Available"}
                </Badge>
                <Button 
                  size="sm" 
                  variant="outline-primary"
                  onClick={() => viewChallengeDetails(challenge)}
                  disabled={challenge.hasJoined}
                >
                  <Eye size={14} className="me-1" />
                  {challenge.hasJoined ? "Joined" : "Join"}
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      ))}
    </div>
  )}
</div>

          {/* Messages Container */}
          <div
            style={{
              border: "1px solid #dee2e6",
              borderRadius: 8,
              padding: 16,
              height: "40vh",
              overflowY: "auto",
              backgroundColor: "#f8f9fa",
              marginBottom: 16,
            }}
          >
            {loading ? (
              <div className="text-center my-5">
                <Spinner animation="border" variant="primary"/>
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
                        
                        {/* Show View Challenge button for challenge messages */}
                        {msg.message_type === 'challenge' && msg.challenge_data && (
                          <div className="mt-2">
                            <Button 
                              size="sm" 
                              variant="outline-primary"
                              onClick={() => viewChallengeFromMessage(msg.challenge_data)}
                              className="me-2"
                            >
                              <Eye size={14} className="me-1" />
                              View Challenge
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <small className="text-muted" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </small>
                        
                        {/* Show delete option for user's own messages */}
                        {currentUserId === msg.user_id && (
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
      </Modal.Body>

      {/* Challenge Details Modal */}
      <Modal show={showChallengeModal} onHide={() => setShowChallengeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <Trophy size={20} className="me-2" />
            Challenge Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedChallenge && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5>{selectedChallenge.game_type} Challenge</h5>
                <Badge bg={selectedChallenge.hasJoined ? "success" : "primary"}>
                  {selectedChallenge.hasJoined ? "Already Joined" : "Welcome"}
                </Badge>
              </div>
              
              <div className="mb-3">
                <strong>Created by:</strong> {selectedChallenge.creator?.username || "Unknown"}
              </div>
              
              <div className="mb-3">
                <strong>Entry Fee:</strong> {selectedChallenge.entry_fee} tokens
              </div>
              
              <div className="mb-3">
                <strong>Prize Pool:</strong> {(selectedChallenge.entry_fee * selectedChallenge.participants * 0.85).toFixed(2)} tokens
              </div>
              
              <div className="mb-3">
                <strong>Participants:</strong> {selectedChallenge.current_participants || 1} / {selectedChallenge.total_participants}
              </div>
              
              <div className="mb-3">
                <Clock size={16} className="me-1" />
                <strong>Play Time:</strong> {formatDate(selectedChallenge.play_time)}
              </div>
              
              <div className="mb-3">
                <strong>Rules:</strong>
                <div className="border p-2 mt-1 rounded bg-light">
                  {selectedChallenge.rules}
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowChallengeModal(false)}>
            Close
          </Button>
          {selectedChallenge && !selectedChallenge.hasJoined && (
            <Button 
              variant="primary" 
              onClick={joinChallenge}
              disabled={joiningChallenge}
            >
              {joiningChallenge ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Joining...
                </>
              ) : (
                <>
                  <PlusCircle size={16} className="me-1" />
                  Join Challenge ({selectedChallenge.entry_fee} tokens)
                </>
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Modal>
  );
};

export default PublicChatModal;