// File: AdminTournamentsPage.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import MainLayout from "../Components/MainLayout";


const AdminTournamentsPage = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTournaments = async () => {
      const { data, error } = await supabase
        .from("tournament_with_game")
        .select("*");

      if (data) setTournaments(data);
      setLoading(false);
    };

    fetchTournaments();
  }, []);

    const ACCENT = "#00ffcc";

  const handleDelete = async (id) => {
    const confirm = window.confirm("Are you sure you want to delete this tournament?");
    if (!confirm) return;

    const { error } = await supabase.from("tournaments").delete().eq("id", id);
    if (!error) {
      setTournaments((prev) => prev.filter((t) => t.id !== id));
      alert("Tournament deleted successfully.");
    }
  };

  return (
    <MainLayout>
      <div className="container py-4">
        <h1 className="text-[#00ffcc] mb-4">🛠️ Manage Tournaments</h1>
            <button
              onClick={() => navigate("/addtournamentpage")}
              className="btn"
              style={{
                backgroundColor: ACCENT,
                color: "#000",
                fontWeight: 600,
              }}
            >
              + Add Tournament
            </button>
        {loading ? (
          <p className="text-muted">Loading tournaments...</p>
        ) : tournaments.length === 0 ? (
          <p className="text-muted">No tournaments found.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-dark table-bordered">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Game</th>
                  <th>Seats</th>
                  <th>Prize</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>{t.game_name}</td>
                    <td>{t.seats}</td>
                    <td>KSh {t.prize}</td>
                    <td>{t.status}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-warning me-2"
                        onClick={() => navigate(`/edittournamentpage/${t.id}`)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(t.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AdminTournamentsPage;