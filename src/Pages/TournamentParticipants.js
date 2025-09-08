import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../Components/MainLayout";
import { supabase } from "../supabaseClient";
import { Trophy, DollarSign } from "lucide-react";

const TournamentParticipants = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [tournamentWinner, setTournamentWinner] = useState(null);
  const [tournamentCompleted, setTournamentCompleted] = useState(false);
  const [cashOutCompleted, setCashOutCompleted] = useState(false);
  const [tournament, setTournament] = useState(null);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (user) {
          setCurrentUserId(user.id);
        }
      } catch (err) {
        console.error("Failed to get current user:", err);
      }
    };
    getCurrentUser();
  }, []);

  // Function to ensure matches are created in database
  const ensureMatchesInDatabase = async () => {
    try {
      console.log("🔄 Ensuring matches are created in database...");
      // Force the backend to generate and save matches if they don't exist
      const response = await fetch(`https://safcom-payment.onrender.com/api/tournaments/${id}/matches`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("✅ Matches ensured in database:", data.matches);
      return data.matches || [];
    } catch (err) {
      console.error("❌ Failed to ensure matches in database:", err);
      return [];
    }
  };

  useEffect(() => {
    // Fetch participants and matches from your backend API
    const fetchTournamentData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [participantsRes, tournamentRes] = await Promise.all([
          fetch(`https://safcom-payment.onrender.com/api/tournaments/${id}/participants`, {
            credentials: "include",
          }),
          fetch(`https://safcom-payment.onrender.com/api/tournaments/${id}`, {
            credentials: "include",
          })
        ]);

        if (!participantsRes.ok || !tournamentRes.ok) {
          throw new Error("Failed to fetch tournament data");
        }

        const participantsData = await participantsRes.json();
        const tournamentData = await tournamentRes.json();
        console.log("Fetched participants:", participantsData);
        console.log("Fetched tournament:", tournamentData);
        setParticipants(participantsData.participants || []);
        setTournament(tournamentData.tournament || tournamentData);
        
        // After participants are loaded, ensure matches are created in database
        if (participantsData.participants && participantsData.participants.length >= 2) {
          const databaseMatches = await ensureMatchesInDatabase();
          setMatches(databaseMatches);
          console.log("Database matches set:", databaseMatches);
        } else {
          console.log("Not enough participants for matches yet");
          setMatches([]);
        }
        
        // Check if user is admin
        await checkUserAdminStatus();
      } catch (err) {
        setError(err.message || "Error fetching tournament data");
      } finally {
        setLoading(false);
      }
    };
    fetchTournamentData();
  }, [id]);

  // Function to check if current user is admin
  const checkUserAdminStatus = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setIsAdmin(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && !profileError) {
        setIsAdmin(profile.role === "admin");
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error("Error checking admin status:", err);
      setIsAdmin(false);
    }
  };

  
  // Generate round-robin matches based on participant count
  const generateMatches = useMemo(() => {
    console.log("🔄 Generate matches called with participants:", participants.length);
    if (participants.length < 4) {
      console.log("❌ Not enough participants for matches (need 4+):", participants.length);
      return [];
    }
    
    const numParticipants = participants.length;
    const totalRounds = numParticipants - 1;
    const matchesPerRound = Math.floor(numParticipants / 2);
    
    const allMatches = [];
    const playerList = [...participants];
    
    // If odd number of players, add a "bye" placeholder
    if (numParticipants % 2 === 1) {
      playerList.push({ id: 'bye', username: 'BYE', name: 'BYE' });
    }
    
    const totalPlayers = playerList.length;
    
    for (let round = 1; round <= totalRounds; round++) {
      const roundMatches = [];
      
      for (let match = 0; match < matchesPerRound; match++) {
        const player1Index = match;
        const player2Index = totalPlayers - 1 - match;
        
        const p1 = playerList[player1Index];
        const p2 = playerList[player2Index];
        
        // Skip matches with BYE player
        if (p1?.id !== 'bye' && p2?.id !== 'bye') {
          roundMatches.push({
            id: `r${round}m${match + 1}`,
            round: round,
            matchNumber: match + 1,
            player1: p1,
            player2: p2,
            player1Points: 0,
            player2Points: 0,
            winner: null,
            status: 'pending', // pending, completed, disputed
            reportedBy: []
          });
        }
      }
      
      allMatches.push(...roundMatches);
      
      // Rotate players for next round (keep first player fixed, rotate others)
      const temp = playerList[1];
      for (let i = 1; i < totalPlayers - 1; i++) {
        playerList[i] = playerList[i + 1];
      }
      playerList[totalPlayers - 1] = temp;
    }
    
    console.log("✅ Generated", allMatches.length, "total matches across", totalRounds, "rounds");
    return allMatches;
  }, [participants]);

  
  // Calculate leaderboard with total scores
  const leaderboard = useMemo(() => {
    const stats = participants.map(participant => {
      const playerMatches = matches.filter(match => 
        match.player1?.id === participant.id || match.player2?.id === participant.id
      );
      
      let wins = 0, losses = 0, draws = 0, points = 0, totalScores = 0;
      
      playerMatches.forEach(match => {
        if (match.status === 'completed') {
          // Calculate total scores for this player
          if (match.player1?.id === participant.id) {
            totalScores += match.player1Points || 0;
          } else if (match.player2?.id === participant.id) {
            totalScores += match.player2Points || 0;
          }
          
          // Calculate wins/losses/draws and points
          if (match.winner === participant.id) {
            wins++;
            points += 3; // 3 points for win
          } else if (match.winner === 'draw') {
            draws++;
            points += 1; // 1 point for draw
          } else if (match.winner && match.winner !== participant.id) {
            losses++;
            // 0 points for loss
          }
        }
      });
      
      return {
        ...participant,
        wins,
        losses,
        draws,
        points,
        totalScores,
        matchesPlayed: wins + losses + draws
      };
    });
    
    // Sort by points (descending), then by total scores (descending), then by wins, then by join order
    return stats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.totalScores !== a.totalScores) return b.totalScores - a.totalScores;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return new Date(a.joinedAt) - new Date(b.joinedAt);
    });
  }, [participants, matches]);

  // Check if tournament is completed and determine winner
  const checkTournamentCompletion = useMemo(() => {
    if (matches.length === 0 || participants.length === 0) return { completed: false, winner: null };
    
    // Check if all matches are completed
    const allMatchesCompleted = matches.every(match => match.status === 'completed');
    
    if (!allMatchesCompleted) {
      return { completed: false, winner: null };
    }
    
    // Tournament is completed, determine winner
    if (leaderboard.length === 0) {
      return { completed: true, winner: null };
    }
    
    const topPlayer = leaderboard[0];
    const secondPlayer = leaderboard[1];
    
    // Check for ties in points
    const topPlayersWithSamePoints = leaderboard.filter(player => player.points === topPlayer.points);
    
    if (topPlayersWithSamePoints.length === 1) {
      // Clear winner
      return { completed: true, winner: topPlayer };
    }
    
    // Tie in points, check total scores among tied players
    const highestScores = Math.max(...topPlayersWithSamePoints.map(p => p.totalScores));
    const winnersWithHighestScores = topPlayersWithSamePoints.filter(p => p.totalScores === highestScores);
    
    if (winnersWithHighestScores.length === 1) {
      // Winner determined by total scores
      return { completed: true, winner: winnersWithHighestScores[0] };
    }
    
    // Still tied, take the first one (earliest joiner)
    return { completed: true, winner: winnersWithHighestScores[0] };
  }, [matches, participants, leaderboard]);

  // Update tournament completion state
  useEffect(() => {
    if (checkTournamentCompletion.completed) {
      setTournamentCompleted(true);
      setTournamentWinner(checkTournamentCompletion.winner);
    }
  }, [checkTournamentCompletion]);

  // Check cash-out status when tournament is completed and user is winner
  useEffect(() => {
    const checkCashOutStatus = async () => {
      if (!currentUserId || !tournamentCompleted || !tournamentWinner || tournamentWinner.id !== currentUserId) {
        return;
      }
      
      try {
        console.log('🔍 Checking tournament cash-out status for user:', currentUserId, 'tournament:', id);
        
        // Check if user has already cashed out from this tournament
        const { data: existingCashOut, error: cashOutError } = await supabase
          .from("tournament_cash_outs")
          .select("id, amount, type, created_at")
          .eq("tournament_id", id)
          .eq("user_id", currentUserId)
          .maybeSingle();
        
        console.log('💰 Tournament cash-out check result:', { existingCashOut, cashOutError });
        
        if (!cashOutError && existingCashOut) {
          console.log('✅ User has already cashed out:', existingCashOut);
          setCashOutCompleted(true);
        } else {
          console.log('❌ User has NOT cashed out yet');
          setCashOutCompleted(false);
        }
      } catch (error) {
        console.error('⚠️ Error checking tournament cash-out status:', error);
        setCashOutCompleted(false);
      }
    };
    
    checkCashOutStatus();
  }, [tournamentCompleted, tournamentWinner, currentUserId, id]);

  const handleReportResults = (matchId) => {
    // Check if this is a database match or generated match
    if (matches.length > 0) {
      // Database match - proceed normally
      navigate(`/tournament/${id}/report-match/${matchId}`);
    } else {
      // Generated match - need to create matches in database first
      alert("Tournament matches are being set up in the database. Please wait a moment and refresh the page.");
      // Trigger match creation by calling the backend
      ensureMatchesInDatabase().then(() => {
        // Refresh the page to get the database matches
        window.location.reload();
      });
    }
  };

  
  const handleUpdateMatch = async (matchId, player1Points, player2Points, winner) => {
    if (!isAdmin) return;
    
    try {
      const res = await fetch(`https://safcom-payment.onrender.com/api/matches/${matchId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          player1Points,
          player2Points,
          winner,
          status: 'completed'
        })
      });
      
      if (!res.ok) throw new Error('Failed to update match');
      
      // Refresh matches data
      const matchesRes = await fetch(`https://safcom-payment.onrender.com/api/tournaments/${id}/matches`, {
        credentials: "include",
      });
      const matchesData = await matchesRes.json();
      setMatches(matchesData.matches || []);
    } catch (err) {
      setError(err.message);
    }
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
          {type === 'win' ? '🎉' : '🏆'}
        </div>
        <h2 className={`fw-bold ${
          type === 'win' ? 'text-success' : 'text-primary'
        }`}>
          {message || (
            type === 'win' ? `Congratulations ${winner?.username || winner?.name || `User ${winner?.id}`}! You've Won the Tournament!` :
            "Congratulations!"
          )}
        </h2>
        <p className="text-muted">
          {type === 'win' ? "You've emerged victorious in this tournament!" :
           "Great performance in this tournament!"}
        </p>
      </div>
    );
  };

  // Calculate tournament prize
  const getTournamentPrize = () => {
    if (!participants.length || !tournament) return 0;
    
    // Get entry fee from tournament data
    const entryFeePerParticipant = tournament.entry_fee || 0;
    const totalPrizePool = participants.length * entryFeePerParticipant;
    const winnerPrize = totalPrizePool * 0.85; // 85% goes to winner, 15% platform fee
    
    return Math.floor(winnerPrize);
  };

  // Handle cash out
  const handleCashOut = async () => {
    if (!currentUserId || !tournamentWinner || tournamentWinner.id !== currentUserId) {
      alert('You are not eligible to cash out.');
      return;
    }
    
    if (cashOutCompleted) {
      alert('You have already cashed out from this tournament.');
      return;
    }
    
    try {
      const prizeAmount = getTournamentPrize();
      
      if (prizeAmount <= 0) {
        alert('Unable to calculate prize amount.');
        return;
      }
      
      // Call tournament cash-out API (similar to challenge cash-out)
      const response = await fetch(`https://safcom-payment.onrender.com/api/tournaments/${id}/cash-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: currentUserId,
          amount: prizeAmount,
          type: 'tournament_win'
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setCashOutCompleted(true);
        alert(`✅ Prize cashed out successfully! ${prizeAmount} tokens added to your wallet.`);
      } else {
        const errorMessage = result.error || 'Unknown error';
        console.error('Cash out failed:', errorMessage);
        alert(`❌ Cash out failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Cash out error:', error);
      alert(`❌ Cash out failed: ${error.message || 'Network error'}`);
    }
  };

  // Check if user can cash out
  const canCashOut = useMemo(() => {
    return tournamentCompleted && 
           tournamentWinner && 
           tournamentWinner.id === currentUserId && 
           !cashOutCompleted;
  }, [tournamentCompleted, tournamentWinner, currentUserId, cashOutCompleted]);

  // Helper function to check if current user is participating in a match
  const isUserParticipatingInMatch = (match) => {
    if (!currentUserId || !match) return false;
    return match.player1?.id === currentUserId || match.player2?.id === currentUserId ||
           match.player1_id === currentUserId || match.player2_id === currentUserId;
  };

  const currentRoundMatches = matches.filter(match => match.round === currentRound);
  const availableRounds = [...new Set(matches.map(match => match.round))].sort((a, b) => a - b);

  // Always prioritize database matches over generated ones
  // Display ALL matches regardless of round, sorted by round then match number
  console.log("🔍 Checking match sources - DB matches:", matches.length, "Generated:", generateMatches.length);
  // Use database matches if available, otherwise use generated matches
  const displayMatches = matches.length > 0 ? 
    [...matches].sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return (a.matchNumber || 0) - (b.matchNumber || 0);
    }) : 
    [...generateMatches].sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return (a.matchNumber || 0) - (b.matchNumber || 0);
    });
  console.log("🎯 Selected match source - using database:", matches.length > 0, "final count:", displayMatches.length);
  const displayAvailableRounds = matches.length > 0 ? availableRounds : 
    [...new Set(generateMatches.map(match => match.round))].sort((a, b) => a - b);
  
  console.log("Using database matches:", matches.length > 0);
  console.log("Database matches count:", matches.length);
  console.log("Generated matches count:", generateMatches.length);
  console.log("Display matches count (ALL ROUNDS):", displayMatches.length);
  console.log("Available rounds:", displayAvailableRounds);

  // Set currentRound to first available round when matches/participants change
  useEffect(() => {
    const rounds = matches.length > 0 ? 
      [...new Set(matches.map(match => match.round))].sort((a, b) => a - b) :
      [...new Set(generateMatches.map(match => match.round))].sort((a, b) => a - b);
    
    if (rounds.length > 0 && !rounds.includes(currentRound)) {
      setCurrentRound(rounds[0]);
    }
  }, [matches, generateMatches, currentRound]);

  // Add a log before rendering matches
  console.log("=== TOURNAMENT PARTICIPANTS DEBUG ===");
  console.log("Participants count:", participants.length);
  console.log("Participants:", participants);
  console.log("Database matches:", matches);
  console.log("Generated matches (fallback):", generateMatches);
  console.log("Using database matches:", matches.length > 0);
  console.log("Database matches count:", matches.length);
  console.log("Generated matches count:", generateMatches.length);
  console.log("Display matches count:", displayMatches.length);
  console.log("Available rounds:", displayAvailableRounds);
  console.log("Current round:", currentRound);
  console.log("Current user ID:", currentUserId);
  console.log("=======================================");

  return (
    <MainLayout>
      <div className="privacy-policy-container">
        <div className="privacy-policy-header text-center">
          <h1>Tournament Management</h1>
          <p className="sub-heading">Tournament ID: {id}</p>
        </div>

        {loading ? (
          <div className="text-center">
            <p>Loading tournament data...</p>
          </div>
        ) : error ? (
          <div className="text-center text-red-500">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Leaderboard */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 text-[#00ffcc]">Leaderboard</h2>
              <div className="bg-[#1a1a2e] rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[720px]">
                  <thead className="bg-[#1f1f2e] text-[#00ffcc]">
                    <tr>
                      <th className="p-2">Rank</th>
                      <th className="p-2">Player</th>
                      <th className="p-2">Points</th>
                      <th className="p-2">Total Scores</th>
                      <th className="p-2">Wins</th>
                      <th className="p-2">Draws</th>
                      <th className="p-2">Losses</th>
                      <th className="p-2">G.Played</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((player, index) => (
                      <tr key={player.id} className="border-t border-[#2a2a3e] hover:bg-[#2a2a3e] transition-colors">
                        <td className="p-2 font-bold text-[#00ffcc]">#{index + 1}</td>
                        <td className="p-2">{player.username || player.name}</td>
                        <td className="p-2 font-bold text-yellow-400">{player.points}</td>
                        <td className="p-2 font-bold text-blue-400">{player.totalScores}</td>
                        <td className="p-2 text-green-400">{player.wins}</td>
                        <td className="p-2 text-gray-400">{player.draws}</td>
                        <td className="p-2 text-red-400">{player.losses}</td>
                        <td className="p-2">{player.matchesPlayed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tournament Winner Congratulations and Cash Out Section */}
            {tournamentCompleted && tournamentWinner && (
              <div className="mb-8">
                <div className="bg-[#1a1a2e] rounded-lg p-6 border-2 border-[#00ffcc]">
                  {tournamentWinner.id === currentUserId ? (
                    // Current user is the winner
                    <>
                      <CongratulationsText type="win" winner={tournamentWinner} />
                      {canCashOut ? (
                        <div className="text-center">
                          <button
                            onClick={handleCashOut}
                            className="bg-[#00ffcc] hover:bg-[#00e6b8] text-black font-bold py-3 px-8 rounded-lg transition-all shadow-lg flex items-center justify-center mx-auto"
                          >
                            <Trophy size={20} className="mr-2" />
                            Cash Out Prize ({getTournamentPrize()} Tokens)
                          </button>
                        </div>
                      ) : cashOutCompleted ? (
                        <div className="text-center">
                          <div className="text-green-400 font-bold text-lg">
                            ✅ Prize Already Claimed!
                          </div>
                          <p className="text-gray-400 mt-2">
                            You have successfully cashed out your tournament winnings.
                          </p>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    // Someone else won
                    <div className="text-center">
                      <div className="display-4 mb-3">🏆</div>
                      <h2 className="text-2xl font-bold text-[#00ffcc] mb-2">
                        Tournament Winner: {tournamentWinner.username || tournamentWinner.name}
                      </h2>
                      <p className="text-gray-400">
                        Congratulations to the champion! Better luck next time.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Matches Table */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 text-[#00ffcc]">
                Tournament Matches
              </h2>
              
              {displayAvailableRounds.length === 0 ? (
                <div className="text-center text-gray-400 p-8">
                  No matches available
                </div>
              ) : (
                displayAvailableRounds.map(round => {
                  const roundMatches = displayMatches.filter(match => match.round === round);
                  
                  return (
                    <div key={round} className="mb-6">
                      <h3 className="text-xl font-bold mb-3 text-[#00ffcc] border-b border-[#00ffcc] pb-2">
                        Round {round}
                      </h3>
                      
                      <div className="bg-[#1a1a2e] rounded-lg overflow-hidden overflow-x-auto">
                        <table className="w-full text-left min-w-[1000px]">
                          <thead className="bg-[#1f1f2e] text-[#00ffcc]">
                            <tr>
                              <th className="p-2">Match No.</th>
                              <th className="p-2">Player 1</th>
                              <th className="p-2">Score</th>
                              <th className="p-2">Player 2</th>
                              <th className="p-2">Winner</th>
                              <th className="p-2">Status</th>
                              <th className="p-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {roundMatches.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="p-2 text-center text-gray-400">
                                  No matches for this round
                                </td>
                              </tr>
                            ) : (
                              roundMatches.map((match) => (
                                <tr
                                  key={match.id}
                                  className="border-t border-[#2a2a3e] hover:bg-[#2a2a3e] transition-colors"
                                >
                                  <td className="p-2 font-bold">Match {match.matchNumber}</td>
                                  <td className="p-2">{match.player1?.username || match.player1?.name}</td>
                                  <td className="p-2 text-center">
                                    <span className="font-bold" style={{ color: "#00ffcc" }}>
                                      {match.player1Points} - {match.player2Points}
                                    </span>
                                  </td>
                                  <td className="p-2">{match.player2?.username || match.player2?.name}</td>
                                  <td className="p-2">
                                    {match.winner === "draw" ? (
                                      <span className="text-gray-400 font-bold">DRAW</span>
                                    ) : match.winner ? (
                                      <span className="text-green-400 font-bold">
                                        {match.winner === match.player1?.id
                                          ? match.player1?.username || match.player1?.name
                                          : match.player2?.username || match.player2?.name}
                                      </span>
                                    ) : (
                                      <span className="text-gray-500">TBD</span>
                                    )}
                                  </td>
                                  <td className="p-2">
                                    <span
                                      className={`px-2 py-0.5 rounded text-white font-bold ${
                                        match.status === "completed"
                                          ? "bg-green-600 text-white"
                                          : match.status === "disputed"
                                          ? "bg-red-600 text-white"
                                          : "bg-yellow-600 text-black"
                                      }`} 
                                    >
                                      {match.status.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="p-2">
                                    <div className="flex gap-2">
                                      {match.status === "completed" ? (
                                        <span className="px-3 py-1 rounded text-sm font-semibold" style={{
                                          color:'#00ffcc', fontWeight:'bold' 
                                        }}>
                                          COMPLETED
                                        </span>
                                      ) : isUserParticipatingInMatch(match) ? (
                                        <button
                                          onClick={() => handleReportResults(match.id)}
                                          className="px-2 py-1 rounded text-sm "
                                          style={{backgroundColor: '#00ffcc', color: '#fff' , border:'none' }}
                                        >
                                          Report Results
                                        </button>
                                      ) : null}
                                      {isAdmin && (
                                        <Link to={`/report-results/${match.id}`}>
                                          <button
                                            className="px-2 py-1 rounded text-xs ml-2 "
                                           style={{color: '#46923c' , border:'none'}}>
                                            Admin Edit
                                          </button>
                                        </Link>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Tournament Info */}
            <div className="bg-[#1a1a2e] rounded-lg p-6" >
              <h3 className="text-xl font-bold mb-3" style={{color:'#00ffcc'}}> Tournament Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Total Participants:</span>
                  <span className="ml-2 font-bold">{participants.length}</span>
                </div>
                <div>
                  <span className="text-gray-400">Total Rounds:</span>
                  <span className="ml-2 font-bold">{displayAvailableRounds.length}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default TournamentParticipants;