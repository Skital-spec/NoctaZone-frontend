import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../Components/MainLayout";
import { supabase } from "../supabaseClient";

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
        const [participantsRes] = await Promise.all([
          fetch(`https://safcom-payment.onrender.com/api/tournaments/${id}/participants`, {
            credentials: "include",
          })
        ]);

        if (!participantsRes.ok) {
          throw new Error("Failed to fetch tournament data");
        }

        const participantsData = await participantsRes.json();
        console.log("Fetched participants:", participantsData);
        setParticipants(participantsData.participants || []);
        
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
    if (participants.length < 4) return [];
    
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
    
    return allMatches;
  }, [participants]);

  
  // Calculate leaderboard
  const leaderboard = useMemo(() => {
    const stats = participants.map(participant => {
      const playerMatches = matches.filter(match => 
        match.player1?.id === participant.id || match.player2?.id === participant.id
      );
      
      let wins = 0, losses = 0, draws = 0, points = 0;
      
      playerMatches.forEach(match => {
        if (match.status === 'completed') {
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
        matchesPlayed: wins + losses + draws
      };
    });
    
    // Sort by points (descending), then by wins, then by join order
    return stats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return new Date(a.joinedAt) - new Date(b.joinedAt);
    });
  }, [participants, matches]);

  const handleReportResults = (matchId) => {
    // Check if this is a database match or generated match
    if (matches.length > 0) {
      // Database match - proceed normally
      navigate(`/tournament/${id}/report-match/${matchId}`);
    } else {
      // Generated match - show message that matches need to be created in database
      alert("Matches are being generated in the database. Please refresh the page in a moment.");
      // Trigger a refresh of tournament data
      window.location.reload();
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
  const displayMatches = matches.length > 0 ? 
    [...matches].sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return (a.matchNumber || 0) - (b.matchNumber || 0);
    }) : 
    [...generateMatches].sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return (a.matchNumber || 0) - (b.matchNumber || 0);
    });
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

            {/* Round Navigation */}
            {displayAvailableRounds.length > 1 && (
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-3">Select Round:</h3>
                <div className="flex gap-2 flex-wrap">
                  {displayAvailableRounds.map(round => (
                    <button
                      key={round}
                      onClick={() => setCurrentRound(round)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        currentRound === round
                          ? 'bg-[#00ffcc] text-[#1a1a2e] font-bold'
                          : 'bg-[#2a2a3e] text-white hover:bg-[#3a3a4e]'
                      }`}
                    >
                      Round {round}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Matches Table */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 text-[#00ffcc]">
                All Tournament Matches
              </h2>
              <div className="bg-[#1a1a2e] rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[1000px]">
  <thead className="bg-[#1f1f2e] text-[#00ffcc]">
    <tr>
      <th className="p-2">Round</th>
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
    {displayMatches.length === 0 ? (
      <tr>
        <td colSpan={8} className="p-2 text-center text-gray-400">
          No matches available
        </td>
      </tr>
    ) : (
      displayMatches.map((match) => (
        <tr
          key={match.id}
          className="border-t border-[#2a2a3e] hover:bg-[#2a2a3e] transition-colors"
        >
          <td className="p-2 font-bold text-[#00ffcc]">Round {match.round}</td>
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
              {isUserParticipatingInMatch(match) && (
                <button
                  onClick={() => handleReportResults(match.id)}
                  className="px-2 py-1 rounded text-sm transition-colors"
                  style={{ backgroundColor: "blue", border: "none", color: "white" }}
                >
                  Report Results
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => {
                    const p1Points = prompt(
                      `Player 1 (${match.player1?.username}) Points:`,
                      match.player1Points
                    );
                    const p2Points = prompt(
                      `Player 2 (${match.player2?.username}) Points:`,
                      match.player2Points
                    );
                    if (p1Points !== null && p2Points !== null) {
                      const winner =
                        p1Points > p2Points
                          ? match.player1?.id
                          : p2Points > p1Points
                          ? match.player2?.id
                          : "draw";
                      handleUpdateMatch(
                        match.id,
                        parseInt(p1Points),
                        parseInt(p2Points),
                        winner
                      );
                    }
                  }}
                  className="px-2 py-1 rounded"
                  style={{ backgroundColor: "#00ffcc", border: "none" }}
                >
                  Edit
                </button>

                
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
                <div>
                  <span className="text-gray-400">Current Round:</span>
                  <span className="ml-2 font-bold">{currentRound}</span>
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