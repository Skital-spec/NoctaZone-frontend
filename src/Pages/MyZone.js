import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Modal, Spinner, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import MainLayout from "../Components/MainLayout";
import { supabase } from "../supabaseClient";

const MyZone = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("active");
  const [activeMatches, setActiveMatches] = useState([]);
  const [publicChallenges, setPublicChallenges] = useState([]);
  const [myCreatedChallenges, setMyCreatedChallenges] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  const [userTournaments, setUserTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publicLoading, setPublicLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [joiningChallenge, setJoiningChallenge] = useState(false);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Error getting current user:", error);
        navigate("/login");
      }
    };

    getCurrentUser();
  }, [navigate]);

  useEffect(() => {
    if (currentUserId) {
      if (activeTab === "active") {
        fetchActiveMatches();
        fetchMyCreatedChallenges();
      } else if (activeTab === "public") {
        fetchPublicChallenges();
      } else if (activeTab === "history") {
        fetchMatchHistory();
      } else if (activeTab === "tournaments") {
        fetchUserTournaments();
      }
    }
  }, [currentUserId, activeTab]);

  // Fetch active user challenges
  const fetchActiveMatches = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch both active challenges and user created challenges in parallel
      const [activeChallengesResponse, createdChallengesResponse] = await Promise.all([
        fetch(`https://safcom-payment.onrender.com/api/challenges/user/${currentUserId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include"
        }),
        fetch(`https://safcom-payment.onrender.com/api/challenges/my-created?user_id=${currentUserId}`, {
          method: "GET",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          credentials: "include"
        })
      ]);

      if (!activeChallengesResponse.ok) {
        throw new Error(`HTTP error! status: ${activeChallengesResponse.status}`);
      }

      const activeResult = await activeChallengesResponse.json();
      console.log("Active challenges response:", activeResult);

      let activeChallenges = [];
      if (activeResult.success && activeResult.data) {
        activeChallenges = activeResult.data;
      } else {
        console.log("No active challenges found or API returned unsuccessful response");
      }

      // Combine active challenges with created challenges
      const allActiveMatches = [...activeChallenges, ...myCreatedChallenges];
      setActiveMatches(allActiveMatches);
      
    } catch (err) {
      console.error("Error in fetchActiveMatches:", err);
      setError(`Failed to load active matches: ${err.message}`);
      setActiveMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCreatedChallenges = async () => {
    try {
      console.log("🔍 Fetching user's created challenges for user:", currentUserId);
      
      const response = await fetch(`https://safcom-payment.onrender.com/api/challenges/my-created?user_id=${currentUserId}`, {
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
      console.log("🔍 My created challenges API response:", result);
  
      if (result.success && result.data) {
        setMyCreatedChallenges(result.data);
      } else {
        console.log("No created challenges found or API returned unsuccessful response");
        setMyCreatedChallenges([]);
      }
      
    } catch (err) {
      console.error("Error in fetchMyCreatedChallenges:", err);
      setMyCreatedChallenges([]);
    }
  };

  // Fetch public challenges
  const fetchPublicChallenges = async () => {
    setPublicLoading(true);
    setError(null);
    
    try {
      if (!currentUserId) {
        console.log("⚠️ No currentUserId available, skipping public challenges fetch");
        setPublicChallenges([]);
        return;
      }
  
      console.log("🔍 Fetching public challenges for user:", currentUserId);
      
      // Add user_id as query parameter to filter out user's own challenges
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
        
        console.log(`🔍 Filtered ${availableChallenges.length} available challenges from ${result.data.length} total`);
        setPublicChallenges(availableChallenges);
      } else {
        console.log("No public challenges found or API returned unsuccessful response");
        setPublicChallenges([]);
      }
      
    } catch (err) {
      console.error("Error in fetchPublicChallenges:", err);
      setError("Failed to load public challenges");
    } finally {
      setPublicLoading(false);
    }
  };

  // Fetch match history
  const fetchMatchHistory = async () => {
    setHistoryLoading(true);
    setError(null);
    
    try {
      if (!currentUserId) {
        console.log("⚠️ No currentUserId available, skipping match history fetch");
        setMatchHistory([]);
        return;
      }

      console.log("🔍 Fetching match history for user:", currentUserId);
      
      const response = await fetch(`https://safcom-payment.onrender.com/api/challenges/history/${currentUserId}`, {
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
      console.log("🔍 Match history API response:", result);

      if (result.success && result.data) {
        setMatchHistory(result.data);
      } else {
        console.log("No match history found or API returned unsuccessful response");
        setMatchHistory([]);
      }
      
    } catch (err) {
      console.error("Error in fetchMatchHistory:", err);
      setError("Failed to load match history");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch user tournaments
  const fetchUserTournaments = async () => {
    setTournamentsLoading(true);
    setError(null);
    
    try {
      if (!currentUserId) {
        console.log("⚠️ No currentUserId available, skipping tournaments fetch");
        setUserTournaments([]);
        return;
      }

      console.log("🔍 Fetching user tournaments for user:", currentUserId);
      
      const response = await fetch(`https://safcom-payment.onrender.com/api/tournaments/user/${currentUserId}`, {
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
      console.log("🔍 User tournaments API response:", result);

      if (result.success && result.data) {
        setUserTournaments(result.data);
      } else {
        console.log("No tournaments found or API returned unsuccessful response");
        setUserTournaments([]);
      }
      
    } catch (err) {
      console.error("Error in fetchUserTournaments:", err);
      setError("Failed to load tournaments");
    } finally {
      setTournamentsLoading(false);
    }
  };

  const handleJoinChallenge = async (challengeId) => {
    if (!currentUserId) {
      setError("Please log in to join challenges.");
      return;
    }
  
    setJoiningChallenge(true);
    try {
      const response = await fetch(`https://safcom-payment.onrender.com/api/challenges/${challengeId}/join`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          user_id: currentUserId
        }),
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        console.error("Error joining challenge:", result.error);
        setError(result.error || `Failed to join challenge: ${result.details || 'Unknown error'}`);
        return;
      }
  
      if (result.success) {
        setShowJoinModal(false);
        // Remove the joined challenge from public challenges list since it's now full
        setPublicChallenges(prev => prev.filter(challenge => challenge.id !== challengeId));
        // Refresh active matches to show the newly joined challenge
        fetchActiveMatches();
        setError(null);
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

  const renderActiveMatches = () => {
    if (loading) {
      return (
        <div className="text-center py-4">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      );
    }

    const hasActiveMatches = activeMatches.length > 0;
    const hasCreatedChallenges = myCreatedChallenges.length > 0;

    if (!hasActiveMatches && !hasCreatedChallenges) {
      return (
        <div className="text-center py-4">
          <p>No active challenges found.</p>
          <Button variant="primary" onClick={handleCreateChallenge}>
            Create Challenge
          </Button>
        </div>
      );
    }

    return (
      <div>
        {/* User's Created Challenges Section */}
        {hasCreatedChallenges && (
          <div className="mb-4">
            <h5 className="mb-3">🎯 Your Created Challenges</h5>
            <Row>
              {myCreatedChallenges.map((challenge) => (
                <Col md={6} lg={4} key={`created-${challenge.id}`} className="mb-3">
                  <Card className="challenge-card h-100 border-primary">
                    <Card.Body>
                      <div className="d-flex align-items-center mb-2">
                        {challenge.creator_avatar && (
                          <img 
                            src={challenge.creator_avatar} 
                            alt={challenge.creator_username}
                            className="rounded-circle me-2"
                            style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                          />
                        )}
                        <div>
                          <Card.Title className="mb-0 h6">{challenge.game_type}</Card.Title>
                          <small className="text-muted">by {challenge.creator_username}</small>
                        </div>
                      </div>
                      <Card.Text>
                        <strong>Entry Fee:</strong> ${challenge.entry_fee}<br/>
                        <strong>Prize Pool:</strong> ${challenge.prize_amount}<br/>
                        <strong>Players:</strong> {challenge.participants}/2<br/>
                        <strong>Play Time:</strong> {challenge.play_time}<br/>
                        <strong>Status:</strong> <span className="badge bg-warning">Waiting for opponent</span><br/>
                        <strong>Created:</strong> {new Date(challenge.created_at).toLocaleDateString()}
                      </Card.Text>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => {
                          console.log('Navigating to challenge details page with ID:', challenge.id);
                          navigate(`/challenge/${challenge.id}`);
                        }}
                      >
                        View Details
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* Active Matches Section */}
        {hasActiveMatches && (
          <div>
            <h5 className="mb-3">⚡ Active Matches</h5>
            <Row>
              {activeMatches.map((challenge) => (
                <Col md={6} lg={4} key={`active-${challenge.id}`} className="mb-3">
                  <Card className="challenge-card h-100">
                    <Card.Body>
                      <Card.Title>{challenge.game_name}</Card.Title>
                      <Card.Text>
                        <strong>Type:</strong> {challenge.challenge_type}<br/>
                        <strong>Entry Fee:</strong> ${challenge.entry_fee}<br/>
                        <strong>Status:</strong> {challenge.status}<br/>
                        <strong>Created:</strong> {new Date(challenge.created_at).toLocaleDateString()}
                      </Card.Text>
                      <Button 
                        variant="primary" 
                        onClick={() => {
                          console.log('Navigating to challenge details page with ID:', challenge.id);
                          navigate(`/challenge/${challenge.id}`);
                        }}
                      >
                        View Details
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </div>
    );
  };

  const renderPublicChallenges = () => {
    if (publicLoading) {
      return (
        <div className="text-center py-4">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      );
    }
  
    if (publicChallenges.length === 0) {
      return (
        <div className="text-center py-4">
          <p>No available challenges to join.</p>
          <Button variant="primary" onClick={handleCreateChallenge}>
            Create Challenge
          </Button>
        </div>
      );
    }
  
    return (
      <Row>
        {publicChallenges.map((challenge) => (
          <Col md={6} lg={4} key={challenge.id} className="mb-3">
            <Card className="challenge-card h-100">
              <Card.Body>
                <Card.Title>{challenge.game_type}</Card.Title>
                <Card.Text>
                  <strong>Entry Fee:</strong> ${challenge.entry_fee}<br/>
                  <strong>Prize Pool:</strong> ${challenge.prize_amount}<br/>
                  <strong>Creator:</strong> {challenge.creator_username}<br/>
                  <strong>Participants:</strong> {challenge.participants}/2<br/>
                  <strong>Created:</strong> {new Date(challenge.created_at).toLocaleDateString()}
                </Card.Text>
                <Button 
                  variant="success" 
                  onClick={() => {
                    setSelectedChallenge(challenge);
                    setShowJoinModal(true);
                  }}
                >
                  Join Challenge
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  const renderMatchHistory = () => {
    if (historyLoading) {
      return (
        <div className="text-center py-4">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      );
    }

    if (matchHistory.length === 0) {
      return (
        <div className="text-center py-4">
          <p>No match history found.</p>
        </div>
      );
    }

    return (
      <Row>
        {matchHistory.map((match) => (
          <Col md={6} lg={4} key={match.id} className="mb-3">
            <Card className="challenge-card h-100">
              <Card.Body>
                <Card.Title>{match.game_name}</Card.Title>
                <Card.Text>
                  <strong>Entry Fee:</strong> ${match.entry_fee}<br/>
                  <strong>Status:</strong> {match.status}<br/>
                  <strong>Result:</strong> {match.result || 'Pending'}<br/>
                  <strong>Date:</strong> {new Date(match.created_at).toLocaleDateString()}
                </Card.Text>
                <Button 
                  variant="outline-primary" 
                  onClick={() => navigate(`/challenge/${match.id}`)}
                >
                  View Details
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  const renderTournaments = () => {
    if (tournamentsLoading) {
      return (
        <div className="text-center py-4">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      );
    }

    if (userTournaments.length === 0) {
      return (
        <div className="text-center py-4">
          <p>No tournaments found.</p>
        </div>
      );
    }

    return (
      <Row>
        {userTournaments.map((tournament) => (
          <Col md={6} lg={4} key={tournament.id} className="mb-3">
            <Card className="challenge-card h-100">
              <Card.Body>
                <Card.Title>{tournament.name}</Card.Title>
                <Card.Text>
                  <strong>Entry Fee:</strong> ${tournament.entry_fee}<br/>
                  <strong>Status:</strong> {tournament.status}<br/>
                  <strong>Participants:</strong> {tournament.current_participants}/{tournament.max_participants}<br/>
                  <strong>Start Date:</strong> {new Date(tournament.start_date).toLocaleDateString()}
                </Card.Text>
                <Button 
                  variant="primary" 
                  onClick={() => navigate(`/tournament/${tournament.id}`)}
                >
                  View Tournament
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <MainLayout>
      <Container className="my-4">
        <style>
          {`
            .challenge-card {
              transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
              border: 1px solid rgba(0, 255, 204, 0.2);
              background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
              color: #ffffff;
            }
            
            .challenge-card:hover {
              transform: translateY(-4px);
              box-shadow: 0 8px 25px rgba(0, 255, 204, 0.3);
              border-color: #00ffcc;
            }
            
            .challenge-card .card-body {
              padding: 1.5rem;
              background: transparent;
            }
            
            .challenge-card .card-title {
              color: #00ffcc;
              font-weight: 600;
              text-shadow: 0 0 8px rgba(0, 255, 204, 0.5);
            }
            
            .challenge-card .text-muted {
              color: #b0b0b0 !important;
            }
            
            .challenge-card .btn-primary {
              background: linear-gradient(135deg, #00ffcc 0%, #00d4aa 100%);
              border: none;
              color: #000;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              box-shadow: 0 4px 15px rgba(0, 255, 204, 0.3);
              transition: all 0.3s ease;
            }
            
            .challenge-card .btn-primary:hover {
              background: linear-gradient(135deg, #00d4aa 0%, #00ffcc 100%);
              box-shadow: 0 6px 20px rgba(0, 255, 204, 0.5);
              transform: translateY(-2px);
            }
            
            .myzone-tabs {
              display: flex;
              background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
              border-bottom: 2px solid #00ffcc;
              margin-bottom: 2rem;
              border-radius: 12px 12px 0 0;
              box-shadow: 0 4px 20px rgba(0, 255, 204, 0.1);
              overflow-x: auto;
              overflow-y: hidden;
              scrollbar-width: none; /* Firefox */
              -ms-overflow-style: none; /* IE/Edge */
            }
            
            /* Hide scrollbar for Chrome/Safari/Opera */
            .myzone-tabs::-webkit-scrollbar {
              display: none;
            }
            
            .myzone-tab {
              flex: 1;
              padding: 1.2rem;
              text-align: center;
              background: transparent;
              border: none;
              cursor: pointer;
              font-weight: 600;
              color: #b0b0b0;
              transition: all 0.3s ease;
              position: relative;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-size: 0.9rem;
              min-width: 150px; /* Minimum width for better scrolling */
              white-space: nowrap; /* Prevent text wrapping */
            }
            
            .myzone-tab::before {
              content: '';
              position: absolute;
              bottom: 0;
              left: 50%;
              width: 0;
              height: 2px;
              background: #00ffcc;
              transition: all 0.3s ease;
              transform: translateX(-50%);
            }
            
            .myzone-tab:hover {
              background: rgba(0, 255, 204, 0.1);
              color: #00ffcc;
              text-shadow: 0 0 8px rgba(0, 255, 204, 0.5);
            }
            
            .myzone-tab:hover::before {
              width: 80%;
            }
            
            .myzone-tab.active {
              background: linear-gradient(135deg, rgba(0, 255, 204, 0.2) 0%, rgba(0, 255, 204, 0.1) 100%);
              color: #00ffcc;
              text-shadow: 0 0 12px rgba(0, 255, 204, 0.8);
              box-shadow: inset 0 0 20px rgba(0, 255, 204, 0.1);
            }
            
            .myzone-tab.active::before {
              width: 100%;
              height: 3px;
              box-shadow: 0 0 10px #00ffcc;
            }
            
            .myzone-tab:first-child {
              border-radius: 8px 0 0 0;
            }
            
            .myzone-tab:last-child {
              border-radius: 0 8px 0 0;
            }
          `}
        </style>

        <Row>
          <Col>
            <h2 className="mb-4" style={{
              color: '#00ffcc',
              textShadow: '0 0 15px rgba(0, 255, 204, 0.6)',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>My Zone</h2>
            
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <div className="myzone-tabs">
              <button
                className={`myzone-tab ${activeTab === "active" ? "active" : ""}`}
                onClick={() => setActiveTab("active")}
              >
                Active Challenges
              </button>
              <button
                className={`myzone-tab ${activeTab === "public" ? "active" : ""}`}
                onClick={() => setActiveTab("public")}
              >
                Find a Match
              </button>
              <button
                className={`myzone-tab ${activeTab === "history" ? "active" : ""}`}
                onClick={() => setActiveTab("history")}
              >
                Match History
              </button>
              <button
                className={`myzone-tab ${activeTab === "tournaments" ? "active" : ""}`}
                onClick={() => setActiveTab("tournaments")}
              >
                Tournaments
              </button>
            </div>

            <div className="tab-content">
              {activeTab === "active" && renderActiveMatches()}
              {activeTab === "public" && renderPublicChallenges()}
              {activeTab === "history" && renderMatchHistory()}
              {activeTab === "tournaments" && renderTournaments()}
            </div>
          </Col>
        </Row>

{/* Join Challenge Modal - Updated */}
<Modal show={showJoinModal} onHide={() => setShowJoinModal(false)}>
  <Modal.Header closeButton>
    <Modal.Title>Join Challenge</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {selectedChallenge && (
      <div>
        <p><strong>Game:</strong> {selectedChallenge.game_type}</p>
        <p><strong>Entry Fee:</strong> ${selectedChallenge.entry_fee}</p>
        <p><strong>Prize Pool:</strong> ${selectedChallenge.prize_amount}</p>
        <p><strong>Creator:</strong> {selectedChallenge.creator_username}</p>
        <p><strong>Participants:</strong> {selectedChallenge.participants}/2</p>
        <p>Are you sure you want to join this challenge?</p>
      </div>
    )}
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowJoinModal(false)}>
      Cancel
    </Button>
    <Button 
      variant="primary" 
      onClick={() => handleJoinChallenge(selectedChallenge?.id)}
      disabled={joiningChallenge}
    >
      {joiningChallenge ? (
        <>
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
            className="me-2"
          />
          Joining...
        </>
      ) : (
        "Join Challenge"
      )}
    </Button>
  </Modal.Footer>
</Modal>
      </Container>
    </MainLayout>
  );
};

export default MyZone;
