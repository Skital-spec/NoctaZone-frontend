import React, { useState, useContext, useEffect, useRef } from "react";
import { Container, Card, Form, Button, Row, Col, Modal, Alert,Spinner,ListGroup } from "react-bootstrap";
import { ArrowLeft, Users, Calendar, Trophy, X, CreditCard } from "lucide-react";
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
    { value: "konami", label: "Konami (Efootball)" },
    { value: "dreamleague", label: "Dream League Soccer 2025" },
    { value: "easportsfc", label: "EA SPORTS FC Mobile Football" },
    { value: "footballleague", label: "Football League 2025" },
    { value: "cod", label: "Call of Duty" },
    { value: "pubg", label: "PUBG" },
    { value: "realpool3d", label: "Real Pool 3D" },
    { value: "fortnite", label: "Fortnite" },
    { value: "chess", label: "Chess" },
    {value: "needforspeed", label: "Need for Speed"},
    { value: "asphaltlegends", label: "Asphalt Legends" },
    { value: "minecraft", label: "Minecraft" },
    { value: "valorant", label: "Valorant" },
    { value: "leagueoflegends", label: "League of Legends" },   
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
        `https://safcom-payment.onrender.com/api/wallet/transaction?user_id=${uid}`
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

  // ✅ Function removed - server now handles sending private challenge messages
  // This prevents duplicate messages from being sent

  // ✅ Function removed - server now handles sending public challenge messages
  // This prevents duplicate messages from being sent

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
      const response = await fetch("https://safcom-payment.onrender.com/api/wallet/challenge-create", {
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

      // ✅ If it's a specific user challenge, the server already sends the message
      // We don't need to send another duplicate message from the frontend
      if (formData.challengeType === "challenge" && selectedUser && result.challenge_id) {
        // Server already handles sending the message, so we just update the success message
        setAlert({ 
          type: "success", 
          message: `✅ Challenge created and sent to @${selectedUser.username}! ${entryFee} tokens deducted. Prize: ${prize} tokens. New balance: ${newBalance || balance - entryFee} tokens.` 
        });
      }
      
      // ✅ If it's a public challenge, the server already sends the message
      // We don't need to send another duplicate message from the frontend
      if (formData.challengeType === "open" && result.challenge_id) {
        // Server already handles sending the message, so we just update the success message
        setAlert({ 
          type: "success", 
          message: `✅ Public challenge created and posted to public chat! ${entryFee} tokens deducted. Prize: ${prize} tokens. New balance: ${newBalance || balance - entryFee} tokens.` 
        });
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
                          Kshs
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
                          Current wallet balance: {parseFloat(balance || 0).toFixed(2)} Tokens
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
                          <div className="mt-3">
                            <div className="p-3 bg-light rounded">
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
                            
                            {selectedUser && (
                              <div className="mt-3 p-3 rounded" style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}>
                                <div className="d-flex align-items-start">
                                  <div className="text-warning me-2" style={{ fontSize: '18px' }}>⏰</div>
                                  <div>
                                    <strong style={{ color: '#856404' }}>Notice:</strong>
                                    <p className="mb-0 small" style={{ color: '#664d03', marginTop: '4px' }}>
                                      If this challenge is not accepted within <strong>12 hours</strong>, it will automatically expire and your tokens will be refunded to your wallet.
                                    </p>
                                  </div>
                                </div>
                              </div>
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
          centered
          contentLabel="Confirm Challenge Creation"
        >
          <div className="text-white" style={{ position: 'relative' }}>
            <button 
              style={{background: '#00ffcc', border:'none', borderRadius:'20px', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 12, right: 12 }}
              onClick={() => setConfirmModalOpen(false)}
            >
              <X size={20} color="#000" />
            </button>
            <h2 className="mb-3" style={{color: '#00ffcc', fontWeight: 700, paddingRight: '40px', fontSize: 20}}>
              Confirm Challenge Creation
            </h2>
            <div className="mb-4" style={{ color: '#d1d5db' }}>
              <p className="mb-2">
               <span style={{color: '#000000ad', fontWeight: 700}}><strong>Game: </strong> </span> <span style={{color: '#00ffcc', fontWeight: 700}}>{gameTypes.find(g => g.value === formData.gameType)?.label}</span>
              </p>
              <p className="mb-2">
              <span style={{color: '#000000ad', fontWeight: 700}}>  <strong>Entry Fee: </strong></span><span style={{color: '#00ffcc', fontWeight: 700}}>{formData.entryFee} Tokens</span>
              </p>
              <p className="mb-2">
              <span style={{color: '#000000ad', fontWeight: 700}}>  <strong>Prize: </strong></span><span style={{color: '#00ffcc', fontWeight: 700}}>{calculatePrize()} Tokens</span>
              </p>
              <p className="mb-3">
              <span style={{color: '#000000ad', fontWeight: 700}}>  <strong>Type: </strong></span><span style={{color: '#00ffcc', fontWeight: 700}}>{formData.challengeType === "challenge" ? `Challenge to @${selectedUser?.username}` : "Open Challenge"}</span>
              </p>
              <p className="text-muted" style={{ fontSize: 14 }}>
                Are you sure you want to create this challenge?
              </p>
            </div>
            <div className="d-flex flex-column flex-sm-row gap-3">
              <button 
                style={{background: '#00ffcc', border:'none', padding:'10px 20px', borderRadius:'10px', fontWeight: 700}}
                onClick={handleConfirmCreate}
                disabled={isSubmitting}
                className="w-100"
              >
                {isSubmitting ? "Creating..." : "Yes, Create Challenge"}
              </button>
              <button 
                style={{background: 'transparent', border:'1px solid #3a3a3a', color:'#000000ad', padding:'10px 20px', borderRadius:'10px', fontWeight: 700}}
                onClick={() => setConfirmModalOpen(false)}
                className="w-100"
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
          centered
          contentLabel="Insufficient Balance"
        >
          <div className="text-white" style={{ position: 'relative' }}>
            <button 
              style={{background: '#00ffcc', border:'none', borderRadius:'20px', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 12, right: 12 }}
              onClick={() => setLowBalanceModalOpen(false)}
            >
              <X size={20} color="#000" />
            </button>
            <h2 className="mb-3" style={{ color: '#ff6b6b', fontWeight: 700, paddingRight: '40px', fontSize: 20 }}>
              Insufficient Balance
            </h2>
            <div className="mb-4">
              <p className="mb-2" style={{ color: '#d1d5db' }}>
                You don't have enough tokens to create this challenge.
              </p>
              <div style={{ background:'#1a1a1a', padding:'12px', borderRadius: '10px', border:'1px solid #3a3a3a' }}>
                <p className="mb-1" style={{ color:'#9ca3af', fontSize: 14 }}>Required:</p>
                <p className="mb-2" style={{ color:'#00ffcc', fontSize: 18, fontWeight: 600 }}>
                  {formData.entryFee} Tokens
                </p>
                <p className="mb-1" style={{ color:'#9ca3af', fontSize: 14 }}>Your Balance:</p>
                <p className="mb-0" style={{ color:'#ff6b6b', fontSize: 18, fontWeight: 600 }}>
                  {parseFloat(balance || 0).toFixed(2)} Tokens
                </p>
              </div>
            </div>
            <div className="d-flex flex-column flex-sm-row gap-3">
              <button 
                style={{background: '#00ffcc', border:'none', padding:'10px 20px', borderRadius:'10px', fontWeight: 700}}
                onClick={() => {
                  setLowBalanceModalOpen(false);
                  navigate("/wallet");
                }}
                className="w-100"
              >
                Deposit Now
              </button>
              <button 
                style={{background: 'transparent', border:'1px solid #3a3a3a', color:'#fff', padding:'10px 20px', borderRadius:'10px', fontWeight: 700}}
                onClick={() => setLowBalanceModalOpen(false)}
                className="w-100"
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