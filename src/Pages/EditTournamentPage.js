// File: EditTournamentPage.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import MainLayout from "../Components/MainLayout";

const EditTournamentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    entry_fee: "",
    seats: "",
    start_date: "",
    end_date: "",
    game_id: "",
  });
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournament = async () => {
      const { data } = await supabase.from("tournaments").select("*").eq("id", id).single();
      if (data) {
        setForm({
          name: data.name,
          entry_fee: data.entry_fee,
          seats: data.seats,
          start_date: data.start_date,
          end_date: data.end_date,
          game_id: data.game_id,
        });
      }
      setLoading(false);
    };

    const fetchGames = async () => {
      const { data } = await supabase.from("games").select("*");
      if (data) setGames(data);
    };

    fetchTournament();
    fetchGames();
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase
      .from("tournaments")
      .update({
        name: form.name,
        entry_fee: parseInt(form.entry_fee),
        seats: parseInt(form.seats),
        start_date: form.start_date,
        end_date: form.end_date,
        game_id: form.game_id,
      })
      .eq("id", id);

    if (!error) {
      alert("Tournament updated successfully!");
      navigate("/admintournamentspage");
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="text-white text-center py-20">Loading tournament...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-4">
        <h1 className="text-[#00ffcc] mb-4">✏️ Edit Tournament</h1>
        <form onSubmit={handleSubmit} className="text-white">
          <div className="mb-3">
            <label>Tournament Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>

          <div className="mb-3">
            <label>Game</label>
            <select
              name="game_id"
              value={form.game_id}
              onChange={handleChange}
              className="form-control"
              required
            >
              <option value="">Select a game</option>
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label>Entry Fee (KSh)</label>
            <input
              type="number"
              name="entry_fee"
              value={form.entry_fee}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>

          <div className="mb-3">
            <label>Seats</label>
            <input
              type="number"
              name="seats"
              value={form.seats}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>

          <div className="mb-3">
            <label>Start Date</label>
            <input
              type="date"
              name="start_date"
              value={form.start_date}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>

          <div className="mb-3">
            <label>End Date</label>
            <input
              type="date"
              name="end_date"
              value={form.end_date}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>

          <button type="submit" className="btn btn-success">
            Save Changes
          </button>
        </form>
      </div>
    </MainLayout>
  );
};

export default EditTournamentPage;