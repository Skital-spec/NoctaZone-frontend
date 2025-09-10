import React, { useEffect, useMemo, useState , useCallback} from "react";
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
} from "react-bootstrap";
import {
  ArrowLeft,
  Users,
  Calendar,
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

// Challenge states
const CHALLENGE_STATES = {
  WAITING_FOR_START: 'waiting_for_start',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  FORFEITED: 'forfeited'
};

const ChallengeDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const walletContext = useWallet();
  
  // Destructure with fallbacks in case wallet context fails
  const { 
    balance = 0, 
    deposit = () => {}, 
    loading: walletLoading = false 
  } = walletContext || {};
  const [challenge, setChallenge] = useState(null);
  const [players, setPlayers] = useState({ p1: null, p2: null });
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [cashOutType, setCashOutType] = useState(null); // 'winner', 'draw', 'refund', 'forfeit'
  const [cashOutAmount, setCashOutAmount] = useState(0);
  const [processingCashOut, setProcessingCashOut] = useState(false);
  const [cashOutCompleted, setCashOutCompleted] = useState(false);
  const [startingChallenge, setStartingChallenge] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [showInstructions, setShowInstructions] = useState(false);

  // Get current user ID from Supabase auth
  const [currentUserId, setCurrentUserId] = useState(null);
  
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        // First check if there's an active session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          return;
        }
        
        // Only proceed if we have an active session
        if (session?.user) {
          console.log('✅ Active session found in ChallengeDetails:', session.user.id);
          setCurrentUserId(session.user.id);
        } else {
          console.log('ℹ️  No active session in ChallengeDetails - user not logged in');
        }
      } catch (err) {
        console.error('Failed to get current user:', err);
      }
    };
    
    getCurrentUser();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed in ChallengeDetails:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setCurrentUserId(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUserId(null);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const loadChallenge = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Challenge + players from backend
      const chRes = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}`, { credentials: "include" });
      if (!chRes.ok) throw new Error("Failed to load challenge");
      const chJson = await chRes.json();
      
      // Sanitize challenge data to ensure no complex objects are rendered
      const sanitizedChallenge = {
        ...chJson.challenge,
        participants: Array.isArray(chJson.challenge?.participants) 
          ? chJson.challenge.participants.length 
          : (chJson.challenge?.participants || 0)
      };
      setChallenge(sanitizedChallenge);
      
      // 2) Load players - sanitize player data
      if (chJson.players) {
        const sanitizedPlayers = {
          p1: chJson.players.p1 ? {
            id: String(chJson.players.p1.id || ''),
            username: String(chJson.players.p1.username || 'User undefined'),
            avatar_url: chJson.players.p1.avatar_url || null
          } : {
            id: sanitizedChallenge.creator_id,
            username: 'User undefined',
            avatar_url: null
          },
          p2: chJson.players.p2 ? {
            id: String(chJson.players.p2.id || ''),
            username: String(chJson.players.p2.username || 'User undefined'),
            avatar_url: chJson.players.p2.avatar_url || null
          } : sanitizedChallenge.opponent_id ? {
            id: sanitizedChallenge.opponent_id,
            username: 'User undefined',
            avatar_url: null
          } : null
        };
        setPlayers(sanitizedPlayers);
      } else {
        // Fallback when no player data is returned
        const fallbackPlayers = {
          p1: {
            id: sanitizedChallenge.creator_id,
            username: 'User undefined',
            avatar_url: null
          },
          p2: sanitizedChallenge.opponent_id ? {
            id: sanitizedChallenge.opponent_id,
            username: 'User undefined', 
            avatar_url: null
          } : null
        };
        setPlayers(fallbackPlayers);
      }
      
      // 3) Ensure matches exist for challenges with 2 participants
      if (chJson.challenge && chJson.challenge.participants >= 2) {
        try {
          await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}/ensure-matches`, {
            method: 'POST',
            credentials: "include"
          });
        } catch (ensureError) {
          console.warn("Failed to ensure matches:", ensureError);
        }
      }
      
      // 4) Load matches - sanitize match data
      const mRes = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}/matches`, { credentials: "include" });
      const mJson = await mRes.json();
      const sanitizedMatches = (mJson.matches || []).map(match => ({
        id: String(match.id || ''),
        match_number: Number(match.match_number || 0),
        status: String(match.status || 'pending'),
        winner_user_id: match.winner_user_id ? String(match.winner_user_id) : null,
        player1_id: match.player1_id ? String(match.player1_id) : null,
        player2_id: match.player2_id ? String(match.player2_id) : null,
        is_draw: Boolean(match.is_draw) // Ensure boolean value for is_draw
      }));
      setMatches(sanitizedMatches);
      
    } catch (err) {
      setError(err.message || "Failed to load challenge");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]); // Now loadChallenge is a dependency

  // Separate effect to check cash-out status when currentUserId becomes available
  const checkCashOutStatus = useCallback(async () => {
    if (!currentUserId || !id) return;
    
    try {
      const { data: existingCashOut, error: cashOutError } = await supabase
        .from("challenge_cash_outs")
        .select("id, type, amount, processed_at, challenge_id, user_id")
        .eq("challenge_id", id)
        .eq("user_id", currentUserId)
        .maybeSingle();
      
      if (!cashOutError && existingCashOut) {
        setCashOutCompleted(true);
        setCashOutAmount(existingCashOut.amount);
        setCashOutType(existingCashOut.type);
      } else {
        setCashOutCompleted(false);
      }
    } catch (error) {
      console.error('Error checking cash-out status:', error);
      setCashOutCompleted(false);
    }
  }, [currentUserId, id]);
  
  useEffect(() => {
    checkCashOutStatus();
  }, [checkCashOutStatus]);

  // Poll for updates in open challenges
  useEffect(() => {
    if (!challenge || challenge.challenge_type !== 'open' || players.p2) return;
    
    const t = setInterval(() => {
      loadChallenge();
    }, 4000);
    
    return () => clearInterval(t);
  }, [challenge, players.p2, loadChallenge]);

  // Enhanced series score calculation with updated draw logic and timeout handling
  const seriesScore = useMemo(() => {
    // Add a fallback for when players or matches are not yet loaded
    if (!players || !players.p1 || !players.p2 || !matches) {
      return { p1Wins: 0, p2Wins: 0, draws: 0, seriesWinner: null, isDraw: false, match3Needed: true, allMatchesComplete: false };
    }
    
    if (matches.length === 0) {
      return { p1Wins: 0, p2Wins: 0, draws: 0, seriesWinner: null, isDraw: false, match3Needed: true, allMatchesComplete: false };
    }
    
    let p1Wins = 0;
    let p2Wins = 0;
    let draws = 0;
    const completedMatches = matches.filter(m => m.status === "completed");
    
    // If we have a challenge with a winner but no completed matches, it's likely a timeout
    if (challenge?.status === 'completed' && challenge?.winner_user_id && completedMatches.length === 0) {
      console.log('⚠️ Challenge marked as completed but no completed matches found. Checking for timeout winner...');
      const winner = challenge.winner_user_id === players.p1.id ? players.p1 : players.p2;
      console.log('🏆 Using challenge winner from timeout:', winner);
      return { 
        p1Wins: winner.id === players.p1.id ? 1 : 0, 
        p2Wins: winner.id === players.p2.id ? 1 : 0, 
        draws: 0, 
        seriesWinner: winner, 
        isDraw: false, 
        match3Needed: false, 
        allMatchesComplete: true 
      };
    }
    
    completedMatches.forEach((m) => {
      if (m.is_draw) {
        draws++;
      } else if (m.winner_user_id === players.p1.id) {
        p1Wins++;
      } else if (m.winner_user_id === players.p2.id) {
        p2Wins++;
      }
    });
    
    // Check if match 3 is needed based on new logic
    let match3Needed = true;
    let seriesWinner = null;
    let isDraw = false;
    
    // If there's a challenge winner but no series winner yet, use that
    if (challenge?.winner_user_id && !seriesWinner) {
      seriesWinner = challenge.winner_user_id === players.p1.id ? players.p1 : players.p2;
      match3Needed = false;
      isDraw = false;
    }
    // If we have two matches and they're both won by the same player, no need for match 3
    else if (completedMatches.length >= 2) {
      const match1 = completedMatches.find(m => m.match_number === 1);
      const match2 = completedMatches.find(m => m.match_number === 2);
      
      if (match1 && match2) {
        // If same winner for both match 1 and 2 (and not draws), series is over
        if (!match1.is_draw && !match2.is_draw && match1.winner_user_id === match2.winner_user_id) {
          match3Needed = false;
          seriesWinner = match1.winner_user_id === players.p1.id ? players.p1 : players.p2;
        }
        // If both match 1 and 2 are draws, match 3 is needed
        else if (match1.is_draw && match2.is_draw) {
          match3Needed = true;
        }
        // Any other combination (different winners, one draw) needs match 3
        else {
          match3Needed = true;
        }
      }
    }
    
    // If all 3 matches are complete or we have a clear winner, determine final winner
    if ((completedMatches.length >= 3 && match3Needed) || (challenge?.status === 'completed' && challenge?.winner_user_id)) {
      if (challenge?.winner_user_id) {
        // If challenge has a winner, use that
        seriesWinner = challenge.winner_user_id === players.p1.id ? players.p1 : players.p2;
      } else if (p1Wins > p2Wins) {
        seriesWinner = players.p1;
      } else if (p2Wins > p1Wins) {
        seriesWinner = players.p2;
      } else {
        // Series is a draw (equal wins)
        isDraw = true;
      }
    }
    
    // Determine if all required matches are complete
    const requiredMatches = match3Needed ? 3 : 2;
    const allMatchesComplete = completedMatches.length >= requiredMatches;
    
    // Ensure seriesWinner is a clean object with only necessary fields
    if (seriesWinner && typeof seriesWinner === 'object') {
      seriesWinner = {
        id: typeof seriesWinner.id === 'object' ? seriesWinner.id.toString() : seriesWinner.id,
        username: typeof seriesWinner.username === 'object' ? seriesWinner.username.toString() : seriesWinner.username
      };
    }
    
    // Ensure all values are primitives to prevent React error #31
    const result = { 
      p1Wins: typeof p1Wins === 'object' ? parseInt(p1Wins) : p1Wins,
      p2Wins: typeof p2Wins === 'object' ? parseInt(p2Wins) : p2Wins,
      draws: typeof draws === 'object' ? parseInt(draws) : draws,
      seriesWinner: seriesWinner,
      isDraw: typeof isDraw === 'object' ? Boolean(isDraw) : isDraw,
      match3Needed: typeof match3Needed === 'object' ? Boolean(match3Needed) : match3Needed,
      allMatchesComplete: typeof allMatchesComplete === 'object' ? Boolean(allMatchesComplete) : allMatchesComplete
    };
    
    return result;
  }, [players, matches]);

  // Auto-update challenge status when all matches are complete
  useEffect(() => {
    const updateChallengeStatus = async () => {
      console.log('🔍 Checking challenge completion:', {
        challenge: challenge?.status,
        allMatchesComplete: seriesScore.allMatchesComplete,
        seriesWinner: seriesScore.seriesWinner?.username,
        isDraw: seriesScore.isDraw
      });
      
      if (!challenge || !seriesScore.allMatchesComplete) return;
      if (challenge.status === 'completed') {
        console.log('✅ Challenge already completed');
        return;
      }
      
      console.log('🎯 Attempting to update challenge status to completed');
      
      try {
        // Call backend API to update challenge status
        const response = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}/update-status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            status: 'completed',
            winner_user_id: seriesScore.seriesWinner?.id || null,
            is_draw: seriesScore.isDraw,
            user_id: currentUserId // Include user_id for authentication if needed
          })
        });
        
        if (response.ok) {
          console.log('✅ Challenge status updated successfully');
          // Reload challenge to get updated status
          await loadChallenge();
        } else {
          const errorData = await response.json();
          console.warn('⚠️ Backend status update failed:', errorData.error);
          // Continue with local state calculation for UI
        }
      } catch (error) {
        console.error('❌ Failed to update challenge status:', error);
        // Even if the API call fails, we can still show the completion UI
        // based on the local seriesScore calculation
      }
    };
    
    updateChallengeStatus();
  }, [challenge, seriesScore.allMatchesComplete, seriesScore.seriesWinner, seriesScore.isDraw, id, currentUserId, loadChallenge]);

  // Timer effect for countdowns
  const updateTimers = useCallback(() => {
    if (!challenge) return;

    const now = new Date().getTime();

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
  }, [challenge]);

  // Determine challenge state
  const challengeState = useMemo(() => {
    console.log('🔍 Determining challenge state with:', { challenge, seriesScore });
    
    if (!challenge) {
      console.log('🔍 Challenge state: No challenge data - returning WAITING_FOR_START');
      return CHALLENGE_STATES.WAITING_FOR_START;
    }

    const now = new Date().getTime();
    
    // Check if challenge is completed (winner or draw)
    if (seriesScore.seriesWinner || seriesScore.isDraw) {
      console.log('🏁 Challenge COMPLETED:', {
        hasWinner: !!seriesScore.seriesWinner,
        isDraw: seriesScore.isDraw,
        winnerName: seriesScore.seriesWinner?.username
      });
      return CHALLENGE_STATES.COMPLETED;
    }
    
    // Check if challenge is expired
    if (challenge.challenge_ends_at && new Date(challenge.challenge_ends_at).getTime() < now) {
      console.log('⏰ Challenge EXPIRED');
      return CHALLENGE_STATES.EXPIRED;
    }
    
    
    // Check if challenge is active
    if (challenge.challenge_started_at) {
      console.log('▶️ Challenge ACTIVE');
      return CHALLENGE_STATES.ACTIVE;
    }
    
    console.log('⏸️ Challenge WAITING_FOR_START');
    return CHALLENGE_STATES.WAITING_FOR_START;
  }, [challenge, seriesScore]);

  // Timer effect for countdowns
  useEffect(() => {
    if (!challenge) return;
    
    // Stop timer if challenge is completed
    if (challengeState === CHALLENGE_STATES.COMPLETED) {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    
    updateTimers(); // Run once immediately
    
    const interval = setInterval(() => {
      // Check if challenge became completed during timer execution
      if (challengeState === CHALLENGE_STATES.COMPLETED) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      updateTimers();
    }, 1000);
    
    return () => clearInterval(interval);
  }, [challenge, updateTimers, challengeState]);

  // Check for forfeit scenarios (when only one player reports and time expires)
  const checkForfeitScenario = useMemo(() => {
    if (!challenge || challengeState !== CHALLENGE_STATES.EXPIRED || !currentUserId) return null;
    
    // Check if only one player has reported results
    const reportedMatches = matches.filter(m => m.status === 'completed');
    const disputedMatches = matches.filter(m => m.status === 'disputed');
    
    // If there are reported matches but not all matches are complete, and time expired
    if (reportedMatches.length > 0 && reportedMatches.length < 3 && disputedMatches.length === 0) {
      // Determine who reported and who didn't
      // This is a simplified check - in reality you'd want to track who reported what
      if (currentUserId === players.p1?.id || currentUserId === players.p2?.id) {
        return { winner: currentUserId, type: 'forfeit' };
      }
    }
    
    return null;
  }, [challenge, challengeState, matches, players, currentUserId]);

  // Enhanced canCashOut that includes forfeit scenarios and winner validation
  const canCashOut = useMemo(() => {
    if (!challenge || !players.p1 || !players.p2) {
      return false;
    }
    
    if (!currentUserId) {
      console.log('🚫 canCashOut: false - no current user ID');
      return false;
    }
    
    const isPlayer1 = currentUserId === players.p1.id;
    const isPlayer2 = currentUserId === players.p2.id;
    
    if (!isPlayer1 && !isPlayer2) {
      return false;
    }
    
    // Challenge completed scenarios
    if (challengeState === CHALLENGE_STATES.COMPLETED) {
      // For draw: both players can cash out
      if (seriesScore.isDraw) {
        return true;
      }
      // For win: only the winner can cash out
      if (seriesScore.seriesWinner) {
        return seriesScore.seriesWinner.id === currentUserId;
      }
      return false;
    }
    
    // Challenge expired scenarios - refunds for all participants
    if (challengeState === CHALLENGE_STATES.EXPIRED) {
      // Forfeit scenario - only the winner can cash out
      if (checkForfeitScenario && checkForfeitScenario.winner === currentUserId) {
        return true;
      }
      // Regular expiry - all participants get refunds
      if (!checkForfeitScenario) {
        return true;
      }
      return false;
    }
    
    return false;
  }, [challenge, players, challengeState, checkForfeitScenario, currentUserId, seriesScore]);

  // Calculate cash out amounts
  const getCashOutAmounts = () => {
    if (!challenge) return { winAmount: 0, drawAmount: 0, refundAmount: 0 };
    
    const entryFee = challenge.entry_fee || 0;
    const totalStake = entryFee * 2; // Both players' entry fees
    
    // Win amount: exactly what the database expects (totalStake * 0.85)
    const winAmount = totalStake * 0.85; // Keep as float, don't floor yet
    const drawAmount = Math.floor(entryFee * 0.90); // 10% deduction (matches server)
    const refundAmount = Math.floor(entryFee * 0.98); // 2% deduction (matches server)
    const expiredAmount = Math.floor(entryFee * 0.90); // 10% deduction (matches server)
    
    console.log('💰 Cash out amounts calculated:', {
      entryFee,
      totalStake,
      winAmount: winAmount, // Database expects this exact value
      drawAmount,
      refundAmount,
      'winAmount (floored)': Math.floor(winAmount)
    });
    
    // Ensure all values are numbers to prevent React error #31
    return { 
      winAmount: typeof winAmount === 'object' ? parseFloat(winAmount) : winAmount,
      drawAmount: typeof drawAmount === 'object' ? parseInt(drawAmount) : drawAmount,
      refundAmount: typeof refundAmount === 'object' ? parseInt(refundAmount) : refundAmount,
      expiredAmount: typeof expiredAmount === 'object' ? parseInt(expiredAmount) : expiredAmount
    };
  };

  const handleStartChallenge = async () => {
    setStartingChallenge(true);
    try {
      const response = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          user_id: currentUserId
        })
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
    if (!currentUserId) {
      alert('Please wait for authentication to complete.');
      return;
    }
    
    // Verify user is a participant before allowing cash out
    const isPlayer1 = currentUserId === players.p1?.id;
    const isPlayer2 = currentUserId === players.p2?.id;
    
    if (!isPlayer1 && !isPlayer2) {
      alert('You are not a participant in this challenge.');
      return;
    }
    
    const amounts = getCashOutAmounts();
    setCashOutType(type);
    
    switch (type) {
      case 'winner':
        setCashOutAmount(amounts.winAmount);
        break;
      case 'draw':
        setCashOutAmount(amounts.drawAmount);
        break;
      case 'forfeit':
        setCashOutAmount(amounts.refundAmount);
        break;
      default:
        setCashOutAmount(0);
    }
    
    console.log('💰 Cash out initiated:', {
      type,
      amount: type === 'winner' ? amounts.winAmount :
              type === 'draw' ? amounts.drawAmount :
              amounts.refundAmount,
      isPlayer1,
      isPlayer2
    });
    
    setShowCashOutModal(true);
  };

  const confirmCashOut = async () => {
    if (!currentUserId) {
      alert('Please wait for authentication to complete or log in.');
      return;
    }
    
    // Validate user is a participant
    const isPlayer1 = currentUserId === players.p1?.id;
    const isPlayer2 = currentUserId === players.p2?.id;
    
    if (!isPlayer1 && !isPlayer2) {
      alert('You are not a participant in this challenge.');
      return;
    }
    
    setProcessingCashOut(true);
    try {
      console.log('🚀 Starting cash out process:', {
        challengeId: id,
        userId: currentUserId,
        type: cashOutType,
        amount: cashOutAmount,
        'amount (exact)': cashOutAmount,
        'amount (string)': cashOutAmount.toString(),
        challenge: {
          entry_fee: challenge?.entry_fee,
          total_stake: (challenge?.entry_fee || 0) * 2,
          expected_win_amount: (challenge?.entry_fee || 0) * 2 * 0.85
        }
      });
      
      // First call the backend to cash out and record the transaction
      const requestBody = {
        user_id: currentUserId,
        type: cashOutType,
        amount: cashOutAmount // Send exact amount as calculated
      };
      
      console.log('📡 Request body:', JSON.stringify(requestBody, null, 2));
      
      const updateRes = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}/cash-out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestBody)
      });
      
      const responseData = await updateRes.json();
      console.log('💰 Cash out response:', {
        status: updateRes.status,
        statusText: updateRes.statusText,
        data: responseData
      });
      
      if (updateRes.ok) {
        // Update local wallet balance
        const refText = `Challenge ${id} - ${
          cashOutType === 'winner' ? 'Prize' : 
          cashOutType === 'draw' ? 'Cash Back' :
          cashOutType === 'refund' ? 'Refund (Expired)' :
          'Refund (Forfeit)'
        }`;
        
        deposit(cashOutAmount, refText);
        
        setCashOutCompleted(true);
        setShowCashOutModal(false);
        console.log('✅ Cash out completed successfully - buttons should now disappear');
        // Reload challenge to update status
        await loadChallenge();
      } else {
        console.error("Cash out error:", responseData);
        const errorMsg = responseData.error || responseData.message || `HTTP ${updateRes.status}: ${updateRes.statusText}`;
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Cash out error:", error);
      alert(`Failed to process cash out: ${error.message}. Please try again.`);
    } finally {
      setProcessingCashOut(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    // Ensure dateString is a string
    const cleanDateString = typeof dateString === 'object' ? dateString.toString() : dateString;
    const date = new Date(cleanDateString);
    return date.toLocaleString();
  };

  const getStatusVariant = (status) => {
    // Ensure status is a string
    const cleanStatus = typeof status === 'object' ? status.toString() : status || "secondary";
    
    switch (cleanStatus) {
      case "pending":
        return "warning";
      case "active":
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
    
    // Ensure winner is a clean object if it exists
    const cleanWinner = winner && typeof winner === 'object' ? {
      id: typeof winner.id === 'object' ? winner.id.toString() : winner.id,
      username: typeof winner.username === 'object' ? winner.username.toString() : winner.username
    } : winner;
    
    return (
      <div className={`text-center mb-4 ${isVisible ? 'animate__animated animate__bounceIn' : 'opacity-0'}`}>
        <div className="display-4 mb-3">
          {type === 'winner' ? '🎉' : 
           type === 'draw' ? '🤝' :
           type === 'refund' ? '⏰' :
           type === 'refund' ? '⏰' :
           type === 'forfeit' ? '🏆' :
           type === 'lose' ? '😔' : '🎊'}
        </div>
        <h2 className={`fw-bold ${
          type === 'winner' ? 'text-success' : 
          type === 'draw' ? 'text-warning' :
          type === 'refund' ? 'text-info' :
          type === 'forfeit' ? 'text-success' :
          type === 'lose' ? 'text-danger' : 'text-primary'
        }`}>
          {message || (
            type === 'winner' ? `Congratulations ${cleanWinner?.username || `User ${cleanWinner?.id}`}! You've Won!` :
            type === 'draw' ? "Congratulations! You've Both Drawn!" :
            type === 'refund' ? "Challenge Expired - Refunds Available!" :
            type === 'forfeit' ? "You Won by Default!" :
            type === 'lose' ? `${cleanWinner?.username || `User ${cleanWinner?.id}`} Won the Challenge!` :
            "Congratulations!"
          )}
        </h2>
        <p className="text-muted">
          {type === 'winner' ? "You've emerged victorious in this challenge!" :
           type === 'draw' ? "It's a tie! Both players showed great skill." :
           type === 'refund' ? "The challenge time has expired. You can claim your refund." :
           type === 'forfeit' ? "Your opponent didn't report results in time!" :
           type === 'lose' ? "Better luck next time! Keep practicing to improve your skills." :
           "Cool!"}
        </p>
      </div>
    );
  };

  // Timer display component
  const TimerDisplay = ({ timeLeft, label, variant = "primary" }) => {
    // Ensure timeLeft values are numbers
    const cleanTimeLeft = {
      hours: typeof timeLeft.hours === 'object' ? parseInt(timeLeft.hours) : timeLeft.hours || 0,
      minutes: typeof timeLeft.minutes === 'object' ? parseInt(timeLeft.minutes) : timeLeft.minutes || 0,
      seconds: typeof timeLeft.seconds === 'object' ? parseInt(timeLeft.seconds) : timeLeft.seconds || 0
    };
    
    const totalSeconds = cleanTimeLeft.hours * 3600 + cleanTimeLeft.minutes * 60 + cleanTimeLeft.seconds;
    const isLowTime = totalSeconds < 3600; // Less than 5 minutes
    
    return (
      <Card className={`mb-3 ${isLowTime ? 'border-warning' : ''}`}>
        <Card.Body className="text-center">
          <div className="d-flex align-items-center justify-content-center mb-2">
            <Timer size={20} className="me-2" />
            <h5 className="mb-0">{label}</h5>
          </div>
          <div className={`display-6 fw-bold ${isLowTime ? 'text-warning' : `text-${variant}`}`}>
            {cleanTimeLeft.hours > 0 && `${cleanTimeLeft.hours.toString().padStart(2, '0')}:`}
            {cleanTimeLeft.minutes.toString().padStart(2, '0')}:{cleanTimeLeft.seconds.toString().padStart(2, '0')}
          </div>
          {isLowTime && (
            <Alert variant="warning" className="mt-2 mb-0">
              <AlertTriangle size={16} className="me-1" />
              You are Running Out Of Time
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
          {walletLoading && (
            <div className="mt-2 text-muted">
              <small>Initializing wallet...</small>
            </div>
          )}
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

  // Add a debug section to help identify issues
  console.log('🔍 Challenge Details Debug Info:', {
    challenge,
    players,
    matches,
    loading,
    error,
    currentUserId,
    challengeState,
    seriesScore
  });

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

        {/* Active Challenge Timer */}
        {challengeState === CHALLENGE_STATES.ACTIVE && (
          <>
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
                  If no results are reported, both players will be refunded .
                </small>
              </div>
            </Card.Body>
          </Card>
          
          {/* Instructions Card */}
          <Card className="mb-4 border-info">
            <Card.Header 
              className="bg-info text-white d-flex align-items-center justify-content-between"
              style={{ cursor: 'pointer' }}
              onClick={() => setShowInstructions(!showInstructions)}
            >
              <h6 className="mb-0">How to Play</h6>
              <span style={{ transform: showInstructions ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
                ▼
              </span>
            </Card.Header>
            {showInstructions && (
              <Card.Body>
                <p className="mb-0">
                  📱 <strong>Text your opponent</strong> on the private chats page to share match codes and decide play time.<br/>
                  🎮 Play your matches and report results below.<br/>
                  ⏰ You have 24 hours to complete all the three matches .
                </p>
              </Card.Body>
            )}
          </Card>
        </>
        )}

        {/* Congratulations and Cash Out Section */}
        {(() => {
          const shouldShow = canCashOut && !cashOutCompleted && currentUserId;
          return shouldShow;
        })() && (
          <Card className="mb-4 border-0 shadow">
            <Card.Body className="text-center p-5">
              {challengeState === CHALLENGE_STATES.COMPLETED ? (
                // Normal completion - winner or draw
                seriesScore.isDraw ? (
                  <>
                    <CongratulationsText type="draw" />
                    <Button
                      variant="warning"
                      size="lg"
                      onClick={() => handleCashOut('draw')}
                      className="px-5"
                    >
                      <DollarSign size={20} className="me-2" />
                       Cash Out ({getCashOutAmounts().drawAmount} Tokens)
                    </Button>
                  </>
                ) : seriesScore.seriesWinner && seriesScore.seriesWinner.id === currentUserId ? (
                  // Only show win button to the actual winner
                  <>
                    <CongratulationsText type="winner" winner={seriesScore.seriesWinner} />
                    <Button
                      variant="success"
                      size="lg"
                      onClick={() => handleCashOut('winner')}
                      className="px-5"
                    >
                      <Trophy size={20} className="me-2" />
                      Cash Out Your Prize 
                    </Button>
                  </>
                ) : seriesScore.seriesWinner ? (
                  // Show congratulations to loser but no cash-out button
                  <>
                    <CongratulationsText type="lose" winner={seriesScore.seriesWinner} />
                    <div className="text-muted">
                      Better luck next time! The winner gets the prize.
                    </div>
                  </>
                ) : null
              ) : challengeState === CHALLENGE_STATES.EXPIRED ? (
                // Challenge expired - show message only, no manual buttons (automatic refund)
                <>
                  <CongratulationsText type="expired" message="Challenge Time Expired!" />
                  <div className="text-center text-muted mt-3">
                    <p>Your refund has been automatically processed and added to your wallet.</p>
                  </div>
                </>
              ) : null}
            </Card.Body>
          </Card>
        )}
        
        {/* Authentication required message */}
        {canCashOut && !cashOutCompleted && !currentUserId && (
          <Card className="mb-4 border-warning">
            <Card.Body className="text-center p-4">
              <AlertTriangle size={48} className="text-warning mb-3" />
              <h4 className="text-warning">Authentication Required</h4>
              <p className="text-muted">
                Please wait while we verify your identity before proceeding with cash out.
              </p>
              <Spinner animation="border" size="sm" className="text-warning" />
            </Card.Body>
          </Card>
        )}

        {/* Cash Out Completed Message */}
        {cashOutCompleted && (
          <Card className="mb-4 border-success">
            <Card.Body className="text-center p-4">
              <CheckCircle size={48} className="text-success mb-3" />
              <h4 className="text-success">Cash Out Successful!</h4>
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
                    {challenge?.game_type || "1v1 Match"}
                  </h5>
                  <Badge bg={getStatusVariant(challenge?.status)} className="text-capitalize">
                    {challenge?.status || "unknown"}
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body className="p-4">
                <Row className="mb-1">
                  <Col md={6} className="mb-1">
                    <div className="d-flex align-items-center mb-1">
                      <Users size={18} className="me-2 text-info" />
                      <span className="fw-bold">Participants</span>
                    </div>
                    <div className="ms-4">
                      <span className="h6">
                        {challenge?.participants || 0} / {challenge?.total_participants || 2}
                      </span>
                    </div>
                  </Col>
                  <Col md={6} className="mb-1">
                    <div className="d-flex align-items-center mb-1">
                      <Calendar size={18} className="me-2 text-warning" />
                      <span className="fw-bold">Scheduled Time</span>
                    </div>
                    <div className="ms-4">{formatDateTime(challenge?.play_time)}</div>
                  </Col>
                </Row>

                <Row className="mb-4">
                  <Col md={6} className="mb-1">
                    <div className="fw-bold">Entry Fee</div>
                    <div className="h5 text-success">{challenge?.entry_fee || 0} Tokens</div>
                  </Col>
                  <Col md={6} className="mb-1">
                    <div className="fw-bold">Prize Pool</div>
                    <div className="h5 text-success">
                      {(challenge?.prize_amount || (challenge?.entry_fee || 0) * 2)} Tokens
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
                        {players.p1?.username || `User ${players.p1?.id || '1'}`}: {seriesScore.p1Wins}
                      </Badge>
                      <Badge bg="dark">
                        {players.p2?.username || `User ${players.p2?.id || '2'}`}: {seriesScore.p2Wins}
                      </Badge>
                    </div>
                  ) : seriesScore.isDraw ? (
                    <div className="d-flex align-items-center">
                      <Badge bg="warning" className="me-2">
                        Draw - Both players tied!
                      </Badge>
                      <Badge bg="dark" className="me-2">
                        {players.p1?.username || `User ${players.p1?.id || '1'}`}: {seriesScore.p1Wins}
                      </Badge>
                      <Badge bg="dark">
                        {players.p2?.username || `User ${players.p2?.id || '2'}`}: {seriesScore.p2Wins}
                      </Badge>
                    </div>
                  ) : (
                    <div>
                      <Badge bg="dark" className="me-2">
                        {players.p1?.username || `User ${players.p1?.id || '1'}`}: {seriesScore.p1Wins}
                      </Badge>
                      <Badge bg="dark">
                        {players.p2?.username || `User ${players.p2?.id || '2'}`}: {seriesScore.p2Wins}
                      </Badge>
                      {!seriesScore.match3Needed && (
                        <div className="mt-2">
                          <Badge bg="info">Series ended early - same winner in matches 1 & 2</Badge>
                        </div>
                      )}
                    </div>
                  )}
                </div>


                <div className="d-grid gap-3">
                  {matches.length === 0 ? (
                    <div className="text-muted">Matches will appear here once both players join.</div>
                  ) : (
                    matches.map((m) => {
                      // Ensure m is a clean object and not containing complex nested objects
                      const cleanMatch = {
                        id: m.id,
                        match_number: m.match_number,
                        status: m.status,
                        winner_user_id: m.winner_user_id,
                        player1_id: m.player1_id,
                        player2_id: m.player2_id,
                        is_draw: m.is_draw || false
                      };
                      
                      const statusVariant =
                        cleanMatch.status === "completed"
                          ? "success"
                          : cleanMatch.status === "disputed"
                          ? "danger"
                          : cleanMatch.status === "pending"
                          ? "info"
                          : "secondary";
                      
                      // Don't show match 3 if it's not needed
                      if (cleanMatch.match_number === 3 && !seriesScore.match3Needed) {
                        return null;
                      }
                      
                      return (
                        <Card key={cleanMatch.id} className={cleanMatch.status === 'completed' ? 'border-success' : ''}>
                          <Card.Body className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
                            <div className="mb-2 mb-md-0">
                              <div className="fw-bold d-flex align-items-center">
                                Match {cleanMatch.match_number}
                                {cleanMatch.status === 'completed' && (
                                  <CheckCircle size={16} className="ms-2 text-success" />
                                )}
                              </div>
                              <div className="small text-muted">
                                {players.p1?.username || `User ${players.p1?.id}` || "Player 1"} vs{" "}
                                {players.p2?.username || `User ${players.p2?.id}` || "Player 2"}
                              </div>
                              <div className="mt-1">
                                {console.log(`🔍 Match ${cleanMatch.match_number} data:`, { status: cleanMatch.status, is_draw: cleanMatch.is_draw, winner_user_id: cleanMatch.winner_user_id })}
                                {cleanMatch.status === "completed" ? (
                                  <div className="d-flex align-items-center">
                                    {cleanMatch.is_draw ? (
                                      <span className="text-warning fw-bold">
                                        Result: Draw
                                      </span>
                                    ) : cleanMatch.winner_user_id ? (
                                      <>
                                        <Trophy size={16} className="me-1 text-warning" />
                                        <span className="text-success fw-bold">
                                          Winner: {cleanMatch.winner_user_id === players.p1?.id 
                                            ? (players.p1?.username || `User ${players.p1?.id}`)
                                            : (players.p2?.username || `User ${players.p2?.id}`)}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-muted">Winner: TBD</span>
                                    )}
                                  </div>
                                ) : cleanMatch.status === "disputed" ? (
                                  <span className="text-danger fw-bold">Disputed - Awaiting Resolution</span>
                                ) : (
                                  <span className="text-muted">Winner: TBD</span>
                                )}
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <Badge bg={statusVariant}>{(cleanMatch.status || "pending").toUpperCase()}</Badge>
                              {/* Only show Report Results button if individual match is not completed, not expired, AND challenge is not completed */}
                              {cleanMatch.status !== 'completed' && 
                               cleanMatch.status !== 'expired' &&
                               challenge?.status !== 'completed' && 
                               challengeState !== CHALLENGE_STATES.COMPLETED && (
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => gotoReport(cleanMatch.id)}
                                >
                                  Report Results
                                </Button>
                              )}
                              {/* Show match completion status for individual completed matches */}
                              {cleanMatch.status === 'completed' && (
                                <Badge bg="success" className="px-2 py-1">
                                  Match Complete
                                </Badge>
                              )}
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
                  {players.p1 && players.p1.avatar_url ? (
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
                  <span className="text-capitalize">{challenge?.challenge_type || "unknown"}</span>
                </div>
                <div className="mb-2">
                  <span className="fw-bold me-2">Created:</span>
                  <span>{formatDateTime(challenge?.created_at)}</span>
                </div>
                {challenge?.challenge_started_at && (
                  <div className="mb-2">
                    <span className="fw-bold me-2">Started:</span>
                    <span>{formatDateTime(challenge.challenge_started_at)}</span>
                  </div>
                )}
                {challenge?.challenge_ends_at && (
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
                {cashOutType === 'winner' ? '🏆' : 
                 cashOutType === 'draw' ? '🤝' :
                 cashOutType === 'refund' ? '⏰' :
                 cashOutType === 'forfeit' ? '🏆' :
                 '🎊'}
              </div>
              <h4>
                {cashOutType === 'winner' ? 'Claim Your Prize!' : 
                 cashOutType === 'draw' ? 'Claim Reward' :
                 cashOutType === 'refund' ? 'Claim Refund' :
                 cashOutType === 'forfeit' ? 'Claim Victory Prize!' :
                 'Claim Amount'}
              </h4>
            </div>
          

            <Alert variant="info">
              <strong>Confirm Cash Out</strong>
              <br />
              {cashOutType === 'winner' 
                ? "You will receive the full prize pool for winning this challenge."
                : cashOutType === 'draw'
                ? "You will receive the specified amount for the draw."
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
              variant={cashOutType === 'winner' || cashOutType === 'forfeit' ? 'success' : 
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