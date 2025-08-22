import React, { useState, useContext, useEffect, useRef } from "react";
import { Container, Card, Form, Button, Row, Col, Modal, Alert,Spinner,ListGroup } from "react-bootstrap";
import { ArrowLeft, Users, Calendar, DollarSign, Trophy, X, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import MainLayout from "../Components/MainLayout";

const supabaseUrl = 'https://yfboormaqzgjxbskjnuk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmYm9vcm1hcXpnanhic2tqbnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0Nzc0MDYsImV4cCI6MjA3MDA1MzQwNn0.CnQkxFOD8LgImr5NCFV3m7z1FpLqdBoPqDEns5J6d6k';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CreateChallenge = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    entryFee: "",
    participants: 2,
    playTime: "",
    challengeType: "open",
    gameType: "",
    rules: ""
  });
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [lowBalanceModalOpen, setLowBalanceModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [balance, setBalance] = useState(0);
  const [userId, setUserId] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // User search states
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceTimeout = useRef(null);

  // Game types - you can edit this list to fit your games
  const gameTypes = [
    { value: "pes", label: "PES (Pro Evolution Soccer)" },
    { value: "fifa", label: "FIFA" },
    { value: "cod", label: "Call of Duty" },
    { value: "fortnite", label: "Fortnite" },
    { value: "apex", label: "Apex Legends" },
    { value: "valorant", label: "Valorant" }
  ];

  // ✅ Get logged-in user from Supabase and fetch balance
  useEffect(() => {
    const getProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
        
        // Fetch user profile data for username
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();
        
        setCurrentUser({ id: user.id, username: profile?.username || "Unknown" });
        
        // fetch wallet balance once user is ready
        fetchBalance(user.id);
      }
    };

    getProfile();
  }, []);

  // ✅ Fetch balance from backend 
  const fetchBalance = async (uid) => {
    try {
      console.log("Fetching balance for user:", uid);
      const res = await fetch(
        `http://localhost:5000/api/wallet/transaction?user_id=${uid}`
      );
      const data = await res.json();
      console.log("Balance response:", data);
      const newBalance = data.balance || 0;
      setBalance(newBalance);
      
      // ✅ Dispatch custom event to update TopNavbar
      window.dispatchEvent(new CustomEvent('balanceUpdated', {
        detail: { balance: newBalance }
      }));
      
    } catch (err) {
      console.error("Fetch balance failed", err);
    }
  };

  // ✅ Add refresh balance function
  const refreshBalance = () => {
    if (userId) {
      fetchBalance(userId);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChallengeTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      challengeType: type
    }));
    
    if (type === "challenge" && !selectedUser) {
      setShowUserModal(true);
    }
  };

  // Calculate prize (85% of total stake)
  const calculatePrize = () => {
    const entryFee = parseFloat(formData.entryFee) || 0;
    const totalStake = entryFee * formData.participants;
    const prize = totalStake * 0.85;
    return prize.toFixed(2);
  };

  // Fetch search results on searchTerm change (debounced)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    // Clear existing timer
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    // Set new debounce timer
    debounceTimeout.current = setTimeout(() => {
      fetchSearchResults(searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimeout.current);
  }, [searchTerm]);

  const fetchSearchResults = async (term) => {
    setSearchLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .ilike("username", `%${term.trim()}%`)
      .limit(20);
    setSearchLoading(false);

    if (error) {
      setAlert({ type: "danger", message: "Error fetching users: " + error.message });
      return;
    }

    setSearchResults(data);
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setShowUserModal(false);
    setSearchTerm("");
    setSearchResults([]);
  };

  const validateForm = () => {
    if (!formData.entryFee || formData.entryFee <= 0) {
      setAlert({ type: "danger", message: "Please enter a valid entry fee" });
      return false;
    }
    
    if (!formData.gameType) {
      setAlert({ type: "danger", message: "Please select a game type" });
      return false;
    }
    
    if (!formData.playTime) {
      setAlert({ type: "danger", message: "Please select a time to play" });
      return false;
    }
    
    if (!formData.rules.trim()) {
      setAlert({ type: "danger", message: "Please enter match rules" });
      return false;
    }
    
    if (formData.challengeType === "challenge" && !selectedUser) {
      setAlert({ type: "danger", message: "Please select a user to challenge" });
      return false;
    }
    
    return true;
  };

  const handleCreateChallengeClick = async () => {
    setAlert(null);
    
    if (!validateForm()) return;
    
    // ✅ Refresh balance before checking
    await fetchBalance(userId);
    
    const entryFee = parseFloat(formData.entryFee);
    if (balance < entryFee) {
      setLowBalanceModalOpen(true);
    } else {
      setConfirmModalOpen(true);
    }
  };

  // ✅ Enhanced function to send challenge message to chat
  const sendChallengeMessage = async (challengeId) => {
    try {
      console.log(`📨 Sending challenge message to user: ${selectedUser.username}`);
      
      const prize = calculatePrize();
      const entryFee = parseFloat(formData.entryFee);
      
      // Insert challenge message into Supabase private_messages table
      const { data, error } = await supabase
        .from('private_messages')
        .insert({
          sender_id: userId,
          recipient_id: selectedUser.id,
          message_type: 'challenge',
          content: `🎮 Challenge: ${gameTypes.find(g => g.value === formData.gameType)?.label} match for ${entryFee} tokens`,
          challenge_data: {
            challenge_id: challengeId,
            game_type: formData.gameType,
            entry_fee: entryFee,
            prize: prize,
            rules: formData.rules,
            play_time: formData.playTime,
            sender_username: currentUser?.username,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
          },
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error("❌ Failed to send challenge to chat:", error);
        throw new Error(error.message);
      }

      console.log("✅ Challenge message sent to chat successfully:", data);
      
      // Optional: Send real-time notification if you have Socket.IO or similar
      try {
        // Emit socket event to notify the recipient in real-time
        if (window.socket) {
          window.socket.emit('challenge_received', {
            recipient_id: selectedUser.id,
            sender_id: userId,
            challenge_id: challengeId,
            message: `New challenge from @${currentUser?.username}: ${formData.gameType} for ${entryFee} tokens`
          });
        }
      } catch (socketError) {
        console.log("📡 Socket notification failed:", socketError);
        // This is not critical, so we don't show error to user
      }
      
      return true;
    } catch (error) {
      console.error("🔥 Error sending challenge to chat:", error);
      throw error;
    }
  };

  const handleConfirmCreate = async () => {
    const entryFee = parseFloat(formData.entryFee);
    setIsSubmitting(true);

    try {
      // ✅ Double-check balance from backend before proceeding
      await fetchBalance(userId);
      
      if (balance < entryFee) {
        setConfirmModalOpen(false);
        setLowBalanceModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      console.log("🎮 Creating challenge:", { 
        userId, 
        entryFee, 
        challengeData: formData,
        selectedUser 
      });

      // ✅ Use backend API to create challenge and deduct tokens
      const response = await fetch("http://localhost:5000/api/wallet/challenge-create", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          user_id: userId,
          entry_fee: entryFee,
          game_type: formData.gameType,
          play_time: formData.playTime,
          rules: formData.rules,
          challenge_type: formData.challengeType,
          target_user_id: selectedUser?.id || null,
          participants: formData.participants
        }),
      });

      // Parse response as JSON
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error("❌ Failed to parse response:", parseError);
        throw new Error("Invalid response from server");
      }

      console.log("🎮 Challenge creation response:", result);

      // Check if response was successful
      if (!response.ok) {
        console.error("❌ Challenge creation failed:", result);
        
        // Handle specific error cases
        if (result.error === "Insufficient balance") {
          setConfirmModalOpen(false);
          setLowBalanceModalOpen(true);
          return;
        }
        
        throw new Error(result.error || result.details || `Server error: ${response.status}`);
      }

      // Check if the operation was successful
      if (!result.success && result.success !== undefined) {
        console.error("❌ Challenge creation was not successful:", result);
        throw new Error(result.error || "Challenge creation failed");
      }
      
      // 🔥 Update local balance state with the new balance from backend
      const newBalance = result.new_balance;
      if (newBalance !== undefined && newBalance !== null) {
        console.log("💰 Updating balance from", balance, "to", newBalance);
        setBalance(newBalance);
        
        // ✅ Dispatch custom event to update TopNavbar with new balance
        window.dispatchEvent(new CustomEvent('balanceUpdated', {
          detail: { balance: newBalance }
        }));
      } else {
        // Fallback: Refresh balance from backend if new_balance not provided
        console.log("⚠️ New balance not provided in response, fetching from backend");
        await fetchBalance(userId);
      }

      // Close modal and show success
      setConfirmModalOpen(false);
      
      // Show enhanced success message with updated balance
      const prize = calculatePrize();
      const challengeTypeText = formData.challengeType === "challenge" 
        ? `sent to @${selectedUser.username}` 
        : "posted publicly";
      
      setAlert({ 
        type: "success", 
        message: `✅ Challenge created successfully and ${challengeTypeText}! ${entryFee} tokens deducted. Prize: ${prize} tokens. New balance: ${newBalance || balance - entryFee} tokens.` 
      });

      // ✅ If it's a specific user challenge, send message to that user's chat
      if (formData.challengeType === "challenge" && selectedUser && result.challenge_id) {
        try {
          await sendChallengeMessage(result.challenge_id);
          
          // Update success message to include chat notification
          setAlert({ 
            type: "success", 
            message: `✅ Challenge created and sent to @${selectedUser.username}! ${entryFee} tokens deducted. Prize: ${prize} tokens. New balance: ${newBalance || balance - entryFee} tokens. 📨 Chat message sent!` 
          });
          
        } catch (chatError) {
          console.error("🔥 Error sending challenge to chat:", chatError);
          // Don't fail the entire operation, just show warning
          setAlert({ 
            type: "warning", 
            message: `⚠️ Challenge created successfully but couldn't send chat message: ${chatError.message}. The challenge is still active!` 
          });
        }
      }
      
      // Navigate back after 3 seconds
      setTimeout(() => {
        navigate("/myzone");
      }, 3000);

    } catch (err) {
      console.error("🔥 Challenge creation error:", err);
      setAlert({ 
        type: "danger", 
        message: `❌ Failed to create challenge: ${err.message}` 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modal styles (same as TournamentDetails)
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

  return (
    <MainLayout>
      <Container className="py-4">
        <div className="d-flex align-items-center mb-4">
          <Button 
            variant="link" 
            className="p-0 me-3 text-decoration-none"
            onClick={() => navigate("/myzone")}
          >
            <ArrowLeft size={20} />
          </Button>
          <h2 className="mb-0">Create Match Challenge</h2>
        </div>

        {/* ✅ Display current balance */}
        <div className="text-center mb-4">
          <p className="text-lg" style={{ color: '#00ffcc' }}>
            Your Balance: <span className="font-bold">{balance} Tokens</span>
            <button 
              onClick={refreshBalance} 
              style={{ 
                marginLeft: '10px', 
                padding: '5px 10px', 
                fontSize: '12px',
                background: '#00ffcc',
                color: 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Refresh
            </button>
          </p>
        </div>

        {alert && (
          <Alert variant={alert.type} className="mb-4">
            {alert.message}
          </Alert>
        )}

        <Row className="justify-content-center">
          <Col lg={8}>
            <Card>
              <Card.Body className="p-4">
                <Form>
                  {/* Game Type */}
                  <Row className="mb-4">
                    <Col>
                      <Form.Group>
                        <Form.Label className="fw-bold">
                          Game Type
                        </Form.Label>
                        <Form.Select
                          name="gameType"
                          value={formData.gameType}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Select a game...</option>
                          {gameTypes.map((game) => (
                            <option key={game.value} value={game.value}>
                              {game.label}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Entry Fee */}
                  <Row className="mb-4">
                    <Col>
                      <Form.Group>
                        <Form.Label className="d-flex align-items-center fw-bold">
                          <DollarSign size={18} className="me-2" />
                          Entry Cost (Tokens)
                        </Form.Label>
                        <Form.Control
                          type="number"
                          name="entryFee"
                          value={formData.entryFee}
                          onChange={handleInputChange}
                          placeholder="Enter entry cost amount"
                          min="1"
                          step="0.01"
                          required
                        />
                        <Form.Text className="text-muted">
                          Current wallet balance: {balance} Tokens
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Prize Display */}
                  {formData.entryFee && (
                    <Row className="mb-4">
                      <Col>
                        <div className="p-3 bg-light rounded border">
                          <div className="d-flex align-items-center">
                            <Trophy size={18} className="me-2 text-warning" />
                            <strong>Prize Pool: {calculatePrize()} Tokens</strong>
                          </div>
                          <small className="text-muted">
                            Total Stake: {(parseFloat(formData.entryFee) * formData.participants).toFixed(2)} Tokens 
                            (85% goes to winner)
                          </small>
                        </div>
                      </Col>
                    </Row>
                  )}

                  {/* Number of Participants */}
                  <Row className="mb-4">
                    <Col>
                      <Form.Group>
                        <Form.Label className="d-flex align-items-center fw-bold">
                          <Users size={18} className="me-2" />
                          Number of Participants
                        </Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.participants}
                          disabled
                          className="bg-light"
                        />
                        <Form.Text className="text-muted">
                          Currently fixed at 2 participants
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Time to be Played */}
                  <Row className="mb-4">
                    <Col>
                      <Form.Group>
                        <Form.Label className="d-flex align-items-center fw-bold">
                          <Calendar size={18} className="me-2" />
                          Time to be Played
                        </Form.Label>
                        <Form.Control
                          type="datetime-local"
                          name="playTime"
                          value={formData.playTime}
                          onChange={handleInputChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Match Rules */}
                  <Row className="mb-4">
                    <Col>
                      <Form.Group>
                        <Form.Label className="fw-bold">
                          Match Rules
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          name="rules"
                          value={formData.rules}
                          onChange={handleInputChange}
                          placeholder="Enter the rules for this match (e.g., No cheating, 90 minutes gameplay, Screenshots required for proof, etc.)"
                          required
                        />
                        <Form.Text className="text-muted">
                          Be specific about rules to avoid disputes
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Challenge Type */}
                  <Row className="mb-4">
                    <Col>
                      <Form.Group>
                        <Form.Label className="fw-bold">Challenge Type</Form.Label>
                        <div className="mt-2">
                          <Form.Check
                            type="radio"
                            id="open-challenge"
                            name="challengeType"
                            value="open"
                            checked={formData.challengeType === "open"}
                            onChange={(e) => handleChallengeTypeChange(e.target.value)}
                            label="Open Challenge (Public)"
                            className="mb-2"
                          />
                          <Form.Check
                            type="radio"
                            id="challenge-user"
                            name="challengeType"
                            value="challenge"
                            checked={formData.challengeType === "challenge"}
                            onChange={(e) => handleChallengeTypeChange(e.target.value)}
                            label="Challenge Specific User (Private)"
                          />
                        </div>
                        
                        {formData.challengeType === "challenge" && (
                          <div className="mt-3 p-3 bg-light rounded">
                            {selectedUser ? (
                              <div className="d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center">
                                  <img
                                    src={selectedUser.avatar_url || "https://picsum.photos/40"}
                                    alt={`${selectedUser.username}'s avatar`}
                                    style={{ width: 40, height: 40, borderRadius: "50%" }}
                                    className="me-3"
                                  />
                                  <div>
                                    <strong>Selected User:</strong> {selectedUser.username}
                                    <br />
                                    <small className="text-muted">@{selectedUser.username}</small>
                                  </div>
                                </div>
                                <Button 
                                  variant="outline-primary" 
                                  size="sm"
                                  onClick={() => setShowUserModal(true)}
                                >
                                  Change
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline-primary"
                                onClick={() => setShowUserModal(true)}
                              >
                                Select User to Challenge
                              </Button>
                            )}
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Submit Button */}
                  <div className="d-flex justify-content-end gap-3">
                    <Button 
                      variant="outline-secondary"
                      onClick={() => navigate("/myzone")}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateChallengeClick}
                      variant="primary"
                      disabled={isSubmitting}
                      className="d-flex align-items-center"
                    >
                      <CreditCard size={18} className="me-2" />
                      {isSubmitting ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Creating...
                        </>
                      ) : (
                        "Create Challenge"
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* User Search Modal */}
        <Modal show={showUserModal} onHide={() => setShowUserModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Select User to Challenge</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="searchInput">
              <Form.Control
                type="text"
                placeholder="Start typing username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </Form.Group>

            {searchLoading && (
              <div className="text-center py-3">
                <Spinner size="sm" className="me-2" />
                Loading...
              </div>
            )}

            <ListGroup style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {searchResults.length === 0 && searchTerm.trim() !== "" && !searchLoading && (
                <ListGroup.Item className="text-center text-muted">
                  No users found.
                </ListGroup.Item>
              )}
              {searchResults.map((user) => (
                <ListGroup.Item
                  action
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="d-flex align-items-center"
                >
                  <img
                    src={user.avatar_url || "https://picsum.photos/40"}
                    alt={`${user.username}'s avatar`}
                    style={{ width: 32, height: 32, borderRadius: "50%" }}
                    className="me-3"
                  />
                  <div>
                    <div className="fw-medium">{user.username}</div>
                    <small className="text-muted">@{user.username}</small>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowUserModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Confirm Create Challenge Modal (similar to tournament join) */}
        <Modal
          show={confirmModalOpen}
          onHide={() => setConfirmModalOpen(false)}
          style={modalStyles}
          contentLabel="Confirm Challenge Creation"
        >
          <div className="text-white">
            <button 
              style={{background: '#00ffcc', border:'none', borderRadius:'20px'}}
              onClick={() => setConfirmModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold mb-4 pr-8" style={{color: '#00ffcc'}} >
              Confirm Challenge Creation
            </h2>
            <div className="mb-6 text-gray-300">
              <p className="mb-3">
                <strong>Game:</strong> {gameTypes.find(g => g.value === formData.gameType)?.label}
              </p>
              <p className="mb-3">
                <strong>Entry Fee:</strong> <span style={{color: '#00ffcc'}} className="font-bold">{formData.entryFee} Tokens</span>
              </p>
              <p className="mb-3">
                <strong>Prize:</strong> <span style={{color: '#00ffcc'}} className="font-bold">{calculatePrize()} Tokens</span>
              </p>
              <p className="mb-3">
                <strong>Type:</strong> {formData.challengeType === "challenge" ? `Challenge to @${selectedUser?.username}` : "Open Challenge"}
              </p>
              <p className="text-sm text-gray-400">
                Are you sure you want to create this challenge?
              </p>
            </div>
            <div className="flex space-x-4">
             <button 
              style={{background: '#00ffcc', border:'none', padding:'7px 27px', borderRadius:'10px', marginTop:'10px'}}
              onClick={handleConfirmCreate}
              disabled={isSubmitting}
              className="flex-1 bg-[#00ffcc] text-black font-bold py-3 rounded hover:bg-[#00e6b8] transition-all shadow-[0_0_10px_#00ffccaa] disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Yes, Create Challenge"}
            </button>
            <button 
              style={{background: '#00ffcc', border:'none', padding:'7px 27px', borderRadius:'10px'}}
              onClick={() => setConfirmModalOpen(false)}
              className="flex-1 bg-gray-800 text-white font-bold py-3 rounded hover:bg-gray-700 transition-colors border border-gray-600"
            >
              Cancel
            </button>
            </div>
          </div>
        </Modal>

        {/* Low Balance Modal (same as tournament) */}
        <Modal
          show={lowBalanceModalOpen}
          onHide={() => setLowBalanceModalOpen(false)}
          style={modalStyles}
          contentLabel="Insufficient Balance"
        >
          <div className="text-white">
            <button 
              style={{background: '#00ffcc', border:'none', borderRadius:'20px'}}
              onClick={() => setLowBalanceModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold text-red-400 mb-4 pr-8">
              Insufficient Balance
            </h2>
            <div className="mb-6">
              <p className="text-gray-300 mb-2">
                You don't have enough tokens to create this challenge.
              </p>
              <div className="bg-[#1a1a1a] p-3 rounded border border-gray-700">
                <p className="text-sm text-gray-400">Required:</p>
                <p className="text-lg font-semibold" style={{color: '#00ffcc'}}>
                  {formData.entryFee} Tokens
                </p>
                <p className="text-sm text-gray-400 mt-2">Your Balance:</p>
                <p className="text-lg font-semibold text-red-400">
                  {balance} Tokens
                </p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button 
                style={{background: '#00ffcc', border:'none', padding:'7px 17px', borderRadius:'10px'}}
                onClick={() => {
                  setLowBalanceModalOpen(false);
                  navigate("/wallet");
                }}
                className="flex-1 bg-[#00ffcc] text-black font-bold py-3 rounded hover:bg-[#00e6b8] transition-all shadow-[0_0_10px_#00ffccaa]"
              >
                Deposit Now
              </button>
              <button 
                style={{background: '#00ffcc', border:'none', padding:'7px 27px', borderRadius:'10px', marginTop:'10px', marginLeft:'10px'}}
                onClick={() => setLowBalanceModalOpen(false)}
                className="py-3 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      </Container>
    </MainLayout>
  );
};

export default CreateChallenge;