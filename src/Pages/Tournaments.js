import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import MainLayout from "../Components/MainLayout";
import { Trophy } from "lucide-react";

const Tournaments = () => {
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("ongoing");
  const [tournaments, setTournaments] = useState([]);
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

  // Fetch tournaments
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const { data, error } = await supabase
          .from("tournament_with_game")
          .select("*");

        if (!error && data) setTournaments(data);
      } catch (err) {
        console.error("Error fetching tournaments:", err);
      }
    };

    fetchTournaments();
  }, []);

  // Filter tournaments based on tab
  const filteredTournaments = tournaments.filter((t) => {
    const isParticipant =
      Array.isArray(t.participants) && userId && t.participants.includes(userId);

    if (activeTab === "ongoing") return t.status === "upcoming" || t.status === "ongoing";
    if (activeTab === "my") return isParticipant;
    if (activeTab === "history") return t.status === "completed" && isParticipant;
    return true;
  });

  const tabs = [
    { id: "ongoing", label: "Ongoing Tournaments" },
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
            </button>
          ))}
        </div>

        {/* Tournaments List */}
        {filteredTournaments.length > 0 ? (
          <div className="row g-4">
            {filteredTournaments.map((t) => (
              <div className="col-lg-6 col-12" key={t.id}>
                <div
                  className="card h-100"
                  style={{
                    background: "#11111a",
                    border: "1px solid #1f1f2e",
                    color: "#fff",
                  }}
                >
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
                            {t.tournament_name || "Tournament"}
                          </h5>
                          {t.game_name && (
                            <p className="mb-1 small">{t.game_name}</p>
                          )}
                          <p className="mb-1 small">
                            Seats: {t.seats ?? "—"}
                          </p>
                        </div>

                        <div className="text-end">
                          <span
                            className="badge"
                            style={{
                              backgroundColor: statusColor(t.status),
                              color: "#000",
                              fontWeight: 600,
                            }}
                          >
                            {t.status ?? "unknown"}
                          </span>
                        </div>
                      </div>

                      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mt-3">
                        <div>
                          <div className="small ">
                            Entry Fee:{" "}
                            <span style={{ color: "#cbd5ce" }}>
                              KSh {t.entry_fee ?? 0}
                            </span>
                          </div>
                          <div className="small" style={{ color: "#9ff3d8" }}>
                            Prize: KSh {t.prize ?? 0}
                          </div>
                        </div>

                        <div className="d-flex gap-2">
                          <button
                            onClick={() => navigate(`/tournamentdetails/${t.id}`)}

                            className="btn"
                            style={{
                              backgroundColor: ACCENT,
                              color: "#000",
                              fontWeight: 600,
                              padding: "0.35rem 0.9rem",
                            }}
                          >
                            {activeTab === "history" ? "View Results" : "Join Now"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted mt-5">
            <p className="mb-0">No tournaments found for this category.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Tournaments;
