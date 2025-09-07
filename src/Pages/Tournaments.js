import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import MainLayout from "../Components/MainLayout";
import { Trophy, Users } from "lucide-react";

const Tournaments = () => {
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("available");
  const [tournaments, setTournaments] = useState([]);
  const [userTournaments, setUserTournaments] = useState([]); // Track joined tournaments
  const [allParticipants, setAllParticipants] = useState([]);
  const navigate = useNavigate();

  // accent color used throughout to match Help page theme
  const ACCENT = "#00ffcc";

  // Fetch user role and ID
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) return;
        setUserId(user.id);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!profileError && profileData) {
          setRole(profileData.role);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };

    fetchUserData();
  }, []);

  // Add this useEffect to fetch all tournament participants
useEffect(() => {
  const fetchAllParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from("tournament_participants")
        .select("tournament_id, user_id, status")
        .in("status", ["registered", "active", "completed"]); // Only count active participants

      if (!error && data) {
        console.log("🎮 All tournament participants:", data);
        setAllParticipants(data);
      } else if (error) {
        console.error("❌ Error fetching all participants:", error);
      }
    } catch (err) {
      console.error("🔥 Error fetching all participants:", err);
    }
  };

  fetchAllParticipants();
}, []);

  // ✅ Updated: Fetch user's tournament participations
  useEffect(() => {
    const fetchUserTournaments = async () => {
      if (!userId) return;
      
      try {
        console.log("🔍 Fetching tournaments for user:", userId);
        
        const { data, error } = await supabase
          .from("tournament_participants")
          .select("tournament_id, status, joined_at, entry_fee_paid, placement, prize_won")
          .eq("user_id", userId);

        console.log("🎮 User tournament participations:", { data, error });

        if (!error && data) {
          // Store full participation data for richer filtering
          setUserTournaments(data);
        } else if (error) {
          console.error("❌ Error fetching user tournaments:", error);
        }
      } catch (err) {
        console.error("🔥 Error fetching user tournaments:", err);
      }
    };

    fetchUserTournaments();
  }, [userId]);

useEffect(() => {
  const fetchTournaments = async () => {
    try {
      console.log("🔍 Fetching tournaments...");
      
      // Try fetching from the original tournaments table first
      const { data: directData, error: directError } = await supabase
        .from("tournaments")
        .select("*");

      console.log("📋 Direct tournaments table:", { directData, directError });

      // Then try your view
      const { data: viewData, error: viewError } = await supabase
        .from("tournament_with_game")
        .select("*");

      console.log("👁️ Tournament view data:", { viewData, viewError });

      // Use whichever works
      if (!viewError && viewData && viewData.length > 0) {
        console.log("✅ Using view data");
        setTournaments(viewData);
      } else if (!directError && directData && directData.length > 0) {
        console.log("⚠️ Using direct table data (view might be broken)");
        setTournaments(directData);
      } else {
        console.error("❌ Both queries failed:", { viewError, directError });
        setTournaments([]);
      }
    } catch (err) {
      console.error("🔥 Error fetching tournaments:", err);
      setTournaments([]);
    }
  };

  fetchTournaments();
}, []);

  // ✅ Updated: Check if user has joined a tournament (now works with array of objects)
  const hasJoinedTournament = (tournamentId) => {
    return userTournaments.some(participation => participation.tournament_id === tournamentId);
  };

  // ✅ Updated: Get user's participation details for a tournament
  const getUserParticipation = (tournamentId) => {
    return userTournaments.find(participation => participation.tournament_id === tournamentId);
  };

  // Add this helper function to calculate seats taken for a tournament
  const calculateSeatsTaken = (tournamentId) => {
    return allParticipants.filter(p => 
      p.tournament_id === tournamentId && 
      ["registered", "active", "completed"].includes(p.status)
    ).length;
  };

  // Update the formatSeats helper to use dynamic calculation
  const formatSeats = (tournamentId, totalSeats) => {
    const taken = calculateSeatsTaken(tournamentId);
    const total = totalSeats || 0;
    return `${taken}/${total}`;
  };

  // Filter tournaments based on tab
  let filteredTournaments = tournaments.filter((t) => {
    const isParticipant = hasJoinedTournament(t.id);
    const participation = getUserParticipation(t.id);
    const seatsTaken = calculateSeatsTaken(t.id);
    const isFull = seatsTaken >= (t.seats || 0);
    const isClosedOrExpired = t.status === "closed" || t.status === "expired";

    if (activeTab === "available") {
      // Show upcoming tournaments that are not full and not closed/expired
      return t.status === "upcoming" && !isFull && !isClosedOrExpired;
    }
    if (activeTab === "my") return isParticipant;
    if (activeTab === "history") {
      // Show completed tournaments where user participated
      return t.status === "completed" && isParticipant;
    }
    return true;
  });

  // Sort available tournaments by start time (soonest first)
  if (activeTab === "available") {
    filteredTournaments = filteredTournaments.sort(
      (a, b) => new Date(a.start_time) - new Date(b.start_time)
    );
  }

  const tabs = [
    { id: "available", label: "Available" },
    { id: "my", label: "My Tournaments" },
    { id: "history", label: "History" },
  ];

  // Helper to choose status color
  const statusColor = (status) => {
    if (!status) return "#6c757d";
    if (status === "ongoing") return "#28a745";
    if (status === "upcoming") return "#ffc107";
    if (status === "completed") return "#6c757d";
    return "#6c757d";
  };


  // ✅ Updated: Helper to determine button text and action with participation data
// Update the getButtonProps function to handle full tournaments
const getButtonProps = (tournament) => {
  const hasJoined = hasJoinedTournament(tournament.id);
  const participation = getUserParticipation(tournament.id);
  const seatsTaken = calculateSeatsTaken(tournament.id);
  const isFull = seatsTaken >= (tournament.seats || 0);
  const isClosedOrExpired = tournament.status === "closed" || tournament.status === "expired";
  
  if (activeTab === "history") {
    return {
      text: participation?.placement ? `View Results (#${participation.placement})` : "View Results",
      onClick: () => navigate(`/tournamentdetails/${tournament.id}`),
      showButton: true
    };
  }
  
  if (hasJoined) {
    // Different text based on tournament status
    if (tournament.status === "ongoing") {
      return {
        text: "View Live",
        onClick: () => navigate(`/tournament/${tournament.id}/participants`),
        showButton: true
      };
    } else if (tournament.status === "upcoming") {
      return {
        text: "View Details",
        onClick: () => navigate(`/tournament/${tournament.id}/participants`),
        showButton: true
      };
    } else {
      return {
        text: "View Details",
        onClick: () => navigate(`/tournament/${tournament.id}/participants`),
        showButton: true
      };
    }
  }
  
  // For non-participants, check if tournament is closed/expired
  if (isClosedOrExpired) {
    return {
      text: tournament.status === "closed" ? "CLOSED" : "EXPIRED",
      onClick: null,
      showButton: false,
      isClosed: true
    };
  }
  
  // For non-participants, check if tournament is full
  if (isFull) {
    return {
      text: "FULL",
      onClick: null,
      showButton: false, // Show badge instead
      isFull: true
    };
  }
  
  return {
    text: "Join Now",
    onClick: () => navigate(`/tournamentdetails/${tournament.id}`),
    showButton: true
  };
};


  // ✅ Updated: Helper to show prize info for user's tournaments
  const getPrizeDisplay = (tournament) => {
    const participation = getUserParticipation(tournament.id);
    
    if (participation?.prize_won && participation.prize_won > 0) {
      return (
        <div className="small" style={{ color: "#00ff88" }}>
          Won: {participation.prize_won} Tokens! 🏆
        </div>
      );
    }
    
    return (
      <div className="small" style={{ color: "#9ff3d8" }}>
        Prize: {tournament.prize ?? 0} Tokens
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="container py-4 tournament">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div className="d-flex align-items-center">
            <Trophy 
              className="me-3 trophy-icon" 
              style={{ color: ACCENT }} 
              size={36} 
            />
            <div>
              <h1 className="h3 mb-0" style={{ color: ACCENT }}>
                Tournaments
              </h1>
              <p className="mb-0 small">
                Join tournaments and compete across devices (mobile, PC, console).
              </p>
            </div>
          </div>

          {/* Admin-only Add Tournament Button */}
          {role === "admin" && (
            <button
              onClick={() => navigate("/admintournamentspage")}
              className="btn"
              style={{
                backgroundColor: ACCENT,
                color: "#000",
                fontWeight: 600,
              }}
            >
              Manage Tournaments
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-4 d-flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn"
              style={
                activeTab === tab.id
                  ? { backgroundColor: ACCENT, color: "#000", fontWeight: 600 }
                  : { backgroundColor: "#1f1f2e", color: "#fff" }
              }
            >
              {tab.label}
              {/* Show count for user's tournaments */}
              {tab.id === "my" && userTournaments.length > 0 && (
                <span className="ms-1 badge bg-dark">{userTournaments.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tournaments List */}
        {filteredTournaments.length > 0 ? (
          <div className="row g-4">
            {filteredTournaments.map((t) => {
              const hasJoined = hasJoinedTournament(t.id);
              const participation = getUserParticipation(t.id);
              const buttonProps = getButtonProps(t);
              
              return (
                <div className="col-lg-6 col-12" key={t.id}>
                  <div
                    className="card h-100"
                    style={{
                      background: "#11111a",
                      border: hasJoined ? `1px solid ${ACCENT}` : "1px solid #1f1f2e",
                      color: "#fff",
                      position: "relative"
                    }}
                  >
                    {/* Winner Badge */}
                    {participation?.placement === 1 && (
                      <div 
                        style={{
                          position: "absolute",
                          top: -8,
                          right: 10,
                          background: "#FFD700",
                          color: "#000",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "0.7rem",
                          fontWeight: "bold",
                          zIndex: 10
                        }}
                      >
                        🥇 WINNER
                      </div>
                    )}
                    
                    <div className="card-body d-flex flex-column flex-md-row align-items-center gap-3">
                      {/* Image (left on md+, stacked on xs) */}
                      {t.game_image ? (
                        <img
                          src={t.game_image}
                          alt={t.game_name || "Game"}
                          style={{
                            width: 72,
                            height: 72,
                            objectFit: "cover",
                            borderRadius: 8,
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: 8,
                            background: "#1f1f2e",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#888",
                            flexShrink: 0,
                          }}
                        >
                          No Image
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-grow-1 w-100">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h5
                              className="mb-1"
                              style={{ color: ACCENT, fontWeight: 700 }}
                            >
                              {t.name || "Tournament"}
                            </h5>
                            {t.game_name && (
                              <p className="mb-1 small">{t.game_name}</p>
                            )}
                            <p className="mb-1 small d-flex align-items-center gap-1">
                              <Users size={14} />
                              Seats: {formatSeats(t.id, t.seats)} {/* Changed from t.seats_taken to t.id */}
                            </p>
                          </div>

                          <div className="text-end">
                            <div className="d-flex flex-column gap-1 align-items-end">
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: statusColor(t.status),
                                  color: t.status === "upcoming" ? "#000" : "#fff",
                                  fontWeight: 600,
                                }}
                              >
                                {t.status ?? "unknown"}
                              </span>
                              
                              {/* Joined Badge with Status */}
                              {hasJoined && (
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: participation?.status === "registered" ? ACCENT : "#28a745",
                                    color: "#000",
                                    fontWeight: 600,
                                    fontSize: "0.7rem"
                                  }}
                                >
                                  {participation?.status === "registered" ? "Registered" : participation?.status || "Joined"}
                                </span>
                              )}

                              {/* Placement Badge */}
                              {participation?.placement && participation.placement <= 3 && (
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: participation.placement === 1 ? "#FFD700" : 
                                                    participation.placement === 2 ? "#C0C0C0" : "#CD7F32",
                                    color: "#000",
                                    fontWeight: 600,
                                    fontSize: "0.7rem"
                                  }}
                                >
                                  #{participation.placement}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mt-3">
                          <div>
                            <div className="small">
                              Entry Cost:{" "}
                              <span style={{ color: "#cbd5ce" }}>
                                {t.entry_fee ?? 0} Tokens
                              </span>
                            </div>
                            {/* Enhanced prize display */}
                            {getPrizeDisplay(t)}
                          </div>

                          <div className="d-flex gap-2">
  {(() => {
    const buttonProps = getButtonProps(t);
    
    if (buttonProps.isFull) {
      // Show FULL badge instead of button
      return (
        <span
          className="badge"
          style={{
            backgroundColor: "#dc3545", // Red color for full
            color: "#fff",
            fontWeight: 600,
            padding: "0.5rem 1rem",
            fontSize: "0.8rem"
          }}
        >
          FULL
        </span>
      );
    }
    
    if (buttonProps.isClosed) {
      // Show CLOSED/EXPIRED badge instead of button
      return (
        <span
          className="badge"
          style={{
            backgroundColor: buttonProps.text === "CLOSED" ? "#dc3545" : "#6c757d", // Red for closed, gray for expired
            color: "#fff",
            fontWeight: 600,
            padding: "0.5rem 1rem",
            fontSize: "0.8rem"
          }}
        >
          {buttonProps.text}
        </span>
      );
    }
    
    // Show regular button
    return (
      <button
        onClick={buttonProps.onClick}
        className="btn"
        style={{
          backgroundColor: hasJoined ? "#28a745" : ACCENT,
          color: hasJoined ? "#fff" : "#000",
          fontWeight: 600,
          padding: "0.35rem 0.9rem",
          border: hasJoined ? "1px solid #28a745" : "none"
        }}
      >
        {buttonProps.text}
      </button>
    );
  })()}
</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-muted mt-5">
            <p className="mb-0">
              {activeTab === "my" 
                ? "You haven't joined any tournaments yet. Join one to get started!" 
                : "No tournaments found for this category."
              }
            </p>
            {activeTab === "my" && (
              <button
                onClick={() => setActiveTab("available")}
                className="btn mt-2"
                style={{
                  backgroundColor: ACCENT,
                  color: "#000",
                  fontWeight: 600,
                }}
              >
                Browse Available Tournaments
              </button>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Tournaments;