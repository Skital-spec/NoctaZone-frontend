import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Trophy, ChevronLeft, ChevronRight } from "lucide-react";

const ACCENT = "#00ffcc";

// Helper function to check if a tournament is a challenge container
const isChallengeContainer = (tournament) => {
  // Check if the name starts with "Challenge #"
  return tournament.name && tournament.name.startsWith("Challenge #");
};

const TournamentsCarousel = () => {
  const [userId, setUserId] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const navigate = useNavigate();

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      setUserId(!error && user ? user.id : null);
    };
    fetchUser();
  }, []);

  // Fetch tournaments (max 8) - FIXED: Filter out challenge containers
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const { data, error } = await supabase
          .from("tournament_with_game")
          .select("*")
          .limit(20); // Fetch more to account for filtering
        
        if (!error && data) {
          // Filter out challenge containers and limit to 8 real tournaments
          const realTournaments = data
            .filter(tournament => !isChallengeContainer(tournament))
            .slice(0, 8);
          
          setTournaments(realTournaments);
        }
      } catch (err) {
        console.error("Error fetching tournaments:", err);
      }
    };
    fetchTournaments();
  }, []);

  const handleJoinClick = (tournamentId) => {
    if (userId) navigate(`/tournamentdetails/${tournamentId}`);
    else navigate("/login");
  };

  const handleViewAllClick = () => {
    if (userId) navigate("/tournaments");
    else navigate("/login");
  };

  // Determine items per page based on screen size
  const getItemsPerPage = () => (window.innerWidth < 768 ? 1 : 4);
  const itemsPerPage = getItemsPerPage();
  const totalPages = Math.ceil(tournaments.length / itemsPerPage);

  const goToPrev = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const goToNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const startIndex = currentPage * itemsPerPage;
  const visibleTournaments = tournaments.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div
      className="tournaments-carousel-container"
      style={{
        position: "relative",
        padding: "2rem 1rem",
        background: "linear-gradient(to bottom, #000000, #141814)",
      }}
    >
      {/* Title & View All */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Trophy size={36} color={ACCENT} />
          <h2 style={{ color: ACCENT, margin: 0, fontWeight: "bold" }}>
            Tournaments
          </h2>
          <button
            onClick={handleViewAllClick}
            style={{
              backgroundColor: ACCENT,
              color: "#000",
              fontWeight: 600,
              border: "none",
              padding: "0.4rem 0.9rem",
              borderRadius: 4,
              cursor: "pointer",
              transition: "box-shadow 0.3s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.boxShadow = `0 0 12px ${ACCENT}`)
            }
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
          >
            View All
          </button>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <p style={{ color: "#888", textAlign: "center" }}>
          No tournaments available.
        </p>
      ) : (
        <>
          {/* Prev Button */}
          {currentPage > 0 && (
            <button
              onClick={goToPrev}
              aria-label="Previous page"
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                transform: "translateY(-50%)",
                backgroundColor: ACCENT,
                border: "none",
                borderRadius: "50%",
                width: 36,
                height: 36,
                cursor: "pointer",
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 6px rgba(0,255,204,0.7)",
              }}
            >
              <ChevronLeft color="#000" size={24} />
            </button>
          )}

          {/* Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${itemsPerPage}, 1fr)`,
              gap: "1.5rem",
            }}
          >
            {visibleTournaments.map((t) => (
              <div
                key={t.id}
                style={{
                  background: "#11111a",
                  border: "1px solid #1f1f2e",
                  color: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  padding: "1rem",
                  borderRadius: "8px",
                  boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                  textAlign: "left",
                }}
              >
                {t.game_image ? (
                  <img
                    src={t.game_image}
                    alt={t.game_name || "Game"}
                    style={{
                      width: "64px",
                      height: "64px",
                      objectFit: "cover",
                      borderRadius: 8,
                      marginBottom: "0.75rem",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: 8,
                      background: "#1f1f2e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#888",
                      marginBottom: "0.75rem",
                      fontSize: "0.8rem",
                    }}
                  >
                    No Image
                  </div>
                )}

                <h5
                  style={{
                    color: ACCENT,
                    fontWeight: 700,
                    marginBottom: "0.25rem",
                    fontSize: "1rem",
                  }}
                >
                  {t.name || "Tournament"}
                </h5>
                {t.game_name && (
                  <p
                    style={{
                      margin: "0 0 0.5rem 0",
                      fontSize: "0.85rem",
                      color: "#ccc",
                    }}
                  >
                    {t.game_name}
                  </p>
                )}
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem" }}>
                  Seats: {t.seats ?? "—"}
                </p>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem" }}>
                  Entry Cost:{" "}
                  <span style={{ color: "#cbd5ce" }}>
                    {t.entry_fee ?? 0} Tokens
                  </span>
                </p>
                <p
                  style={{
                    margin: "0 0 1rem 0",
                    fontSize: "0.85rem",
                    color: "#9ff3d8",
                  }}
                >
                  Prize: {t.prize ?? 0} Tokens
                </p>

                <button
                  onClick={() => handleJoinClick(t.id)}
                  style={{
                    backgroundColor: ACCENT,
                    color: "#000",
                    fontWeight: 600,
                    border: "none",
                    padding: "0.35rem 0.75rem",
                    borderRadius: 4,
                    cursor: "pointer",
                    marginTop: "auto",
                  }}
                >
                  Join Now
                </button>
              </div>
            ))}
          </div>

          {/* Next Button */}
          {currentPage < totalPages - 1 && (
            <button
              onClick={goToNext}
              aria-label="Next page"
              style={{
                position: "absolute",
                top: "50%",
                right: 0,
                transform: "translateY(-50%)",
                backgroundColor: ACCENT,
                border: "none",
                borderRadius: "50%",
                width: 36,
                height: 36,
                cursor: "pointer",
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 6px rgba(0,255,204,0.7)",
              }}
            >
              <ChevronRight color="#000" size={24} />
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default TournamentsCarousel;