import React, { useEffect, useMemo, useState } from "react";
import {
  Container,
  Card,
  Row,
  Col,
  Badge,
  Button,
  Alert,
  Spinner,
  Modal,
  ProgressBar
} from "react-bootstrap";
import {
  ArrowLeft,
  Users,
  Calendar,
  Clock,
  User,
  Trophy,
  DollarSign,
  CheckCircle,
  Play,
  Timer,
  AlertTriangle
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useWallet } from "../context/WalletContext";

const ChallengeDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { balance, deposit } = useWallet();
  const [challenge, setChallenge] = useState(null);
  const [players, setPlayers] = useState({ p1: null, p2: null });
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingMatches, setCreatingMatches] = useState(false);
  const [error, setError] = useState(null);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [cashOutType, setCashOutType] = useState(null); // 'win', 'draw', 'expired', 'forfeit'
  const [cashOutAmount, setCashOutAmount] = useState(0);
  const [processingCashOut, setProcessingCashOut] = useState(false);
  const [cashOutCompleted, setCashOutCompleted] = useState(false);
  const [startingChallenge, setStartingChallenge] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [startWindowTimeLeft, setStartWindowTimeLeft] = useState({ minutes: 0, seconds: 0 });

  // Challenge states
  const CHALLENGE_STATES = {
    WAITING_FOR_START: 'waiting_for_start',
    START_WINDOW_ACTIVE: 'start_window_active',
    START_WINDOW_EXPIRED: 'start_window_expired',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    EXPIRED: 'expired',
    FORFEITED: 'forfeited'
  };

  useEffect(() => {
    loadChallenge();
  }, [id]);

  useEffect(() => {
    if (!challenge || challenge.challenge_type !== 'open') return;
    if (players.p2) return;
    const t = setInterval(() => {
      loadChallenge();
    }, 4000);
    return () => clearInterval(t);
  }, [challenge, players.p2]);

  // Timer effect for countdowns
  useEffect(() => {
    let interval;
    
    if (challenge) {
      interval = setInterval(() => {
        updateTimers();
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [challenge]);

  const updateTimers = () => {
    if (!challenge) return;

    const now = new Date().getTime();

    // Update start window timer
    if (challenge.start_window_end) {
      const startWindowEnd = new Date(challenge.start_window_end).getTime();
      const startWindowDiff = startWindowEnd - now;
      
      if (startWindowDiff > 0) {
        const minutes = Math.floor(startWindowDiff / (1000 * 60));
        const seconds = Math.floor((startWindowDiff % (1000 * 60)) / 1000);
        setStartWindowTimeLeft({ minutes, seconds });
      } else {
        setStartWindowTimeLeft({ minutes: 0, seconds: 0 });
      }
    }

    // Update challenge timer
    if (challenge.challenge_ends_at) {
      const challengeEnd = new Date(challenge.challenge_ends_at).getTime();
      const challengeDiff = challengeEnd - now;
      
      if (challengeDiff > 0) {
        const hours = Math.floor(challengeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((challengeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((challengeDiff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    }
  };

  const loadChallenge = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Challenge + players from backend
      const chRes = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}`, { credentials: "include" });
      if (!chRes.ok) throw new Error("Failed to load challenge");
      const chJson = await chRes.json();
      setChallenge(chJson.challenge);
      
      // 2) Get detailed player information from Supabase if we have player IDs
      let playersData = chJson.players || { p1: null, p2: null };
      
      if (playersData.p1?.id || playersData.p2?.id) {
        const playerIds = [];
        if (playersData.p1?.id) playerIds.push(playersData.p1.id);
        if (playersData.p2?.id) playerIds.push(playersData.p2.id);
        
        // Fetch complete user profiles from Supabase
        const { data: userProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', playerIds);
        
        if (!profileError && userProfiles) {
          // Merge the complete user data
          if (playersData.p1?.id) {
            const p1Profile = userProfiles.find(u => u.id === playersData.p1.id);
            if (p1Profile) {
              playersData.p1 = { ...playersData.p1, ...p1Profile };
            }
          }
          if (playersData.p2?.id) {
            const p2Profile = userProfiles.find(u => u.id === playersData.p2.id);
            if (p2Profile) {
              playersData.p2 = { ...playersData.p2, ...p2Profile };
            }
          }
        }
      }
      
      setPlayers(playersData);

      // 3) Ensure matches (only if two players present)
      if (playersData?.p1?.id && playersData?.p2?.id) {
        const ensureRes = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}/ensure-matches`, {
          method: "POST",
          credentials: "include"
        });
        if (ensureRes.ok) {
          const ensureJson = await ensureRes.json();
          setMatches(ensureJson.matches || []);
        } else {
          // fallback: fetch matches even if ensure failed
          const mRes = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}/matches`, { credentials: "include" });
          const mJson = await mRes.json();
          setMatches(mJson.matches || []);
        }
      } else {
        // 4) Fetch existing matches (might be 0 until opponent joins)
        const mRes = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}/matches`, { credentials: "include" });
        const mJson = await mRes.json();
        setMatches(mJson.matches || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load challenge");
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async ({ ensure, p1, p2, ch }) => {
    const { data: m } = await supabase
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", id)
      .order("match_number", { ascending: true });

    let current = m || [];

    // Create 3 matches if both players exist and matches missing
    if (ensure && current.length < 3 && p1?.id && p2?.id) {
      try {
        setCreatingMatches(true);
        const toCreate = [1, 2, 3]
          .filter((n) => !current.find((x) => x.match_number === n))
          .map((n) => ({
            tournament_id: id,
            round: 1,
            match_number: n,
            status: "pending",
            player1_id: p1.id,
            player2_id: p2.id,
            created_at: new Date().toISOString()
          }));

        if (toCreate.length > 0) {
          const { error: insErr } = await supabase
            .from("tournament_matches")
            .insert(toCreate);
          if (!insErr) {
            const { data: fresh } = await supabase
              .from("tournament_matches")
              .select("*")
              .eq("tournament_id", id)
              .order("match_number", { ascending: true });
            current = fresh || [];
          }
        }
      } finally {
        setCreatingMatches(false);
      }
    }

    setMatches(current);
  };

  // Enhanced series score calculation with match 3 logic
  const seriesScore = useMemo(() => {
    if (!players.p1 || !players.p2 || matches.length === 0) {
      return { p1Wins: 0, p2Wins: 0, seriesWinner: null, isDraw: false, match3Needed: true };
    }
    
    let p1Wins = 0;
    let p2Wins = 0;
    const completedMatches = matches.filter(m => m.status === "completed");
    
    completedMatches.forEach((m) => {
      if (m.winner_user_id === players.p1.id) p1Wins++;
      else if (m.winner_user_id === players.p2.id) p2Wins++;
    });
    
    // Check if match 3 is needed (if same winner in matches 1 and 2)
    let match3Needed = true;
    if (completedMatches.length >= 2) {
      const match1 = completedMatches.find(m => m.match_number === 1);
      const match2 = completedMatches.find(m => m.match_number === 2);
      
      if (match1 && match2 && match1.winner_user_id === match2.winner_user_id && match1.winner_user_id !== 'draw') {
        match3Needed = false;
      }
    }
    
    // Determine series winner or draw
    let seriesWinner = null;
    let isDraw = false;
    
    if (!match3Needed) {
      // Series ended early (same winner in matches 1 and 2)
      seriesWinner = p1Wins > p2Wins ? players.p1 : players.p2;
    } else if (completedMatches.length === 3) {
      // All 3 matches completed
      if (p1Wins > p2Wins) {
        seriesWinner = players.p1;
      } else if (p2Wins > p1Wins) {
        seriesWinner = players.p2;
      } else {
        isDraw = true;
      }
    }
    
    return { p1Wins, p2Wins, seriesWinner, isDraw, match3Needed };
  }, [players, matches]);

  // Determine challenge state
  const challengeState = useMemo(() => {
    if (!challenge) return CHALLENGE_STATES.WAITING_FOR_START;

    const now = new Date().getTime();
    
    // Check if challenge is expired
    if (challenge.challenge_ends_at && new Date(challenge.challenge_ends_at).getTime() < now) {
      return CHALLENGE_STATES.EXPIRED;
    }
    
    // Check if start window expired
    if (challenge.start_window_end && new Date(challenge.start_window_end).getTime() < now && !challenge.challenge_started_at) {
      return CHALLENGE_STATES.START_WINDOW_EXPIRED;
    }
    
    // Check if challenge is active
    if (challenge.challenge_started_at) {
      return CHALLENGE_STATES.ACTIVE;
    }
    
    // Check if start window is active
    if (challenge.start_window_end && new Date(challenge.start_window_end).getTime() > now) {
      return CHALLENGE_STATES.START_WINDOW_ACTIVE;
    }
    
    return CHALLENGE_STATES.WAITING_FOR_START;
  }, [challenge]);

  // Check if current user can start challenge
  const canStartChallenge = useMemo(() => {
    if (!challenge || !players.p1 || !players.p2) return false;
    
    const currentUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    if (!currentUserId) return false;
    
    const isPlayer1 = currentUserId === players.p1.id;
    const isPlayer2 = currentUserId === players.p2.id;
    
    if (!isPlayer1 && !isPlayer2) return false;
    
    // Can start if in start window and hasn't started yet
    return challengeState === CHALLENGE_STATES.START_WINDOW_ACTIVE && 
           !(isPlayer1 ? challenge.p1_started_at : challenge.p2_started_at);
  }, [challenge, players, challengeState]);

  // Check if current user can cash out
  const canCashOut = useMemo(() => {
    if (!challenge || !players.p1 || !players.p2) return false;
    
    const currentUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    if (!currentUserId) return false;
    
    const isPlayer1 = currentUserId === players.p1.id;
    const isPlayer2 = currentUserId === players.p2.id;
    
    if (!isPlayer1 && !isPlayer2) return false;
    
    // Can cash out if series is complete (winner or draw) or challenge expired/forfeited
    return seriesScore.seriesWinner || seriesScore.isDraw || 
           challengeState === CHALLENGE_STATES.EXPIRED || 
           challengeState === CHALLENGE_STATES.FORFEITED;
  }, [challenge, players, seriesScore, challengeState]);

  // Calculate cash out amounts
  const getCashOutAmounts = () => {
    if (!challenge) return { winAmount: 0, drawAmount: 0, refundAmount: 0 };
    
    const entryFee = challenge.entry_fee || 0;
    const totalPrize = entryFee * 2; // Both players' entry fees
    const winAmount = totalPrize; // Winner gets full prize pool
    const drawAmount = Math.floor(entryFee * 0.96); // 4% less than individual stake
    const refundAmount = Math.floor(entryFee * 0.96); // 4% less than individual stake
    
    return { winAmount, drawAmount, refundAmount };
  };

  const handleStartChallenge = async () => {
    setStartingChallenge(true);
    try {
      const response = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include"
      });
      
      if (response.ok) {
        await loadChallenge(); // Reload to get updated state
      } else {
        throw new Error("Failed to start challenge");
      }
    } catch (error) {
      console.error("Start challenge error:", error);
      alert("Failed to start challenge. Please try again.");
    } finally {
      setStartingChallenge(false);
    }
  };

  const handleCashOut = (type) => {
    const amounts = getCashOutAmounts();
    setCashOutType(type);
    
    switch (type) {
      case 'win':
        setCashOutAmount(amounts.winAmount);
        break;
      case 'draw':
        setCashOutAmount(amounts.drawAmount);
        break;
      case 'expired':
      case 'forfeit':
        setCashOutAmount(amounts.refundAmount);
        break;
      default:
        setCashOutAmount(0);
    }
    
    setShowCashOutModal(true);
  };

  const confirmCashOut = async () => {
    setProcessingCashOut(true);
    try {
      // Update wallet balance
      const refText = `Challenge ${id} - ${
        cashOutType === 'win' ? 'Prize' : 
        cashOutType === 'draw' ? 'Cash Back' :
        cashOutType === 'expired' ? 'Refund (Expired)' :
        'Refund (Forfeit)'
      }`;
      
      deposit(cashOutAmount, refText);
      
      // Update challenge status in backend
      const updateRes = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}/cash-out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          type: cashOutType,
          amount: cashOutAmount
        })
      });
      
      if (updateRes.ok) {
        setCashOutCompleted(true);
        setShowCashOutModal(false);
        // Reload challenge to update status
        await loadChallenge();
      } else {
        throw new Error("Failed to process cash out");
      }
    } catch (error) {
      console.error("Cash out error:", error);
      alert("Failed to process cash out. Please try again.");
    } finally {
      setProcessingCashOut(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "pending":
        return "warning";
      case "ongoing":
        return "info";
      case "completed":
        return "success";
      case "disputed":
        return "danger";
      default:
        return "secondary";
    }
  };

  const gotoReport = (matchId) => {
    navigate(`/tournament/${id}/report-match/${matchId}`);
  };

  // Animated congratulations component
  const CongratulationsText = ({ type, winner, message }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }, []);
    
    return (
      <div className={`text-center mb-4 ${isVisible ? 'animate__animated animate__bounceIn' : 'opacity-0'}`}>
        <div className="display-4 mb-3">
          {type === 'win' ? '🎉' : 
           type === 'draw' ? '��' :
           type === 'expired' ? '⏰' :
           type === 'forfeit' ? '🏆' : '🎊'}
        </div>
        <h2 className={`fw-bold ${
          type === 'win' ? 'text-success' : 
          type === 'draw' ? 'text-warning' :
          type === 'expired' ? 'text-info' :
          type === 'forfeit' ? 'text-success' : 'text-primary'
        }`}>
          {message || (
            type === 'win' ? `Congratulations ${winner?.username || `User ${winner?.id}`}! You've Won!` :
            type === 'draw' ? "Congratulations! You've Both Drawn!" :
            type === 'expired' ? "Challenge Expired - Refunds Available!" :
            type === 'forfeit' ? "You Won by Default!" :
            "Congratulations!"
          )}
        </h2>
        <p className="text-muted">
          {type === 'win' ? "You've emerged victorious in this challenge!" :
           type === 'draw' ? "It's a tie! Both players showed great skill." :
           type === 'expired' ? "The challenge time has expired. You can claim your refund." :
           type === 'forfeit' ? "Your opponent didn't report results in time!" :
           "Well done!"}
        </p>
      </div>
    );
  };

  // Timer display component
  const TimerDisplay = ({ timeLeft, label, variant = "primary" }) => {
    const totalSeconds = timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds;
    const isLowTime = totalSeconds < 300; // Less than 5 minutes
    
    return (
      <Card className={`mb-3 ${isLowTime ? 'border-warning' : ''}`}>
        <Card.Body className="text-center">
          <div className="d-flex align-items-center justify-content-center mb-2">
            <Timer size={20} className="me-2" />
            <h5 className="mb-0">{label}</h5>
          </div>
          <div className={`display-6 fw-bold ${isLowTime ? 'text-warning' : `text-${variant}`}`}>
            {timeLeft.hours > 0 && `${timeLeft.hours.toString().padStart(2, '0')}:`}
            {timeLeft.minutes.toString().padStart(2, '0')}:{timeLeft.seconds.toString().padStart(2, '0')}
          </div>
          {isLowTime && (
            <Alert variant="warning" className="mt-2 mb-0">
              <AlertTriangle size={16} className="me-1" />
              Time is running low!
            </Alert>
          )}
        </Card.Body>
      </Card>
    );
  };

  if (loading) {
    return (
        <Container className="py-5 text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <div className="mt-3">Loading challenge...</div>
        </Container>
    );
  }

  if (error || !challenge) {
    return (
        <Container className="py-4">
          <Alert variant="danger">
            {error || "Challenge not found"}
            <div className="mt-3">
              <Button variant="outline-danger" onClick={loadChallenge}>
                Retry
              </Button>
              <Button variant="link" onClick={() => navigate("/myzone")} className="ms-2">
                Go Back
              </Button>
            </div>
          </Alert>
        </Container>
    );
  }

  return (
      <Container className="py-4">
        <div className="d-flex align-items-center mb-4">
          <Button
            variant="link"
            className="p-0 me-3 text-decoration-none"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} />
          </Button>
          <h2 className="mb-0">Challenge Details</h2>
        </div>

        {/* Challenge Start Section */}
        {challengeState === CHALLENGE_STATES.START_WINDOW_ACTIVE && (
          <Card className="mb-4 border-primary">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0 d-flex align-items-center">
                <Play size={20} className="me-2" />
                Start Challenge Window
              </h5>
            </Card.Header>
            <Card.Body className="text-center p-4">
              <TimerDisplay 
                timeLeft={startWindowTimeLeft} 
                label="Time to Start Challenge" 
                variant="primary"
              />
              <p className="mb-3">
                Both players must start the challenge within the next {startWindowTimeLeft.minutes}:{startWindowTimeLeft.seconds.toString().padStart(2, '0')} minutes.
              </p>
              <div className="row mb-3">
                <div className="col-6">
                  <div className="d-flex align-items-center justify-content-center">
                    <div className={`rounded-circle me-2 ${challenge.p1_started_at ? 'bg-success' : 'bg-secondary'}`} style={{width: '12px', height: '12px'}}></div>
                    <span>{players.p1?.username || 'Player 1'}</span>
                    {challenge.p1_started_at && <CheckCircle size={16} className="ms-2 text-success" />}
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex align-items-center justify-content-center">
                    <div className={`rounded-circle me-2 ${challenge.p2_started_at ? 'bg-success' : 'bg-secondary'}`} style={{width: '12px', height: '12px'}}></div>
                    <span>{players.p2?.username || 'Player 2'}</span>
                    {challenge.p2_started_at && <CheckCircle size={16} className="ms-2 text-success" />}
                  </div>
                </div>
              </div>
              {canStartChallenge && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStartChallenge}
                  disabled={startingChallenge}
                  className="px-5"
                >
                  {startingChallenge ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play size={20} className="me-2" />
                      Start Challenge
                    </>
                  )}
                </Button>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Start Window Expired */}
        {challengeState === CHALLENGE_STATES.START_WINDOW_EXPIRED && (
          <Card className="mb-4 border-warning">
            <Card.Body className="text-center p-4">
              <CongratulationsText 
                type="expired" 
                message="Start Window Expired - Refunds Available!"
              />
              <Button
                variant="warning"
                size="lg"
                onClick={() => handleCashOut('expired')}
                className="px-5"
              >
                <DollarSign size={20} className="me-2" />
                Claim Refund ({getCashOutAmounts().refundAmount} Tokens)
              </Button>
            </Card.Body>
          </Card>
        )}

        {/* Active Challenge Timer */}
        {challengeState === CHALLENGE_STATES.ACTIVE && (
          <Card className="mb-4 border-success">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0 d-flex align-items-center">
                <Timer size={20} className="me-2" />
                Challenge Active
              </h5>
            </Card.Header>
            <Card.Body>
              <TimerDisplay 
                timeLeft={timeLeft} 
                label="Time Remaining" 
                variant="success"
              />
              <div className="text-center">
                <p className="mb-0">
                  Report your match results before time runs out!
                </p>
                <small className="text-muted">
                  If no results are reported, both players will be refunded (4% less).
                  If only one player reports, they automatically win.
                </small>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Challenge Expired */}
        {challengeState === CHALLENGE_STATES.EXPIRED && (
          <Card className="mb-4 border-info">
            <Card.Body className="text-center p-4">
              <CongratulationsText 
                type="expired" 
                message="Challenge Time Expired!"
              />
              <Button
                variant="info"
                size="lg"
                onClick={() => handleCashOut('expired')}
                className="px-5"
              >
                <DollarSign size={20} className="me-2" />
                Claim Refund ({getCashOutAmounts().refundAmount} Tokens)
              </Button>
            </Card.Body>
          </Card>
        )}

        {/* Congratulations and Cash Out Section */}
        {canCashOut && !cashOutCompleted && challengeState === CHALLENGE_STATES.COMPLETED && (
          <Card className="mb-4 border-0 shadow">
            <Card.Body className="text-center p-5">
              {seriesScore.isDraw ? (
                <>
                  <CongratulationsText type="draw" />
                  <Button
                    variant="warning"
                    size="lg"
                    onClick={() => handleCashOut('draw')}
                    className="px-5"
                  >
                    <DollarSign size={20} className="me-2" />
                    Take Cash Back ({getCashOutAmounts().drawAmount} Tokens)
                  </Button>
                </>
              ) : seriesScore.seriesWinner ? (
                <>
                  <CongratulationsText type="win" winner={seriesScore.seriesWinner} />
                  <Button
                    variant="success"
                    size="lg"
                    onClick={() => handleCashOut('win')}
                    className="px-5"
                  >
                    <Trophy size={20} className="me-2" />
                    Cash Out Prize ({getCashOutAmounts().winAmount} Tokens)
                  </Button>
                </>
              ) : null}
            </Card.Body>
          </Card>
        )}

        {/* Cash Out Completed Message */}
        {cashOutCompleted && (
          <Card className="mb-4 border-success">
            <Card.Body className="text-center p-4">
              <CheckCircle size={48} className="text-success mb-3" />
              <h4 className="text-success">Cash Out Successful!</h4>
              <p className="text-muted">
                {cashOutAmount} tokens have been added to your wallet balance.
              </p>
            </Card.Body>
          </Card>
        )}

        <Row>
          <Col lg={8}>
            <Card className="mb-4">
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 d-flex align-items-center">
                    <Trophy size={20} className="me-2" />
                    {challenge.game_type || "1v1 Match"}
                  </h5>
                  <Badge bg={getStatusVariant(challenge.status)} className="text-capitalize">
                    {challenge.status}
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body className="p-4">
                <Row className="mb-3">
                  <Col md={6} className="mb-3">
                    <div className="d-flex align-items-center mb-1">
                      <Users size={18} className="me-2 text-info" />
                      <span className="fw-bold">Participants</span>
                    </div>
                    <div className="ms-4">
                      <span className="h6">
                        {challenge.participants || 0} / {challenge.total_participants || 2}
                      </span>
                    </div>
                  </Col>
                  <Col md={6} className="mb-3">
                    <div className="d-flex align-items-center mb-1">
                      <Calendar size={18} className="me-2 text-warning" />
                      <span className="fw-bold">Scheduled Time</span>
                    </div>
                    <div className="ms-4">{formatDateTime(challenge.play_time)}</div>
                  </Col>
                </Row>

                <Row className="mb-4">
                  <Col md={6} className="mb-3">
                    <div className="fw-bold">Entry Fee</div>
                    <div className="h5 text-success">{challenge.entry_fee} Tokens</div>
                  </Col>
                  <Col md={6} className="mb-3">
                    <div className="fw-bold">Prize Pool</div>
                    <div className="h5 text-success">
                      {(challenge.prize_amount || (challenge.entry_fee || 0) * 2)} Tokens
                    </div>
                  </Col>
                </Row>

                <div className="mb-2 fw-bold">Best of 3 Series</div>
                <div className="mb-3">
                  {seriesScore.seriesWinner ? (
                    <div className="d-flex align-items-center">
                      <Trophy size={20} className="me-2 text-warning" />
                      <Badge bg="success" className="me-2">
                        Winner: {seriesScore.seriesWinner.username || `User ${seriesScore.seriesWinner.id}`}
                      </Badge>
                      <Badge bg="dark" className="me-2">
                        {players.p1?.username || `User ${players.p1?.id}` || "Player 1"}: {seriesScore.p1Wins}
                      </Badge>
                      <Badge bg="dark">
                        {players.p2?.username || `User ${players.p2?.id}` || "Player 2"}: {seriesScore.p2Wins}
                      </Badge>
                    </div>
                  ) : seriesScore.isDraw ? (
                    <div className="d-flex align-items-center">
                      <Badge bg="warning" className="me-2">
                        Draw - Both players tied!
                      </Badge>
                      <Badge bg="dark" className="me-2">
                        {players.p1?.username || `User ${players.p1?.id}` || "Player 1"}: {seriesScore.p1Wins}
                      </Badge>
                      <Badge bg="dark">
                        {players.p2?.username || `User ${players.p2?.id}` || "Player 2"}: {seriesScore.p2Wins}
                      </Badge>
                    </div>
                  ) : (
                    <div>
                      <Badge bg="dark" className="me-2">
                        {players.p1?.username || `User ${players.p1?.id}` || "Player 1"}: {seriesScore.p1Wins}
                      </Badge>
                      <Badge bg="dark">
                        {players.p2?.username || `User ${players.p2?.id}` || "Player 2"}: {seriesScore.p2Wins}
                      </Badge>
                      {!seriesScore.match3Needed && (
                        <div className="mt-2">
                          <Badge bg="info">Series ended early - same winner in matches 1 & 2</Badge>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {creatingMatches && (
                  <div className="mb-3">
                    <Spinner size="sm" className="me-2" />
                    Preparing matches...
                  </div>
                )}

                <div className="d-grid gap-3">
                  {matches.length === 0 ? (
                    <div className="text-muted">Matches will appear here once both players join.</div>
                  ) : (
                    matches.map((m) => {
                      const statusVariant =
                        m.status === "completed"
                          ? "success"
                          : m.status === "disputed"
                          ? "danger"
                          : m.status === "ongoing"
                          ? "info"
                          : "secondary";
                      
                      // Don't show match 3 if it's not needed
                      if (m.match_number === 3 && !seriesScore.match3Needed) {
                        return null;
                      }
                      
                      return (
                        <Card key={m.id}>
                          <Card.Body className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
                            <div className="mb-2 mb-md-0">
                              <div className="fw-bold">Match {m.match_number}</div>
                              <div className="small text-muted">
                                {players.p1?.username || `User ${players.p1?.id}` || "Player 1"} vs{" "}
                                {players.p2?.username || `User ${players.p2?.id}` || "Player 2"}
                              </div>
                              <div className="mt-1">
                                {m.status === "completed" && m.winner_user_id ? (
                                  <div className="d-flex align-items-center">
                                    {m.winner_user_id === 'draw' ? (
                                      <span className="text-warning fw-bold">
                                        Result: Draw
                                      </span>
                                    ) : (
                                      <>
                                        <Trophy size={16} className="me-1 text-warning" />
                                        <span className="text-success fw-bold">
                                          Winner: {m.winner_user_id === players.p1?.id 
                                            ? (players.p1?.username || `User ${players.p1?.id}`)
                                            : (players.p2?.username || `User ${players.p2?.id}`)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                ) : m.status === "disputed" ? (
                                  <span className="text-danger fw-bold">Disputed - Awaiting Resolution</span>
                                ) : (
                                  <span className="text-muted">Winner: TBD</span>
                                )}
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <Badge bg={statusVariant}>{(m.status || "pending").toUpperCase()}</Badge>
                              <Button
                                variant="outline-primary"
                                onClick={() => gotoReport(m.id)}
                              >
                                Report Results
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      );
                    })
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="mb-4">
              <Card.Header>
                <h6 className="mb-0">Players</h6>
              </Card.Header>
              <Card.Body>
                <div className="d-flex align-items-center mb-3">
                  {players.p1?.avatar_url ? (
                    <img
                      src={players.p1.avatar_url}
                      alt="p1"
                      className="rounded-circle me-3"
                      width="44"
                      height="44"
                    />
                  ) : (
                    <div
                      className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-3"
                      style={{ width: "44px", height: "44px" }}
                    >
                      <User size={22} className="text-white" />
                    </div>
                  )}
                  <div>
                    <div className="fw-bold">
                      {players.p1?.username || `User ${players.p1?.id}` || "Player 1"}
                    </div>
                    <div className="small text-muted">
                      Creator{players.p1?.username ? ` (${players.p1.username})` : ""}
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-center">
                  {players.p2?.avatar_url ? (
                    <img
                      src={players.p2.avatar_url}
                      alt="p2"
                      className="rounded-circle me-3"
                      width="44"
                      height="44"
                    />
                  ) : (
                    <div
                      className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-3"
                      style={{ width: "44px", height: "44px" }}
                    >
                      <User size={22} className="text-white" />
                    </div>
                  )}
                  <div>
                    <div className="fw-bold">
                      {players.p2 ? 
                        (players.p2.username || `User ${players.p2.id}`) : 
                        "Waiting..."
                      }
                    </div>
                    <div className="small text-muted">
                      {players.p2 ? "Opponent" : "Waiting for opponent to join"}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header>
                <h6 className="mb-0">Meta</h6>
              </Card.Header>
              <Card.Body>
                <div className="mb-2">
                  <span className="fw-bold me-2">Type:</span>
                  <span className="text-capitalize">{challenge.challenge_type}</span>
                </div>
                <div className="mb-2">
                  <span className="fw-bold me-2">Created:</span>
                  <span>{formatDateTime(challenge.created_at)}</span>
                </div>
                {challenge.challenge_started_at && (
                  <div className="mb-2">
                    <span className="fw-bold me-2">Started:</span>
                    <span>{formatDateTime(challenge.challenge_started_at)}</span>
                  </div>
                )}
                {challenge.challenge_ends_at && (
                  <div className="mb-2">
                    <span className="fw-bold me-2">Ends:</span>
                    <span>{formatDateTime(challenge.challenge_ends_at)}</span>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Cash Out Confirmation Modal */}
        <Modal show={showCashOutModal} onHide={() => setShowCashOutModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title className="d-flex align-items-center">
              <DollarSign size={20} className="me-2" />
              Confirm Cash Out
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="text-center mb-4">
              <div className="display-4 mb-3">
                {cashOutType === 'win' ? '🏆' : 
                 cashOutType === 'draw' ? '🤝' :
                 cashOutType === 'expired' ? '⏰' :
                 cashOutType === 'forfeit' ? '🏆' : '��'}
              </div>
              <h4>
                {cashOutType === 'win' ? 'Claim Your Prize!' : 
                 cashOutType === 'draw' ? 'Take Cash Back' :
                 cashOutType === 'expired' ? 'Claim Refund' :
                 cashOutType === 'forfeit' ? 'Claim Victory Prize!' :
                 'Claim Amount'}
              </h4>
            </div>
            
            <div className="bg-light p-3 rounded mb-3">
              <div className="d-flex justify-content-between mb-2">
                <span>Amount:</span>
                <span className="fw-bold">{cashOutAmount} Tokens</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Current Balance:</span>
                <span>{balance} Tokens</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <span>New Balance:</span>
                <span className="fw-bold text-success">{balance + cashOutAmount} Tokens</span>
              </div>
            </div>

            <Alert variant="info">
              <strong>Confirm Cash Out</strong>
              <br />
              {cashOutType === 'win' 
                ? "You will receive the full prize pool for winning this challenge."
                : cashOutType === 'draw'
                ? "You will receive a cash back amount (4% less than your stake) for the draw."
                : cashOutType === 'expired'
                ? "You will receive a refund (4% less than your stake) as the challenge expired."
                : cashOutType === 'forfeit'
                ? "You will receive the full prize pool as your opponent forfeited."
                : "You will receive the specified amount."}
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowCashOutModal(false)}
              disabled={processingCashOut}
            >
              Cancel
            </Button>
            <Button 
              variant={cashOutType === 'win' || cashOutType === 'forfeit' ? 'success' : 
                      cashOutType === 'draw' ? 'warning' : 'info'}
              onClick={confirmCashOut}
              disabled={processingCashOut}
            >
              {processingCashOut ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign size={16} className="me-2" />
                  Confirm Cash Out
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
  );
};

export default ChallengeDetails;