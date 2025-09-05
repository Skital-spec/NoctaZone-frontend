import React, { useState, useEffect } from "react";
import { Container, Button, Card, Badge, Spinner, Alert, Modal } from "react-bootstrap";
import { Gamepad, Search, Clock, Trophy, Plus, Users, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../Components/MainLayout";
import { supabase } from "../supabaseClient";

const MyZone = () => {
  const [activeTab, setActiveTab] = useState("matches");
  const navigate = useNavigate();
  
  // States for Find a Match tab
  const [publicChallenges, setPublicChallenges] = useState([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [joiningChallenge, setJoiningChallenge] = useState(false);
  const [error, setError] = useState(null);
  const [matchHistory, setMatchHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryMatch, setSelectedHistoryMatch] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);


  const tabs = [
    { id: "matches", label: "My Matches", icon: <Gamepad size={18} /> },
    { id: "find", label: "Find a Match", icon: <Search size={18} /> },
    { id: "history", label: "Match History", icon: <Clock size={18} /> },
    { id: "tournaments", label: "My Tournaments", icon: <Trophy size={18} /> },
  ];

  // Get current user ID on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        setCurrentUserId(user.id);
      }
    };

    getCurrentUser();
  }, []);

  // Fetch public challenges when Find a Match tab is active
  useEffect(() => {
    if (activeTab === "find" && currentUserId) {
      fetchPublicChallenges();
    }
  }, [activeTab, currentUserId]);

  // Fetch match history when History tab is active
  useEffect(() => {
    if (activeTab === "history" && currentUserId) {
      fetchMatchHistory();
    }
  }, [activeTab, currentUserId]);

  const fetchPublicChallenges = async () => {
    setChallengesLoading(true);
    setError(null);
    
    try {
      // Use backend API to fetch public challenges
      const response = await fetch(`https://safcom-payment.onrender.com/api/challenges/public?user_id=${currentUserId}`);
      const result = await response.json();

      if (!response.ok) {
        console.error("Error fetching challenges:", result.error);
        setError(result.error || "Failed to load challenges. Please try again.");
        return;
      }

      if (result.success && result.challenges) {
        setPublicChallenges(result.challenges);
      } else {
        setPublicChallenges([]);
      }
    } catch (err) {
      console.error("Error in fetchPublicChallenges:", err);
      setError("Failed to load challenges.");
    } finally {
      setChallengesLoading(false);
    }
  };

  // Filter challenges to only show those created within the last 72 hours
const filteredChallenges = publicChallenges.filter((challenge) => {
  const createdAt = new Date(challenge.created_at);
  const now = new Date();
  const hoursDiff = (now - createdAt) / (1000 * 60 * 60);
  return hoursDiff <= 72;
});

  const fetchMatchHistory = async () => {
    setHistoryLoading(true);
    setError(null);
    
    try {
      // Check if we have a valid user ID
      if (!currentUserId) {
        console.log("⚠️ No currentUserId available, skipping fetch");
        setMatchHistory([]);
        return;
      }

      console.log("🔍 Fetching match history for user:", currentUserId);
      
      // Try a simpler query first - just get all challenges
      const { data: allChallenges, error: allChallengesError } = await supabase
        .from("challenges")
        .select("*");

      console.log("🔍 All challenges query result:", { data: allChallenges, error: allChallengesError });
      
      if (allChallengesError) {
        console.error("❌ Error fetching all challenges:", allChallengesError);
        setError("Failed to load challenges");
        return;
      }

      // Filter challenges for this user manually
      const userCreatedChallenges = allChallenges?.filter(c => c.creator_id === currentUserId) || [];
      console.log("🔍 User created challenges (filtered):", userCreatedChallenges);
      
      // Get participations
      const { data: allParticipations, error: participationsError } = await supabase
        .from("challenge_participants")
        .select("*");

      console.log("�� All participations query result:", { data: allParticipations, error: participationsError });
      
      if (participationsError) {
        console.error("❌ Error fetching participations:", participationsError);
        setError("Failed to load participations");
        return;
      }

      // Filter participations for this user
      const userParticipations = allParticipations?.filter(p => p.user_id === currentUserId) || [];
      console.log("🔍 User participations (filtered):", userParticipations);
      
      // Get challenge details for participations
      const participatedChallenges = userParticipations.map(participation => {
        const challenge = allChallenges?.find(c => c.id === participation.challenge_id);
        return {
          ...challenge,
          participation_type: "joined",
          joined_at: participation.joined_at,
          entry_fee_paid: participation.entry_fee_paid,
          creator: { username: "Unknown", avatar_url: null }
        };
      }).filter(Boolean); // Remove any undefined challenges

      console.log("🔍 Participated challenges:", participatedChallenges);
      
      // Format created challenges
      const createdChallenges = userCreatedChallenges.map(challenge => ({
        ...challenge,
        participation_type: "created",
        joined_at: challenge.created_at,
        entry_fee_paid: challenge.entry_fee,
        creator: { username: "You", avatar_url: null }
      }));

      console.log("�� Created challenges:", createdChallenges);

      // Combine and sort by date
      const allMatches = [...participatedChallenges, ...createdChallenges]
        .sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at));

      console.log("🔍 Final combined matches:", allMatches);
      setMatchHistory(allMatches);
      
    } catch (err) {
      console.error("Error in fetchMatchHistory:", err);
      setError("Failed to load match history");
    } finally {
      setHistoryLoading(false);
    }
  };

const handleJoinChallenge = async (challenge) => {
  if (!currentUserId) {
    setError("Please log in to join challenges.");
    return;
  }

  if (challenge.creator_id === currentUserId) {
    setError("You cannot join your own challenge.");
    return;
  }

  setJoiningChallenge(true);
  try {
    // Use backend API to join the challenge
    const response = await fetch("https://safcom-payment.onrender.com/api/wallet/join-public-challenge", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        user_id: currentUserId,
        challenge_id: challenge.id
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Error joining challenge:", result.error);
      setError(result.error || `Failed to join challenge: ${result.details || 'Unknown error'}`);
      return;
    }

    if (result.success) {
      // Redirect to challenge page after joining
      navigate(`/challenge/${challenge.id}`);
      return;
    } else {
      setError("Failed to join challenge. Please try again.");
    }
    
  } catch (err) {
    console.error("Error joining challenge:", err);
    setError(`Failed to join challenge: ${err.message}`);
  } finally {
    setJoiningChallenge(false);
  }
};

  const handleCreateChallenge = () => {
    navigate("/createchallenge");
  };

  return (
    <MainLayout>
      <div className="myzone-page">
      <style>
          {`
            .challenge-card {
              transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
              border: 1px solid #e0e0e0;
            }
            
            .challenge-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            .challenge-card .card-body {
              padding: 1.5rem;
            }
            
            .challenge-card .card-title {
              color: #2c3e50;
              font-weight: 600;
            }
            
            .myzone-tabs {
              display: flex;
              background: #f8f9fa;
              border-bottom: 1px solid #dee2e6;
              margin-bottom: 0;
            }
            
            .myzone-tab {
              flex: 1;
              padding: 1rem;
              text-align: center;
              cursor: pointer;
              border-bottom: 3px solid transparent;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 0.5rem;
            }
            
            .myzone-tab:hover {
              background: #e9ecef;
            }
            
            .myzone-tab.active {
              border-bottom-color: #007bff;
              background: #fff;
              font-weight: 600;
            }
            
            .tab-arrow {
              width: 100%;
              height: 3px;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-top: 5px solid #00ffcc;
              position: absolute;
              bottom: -3px;
              left: 50%;
              transform: translateX(-50%);
            }
            
            .tab-content {
              padding: 2rem 0;
            }

            /* Themed modal for Join Challenge */
            .challenge-modal-content {
              background-color: #0d0d0d;
              border: 2px solid #00ffcc;
              border-radius: 12px;
              box-shadow: 0 0 15px #00ffcc55;
              color: #e5e7eb;
            }
            .challenge-modal-header {
              border-bottom: 1px solid rgba(0,255,204,0.25);
              background: linear-gradient(180deg, rgba(0,255,204,0.07) 0%, rgba(13,13,13,1) 100%);
            }
            .challenge-modal-title {
              color: #00ffcc;
              font-weight: 700;
            }
            .challenge-modal-section {
              background: #121212;
              border: 1px solid #2a2a2a;
              border-radius: 10px;
              padding: 12px;
            }
            .challenge-modal-label {
              color: #9ca3af;
              font-size: 0.85rem;
            }
            .challenge-modal-value {
              color: #e5e7eb;
              font-weight: 600;
            }
          `}
        </style>
        {/* Navbar Tabs - use wallet theme classes */}
        <div className="help-tabs flex-nowrap">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`help-tab ${activeTab === tab.id ? "active" : ""}`} 
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span style={{ marginLeft: "6px" }}>{tab.label}</span>
              {activeTab === tab.id && <div className="tab-arrow" />}
            </div>
          ))}
        </div>

        <Container className="py-4">
          {activeTab === "matches" && (
            <div className="tab-content">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>My Matches</h2>
                <Button 
                  variant="primary" 
                  onClick={handleCreateChallenge}
                  className="d-flex align-items-center"
                >
                  <Plus size={18} className="me-2" />
                  Create Match Challenge
                </Button>
              </div>
              <p>Create challenges, track matches, and compete with other players.</p>
            </div>
          )}
{activeTab === "find" && (
  <div className="tab-content">
    <div className="d-flex justify-content-between align-items-center mb-4">
      <h2>Find a Match</h2>
      <Button 
        variant="primary" 
        onClick={handleCreateChallenge}
        className="d-flex align-items-center"
      >
        <Plus size={18} className="me-2" />
        Create Challenge
      </Button>
    </div>
    
    {error && (
      <Alert variant="danger" className="mb-4">
        {error}
      </Alert>
    )}

    {challengesLoading ? (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading available challenges...</p>
      </div>
    ) : filteredChallenges.length === 0 ? (
      <div className="text-center py-5">
        <Search size={48} className="text-muted mb-3" />
        <h4>No Public Challenges Available</h4>
        <p className="text-muted">
          There are currently no public challenges to join. 
          Be the first to create one!
        </p>
        
      </div>
    ) : (
      <div className="row">
        {filteredChallenges.map((challenge) => {
          // Assume max participants is 2 unless you have a field for it
          const maxParticipants = challenge.total_participants || 2;
          const isFull = challenge.participants >= maxParticipants;
          return (
            <div key={challenge.id} className="col-md-6 col-lg-4 mb-4">
              <Card className="h-100 challenge-card">
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                    <img
                      src={challenge.creator?.avatar_url || "https://picsum.photos/40"}
                      alt={`${challenge.creator?.username}'s avatar`}
                      style={{ width: 40, height: 40, borderRadius: "50%" }}
                      className="me-3"
                    />
                    <div>
                      <h6 className="mb-0">{challenge.creator?.username}</h6>
                      <small className="text-muted">
                        {new Date(challenge.created_at).toLocaleDateString()}
                      </small>
                    </div>
                  </div>
                  
                  <h5 className="card-title mb-3">
                    {challenge.game_type?.toUpperCase()} Challenge
                  </h5>
                  
                  <div className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      Kshs<span className="fw-bold">: {challenge.entry_fee}Tokens</span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <Trophy size={16} className="me-2 text-warning" />
                      <span className="fw-bold">{challenge.prize_amount} Tokens Prize</span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <Calendar size={16} className="me-2 text-info" />
                      <span>{new Date(challenge.play_time).toLocaleString()}</span>
                    </div>
                    <div className="d-flex align-items-center">
                      <Users size={16} className="me-2 text-primary" />
                      <span>{maxParticipants} Participants</span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h6>Rules:</h6>
                    <p className="text-muted small">
                      {challenge.rules?.length > 100 
                        ? `${challenge.rules.substring(0, 100)}...` 
                        : challenge.rules}
                    </p>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center">
                    <Badge 
                      bg={
                        isFull
                          ? "secondary"
                          : challenge.hasJoined
                          ? "success"
                          : "primary"
                      }
                      className="mb-0"
                    >
                      {isFull
                        ? "Completed"
                        : challenge.hasJoined
                        ? "Joined"
                        : "Available"}
                    </Badge>
                    
                    {isFull ? (
                      <Button variant="secondary" size="sm" disabled>
                        Completed
                      </Button>
                    ) : !challenge.hasJoined && challenge.creator_id !== currentUserId ? (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => {
                          setSelectedChallenge(challenge);
                          setShowChallengeModal(true);
                        }}
                      >
                        Join Challenge
                      </Button>
                    ) : challenge.hasJoined ? (
                      <Button variant="success" size="sm" disabled>
                        Already Joined
                      </Button>
                    ) : challenge.isOwnChallenge ? (
                      <Button variant="secondary" size="sm" disabled>
                        Your Challenge
                      </Button>
                    ) : null}
                  </div>
                </Card.Body>
              </Card>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}

{activeTab === "history" && (
            <div className="tab-content">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Match History</h2>
                <Button 
                  variant="outline-primary" 
                  onClick={fetchMatchHistory}
                  disabled={historyLoading}
                >
                  {historyLoading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Refreshing...
                    </>
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>
              
              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}

              {historyLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3">Loading your match history...</p>
                </div>
              ) : matchHistory.length === 0 ? (
                <div className="text-center py-5">
                  <Clock size={48} className="text-muted mb-3" />
                  <h4>No Match History</h4>
                  <p className="text-muted">
                    You haven't participated in any challenges yet. 
                    Start by joining or creating a challenge!
                  </p>
                  <Button 
                    variant="primary" 
                    onClick={() => setActiveTab("find")}
                    className="d-flex align-items-center mx-auto"
                  >
                    <Search size={18} className="me-2" />
                    Find a Match
                  </Button>
                </div>
              ) : (
                <div className="row">
                  {matchHistory.map((match) => (
                    <div key={match.id} className="col-md-6 col-lg-4 mb-4">
                      <Card className="h-100 challenge-card">
                        <Card.Body>
                          <div className="d-flex align-items-center mb-3">
                            <img
                              src={match.creator?.avatar_url || "https://picsum.photos/40"}
                              alt={`${match.creator?.username}'s avatar`}
                              style={{ width: 40, height: 40, borderRadius: "50%" }}
                              className="me-3"
                            />
                            <div>
                              <h6 className="mb-0">{match.creator?.username}</h6>
                              <small className="text-muted">
                                {new Date(match.joined_at).toLocaleDateString()}
                              </small>
                            </div>
                          </div>
                          
                          <h5 className="card-title mb-3">
                            {match.game_type?.toUpperCase()} Challenge
                          </h5>
                          
                          <div className="mb-3">
                            <div className="d-flex align-items-center mb-2">
                              <Badge bg={match.participation_type === "created" ? "primary" : "success"} className="me-2">
                                {match.participation_type === "created" ? "Created" : "Joined"}
                              </Badge>
                              <Badge bg={match.status === "completed" ? "success" : match.status === "active" ? "warning" : "secondary"}>
                                {match.status}
                              </Badge>
                            </div>
                            <div className="d-flex align-items-center mb-2">
                              <span className="fw-bold">{match.entry_fee} Tokens</span>
                            </div>
                            <div className="d-flex align-items-center mb-2">
                              <Trophy size={16} className="me-2 text-warning" />
                              <span className="fw-bold">{match.prize_amount} Tokens Prize</span>
                            </div>
                            <div className="d-flex align-items-center mb-2">
                              <Calendar size={16} className="me-2 text-info" />
                              <span>{new Date(match.play_time).toLocaleString()}</span>
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <h6>Rules:</h6>
                            <p className="text-muted small">
                              {match.rules?.length > 100 
                                ? `${match.rules.substring(0, 100)}...` 
                                : match.rules}
                            </p>
                          </div>
                          
                          <div className="d-flex justify-content-between align-items-center">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setSelectedHistoryMatch(match);
                                setShowHistoryModal(true);
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "tournaments" && (
            <div className="tab-content">
              <h2>My Tournaments</h2>
              <p>See all the tournaments you are participating in or have completed.</p>
            </div>
          )}
        </Container>
      </div>

      {/* Challenge Details Modal */}
      <Modal
        show={showChallengeModal}
        onHide={() => setShowChallengeModal(false)}
        size="lg"
        centered
        contentClassName="challenge-modal-content"
      >
        <Modal.Header closeButton className="challenge-modal-header">
          <Modal.Title className="challenge-modal-title">Challenge Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedChallenge && (
            <div>
              <div className="d-flex align-items-center mb-4">
                <img
                  src={selectedChallenge.creator?.avatar_url || "https://picsum.photos/40"}
                  alt={`${selectedChallenge.creator?.username}'s avatar`}
                  style={{ width: 50, height: 50, borderRadius: "50%" }}
                  className="me-3"
                />
                <div>
                  <h5 className="mb-0" style={{ color: '#e5e7eb' }}>{selectedChallenge.creator?.username}</h5>
                  <small className="text-muted">
                    Created on {new Date(selectedChallenge.created_at).toLocaleDateString()}
                  </small>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <div className="challenge-modal-section d-flex align-items-center justify-content-between">
                    <div className="me-2">
                      <div className="challenge-modal-label">Entry Fee</div>
                      <div className="challenge-modal-value" style={{ color: '#00ffcc' }}>
                        {selectedChallenge.entry_fee} Tokens
                      </div>
                    </div>
                    <div style={{ color: '#00ffcc', fontWeight: 700 }}>Kshs</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="challenge-modal-section d-flex align-items-center">
                    <Trophy size={20} className="me-2" style={{ color: '#f6c453' }} />
                    <div>
                      <div className="challenge-modal-label">Prize Pool</div>
                      <div className="challenge-modal-value" style={{ color: '#f6c453' }}>
                        {selectedChallenge.prize_amount} Tokens
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <div className="challenge-modal-section d-flex align-items-center">
                    <Calendar size={20} className="me-2" style={{ color: '#38bdf8' }} />
                    <div>
                      <div className="challenge-modal-label">Play Time</div>
                      <div className="challenge-modal-value">
                        {new Date(selectedChallenge.play_time).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="challenge-modal-section d-flex align-items-center">
                    <Users size={20} className="me-2" style={{ color: '#60a5fa' }} />
                    <div>
                      <div className="challenge-modal-label">Game Type</div>
                      <div className="challenge-modal-value" style={{ color: '#60a5fa' }}>
                        {selectedChallenge.game_type?.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="challenge-modal-section mb-3">
                <div className="challenge-modal-label mb-1">Match Rules</div>
                <div className="challenge-modal-value" style={{ lineHeight: 1.5 }}>
                  {selectedChallenge.rules}
                </div>
              </div>

              {error && (
                <Alert variant="danger" className="mb-0 mt-3">
                  {error}
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex flex-column flex-sm-row gap-2 w-100">
            <Button 
              variant="secondary" 
              onClick={() => setShowChallengeModal(false)}
              className="w-100"
              style={{ background: 'transparent', border: '1px solid #3a3a3a', color: '#e5e7eb' }}
            >
              Cancel
            </Button>
            {selectedChallenge && selectedChallenge.creator_id !== currentUserId && !selectedChallenge.hasJoined && (
              <Button
                onClick={() => handleJoinChallenge(selectedChallenge)}
                disabled={joiningChallenge}
                className="w-100"
                style={{ background: '#00ffcc', border: 'none', color: '#000', fontWeight: 700 }}
              >
                {joiningChallenge ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Joining...
                  </>
                ) : (
                  `Join Challenge (${selectedChallenge.entry_fee} Tokens)`
                )}
              </Button>
            )}
          </div>
        </Modal.Footer>
      </Modal>

      {/* Match History Details Modal */}
      <Modal
        show={showHistoryModal}
        onHide={() => setShowHistoryModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Match Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedHistoryMatch && (
            <div>
              <div className="d-flex align-items-center mb-4">
                <img
                  src={selectedHistoryMatch.creator?.avatar_url || "https://picsum.photos/40"}
                  alt={`${selectedHistoryMatch.creator?.username}'s avatar`}
                  style={{ width: 50, height: 50, borderRadius: "50%" }}
                  className="me-3"
                />
                <div>
                  <h5 className="mb-0">{selectedHistoryMatch.creator?.username}</h5>
                  <small className="text-muted">
                    {selectedHistoryMatch.participation_type === "created" ? "Created" : "Joined"} on {new Date(selectedHistoryMatch.joined_at).toLocaleDateString()}
                  </small>
                </div>
              </div>

              <div className="row mb-4">
                <div className="col-md-6">
                  <div className="d-flex align-items-center mb-2">
                    <div>
                      <strong>Participation:</strong>
                      <div className="text-primary fw-bold">
                        {selectedHistoryMatch.participation_type === "created" ? "Challenge Creator" : "Challenge Participant"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center mb-2">
                    <div>
                      <strong>Status:</strong>
                      <div className={`fw-bold ${
                        selectedHistoryMatch.status === "completed" ? "text-success" : 
                        selectedHistoryMatch.status === "active" ? "text-warning" : "text-secondary"
                      }`}>
                        {selectedHistoryMatch.status}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                      </div>
              <div className="row mb-4">
                <div className="col-md-6">
                  <div className="d-flex align-items-center mb-2">
                  <div>
                        <strong>Entry Fee:</strong>
                        <div className="text-success fw-bold">
                          {(selectedHistoryMatch.entry_fee_paid ?? selectedHistoryMatch.entry_fee)} Tokens
                        </div>
                      </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center mb-2">
                    <Trophy size={20} className="me-2 text-warning" />
                    <div>
                      <strong>Prize Pool:</strong>
                      <div className="text-warning fw-bold">{selectedHistoryMatch.prize_amount} Tokens</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row mb-4">
                <div className="col-md-6">
                  <div className="d-flex align-items-center mb-2">
                    <Calendar size={20} className="me-2 text-info" />
                    <div>
                      <strong>Play Time:</strong>
                      <div>{new Date(selectedHistoryMatch.play_time).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center mb-2">
                    <Users size={20} className="me-2 text-primary" />
                    <div>
                      <strong>Game Type:</strong>
                      <div className="text-primary fw-bold">{selectedHistoryMatch.game_type?.toUpperCase()}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h6>Match Rules:</h6>
                <div className="bg-light p-3 rounded">
                  <p className="mb-0">{selectedHistoryMatch.rules}</p>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowHistoryModal(false)}>
            Close
          </Button>
        </Modal.Footer>
  </Modal>
    </MainLayout>
  );
};

export default MyZone;