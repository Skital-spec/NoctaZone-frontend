import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { supabase } from '../supabaseClient'; 

const AddTournamentPage = () => {
  const [games, setGames] = useState([]);
  const [form, setForm] = useState({
    game_id: '',
    entry_fee: '',
    seats: '',
    start_date: '',
    end_date: '',
    name: '',
  });

const prize = form.entry_fee && form.seats
  ? Math.floor(form.entry_fee * form.seats * 0.85)
  : 0;

const showBreakdown = form.seats >= 10;
const total = form.entry_fee * form.seats;
const firstPrize = showBreakdown ? Math.floor(total * 0.45) : 0;
const secondPrize = showBreakdown ? Math.floor(total * 0.25) : 0;
const thirdPrize = showBreakdown ? Math.floor(total* 0.15) : 0;
  // Autofill current week's Monday to Sunday
  useEffect(() => {
    const today = new Date();
    const day = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((day + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    setForm((prev) => ({
      ...prev,
      start_date: monday.toISOString().split('T')[0],
      end_date: sunday.toISOString().split('T')[0],
    }));
  }, []);

  useEffect(() => {
    const fetchGames = async () => {
      const { data } = await supabase.from('games').select('*');
      if (data) setGames(data);
    };
    fetchGames();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
const { error } = await supabase.from('tournaments').insert([
  {
    ...form,
    entry_fee: parseInt(form.entry_fee),
    seats: parseInt(form.seats),
    start_date: form.start_date,
    end_date: form.end_date,
    name: form.name,
    prize: prize, // ✅ use the calculated value
    first_place_prize: firstPrize,
    second_place_prize: secondPrize,
    third_place_prize: thirdPrize,
    status: "upcoming", // ✅ optional: add status if needed
  },
]);
    if (!error) alert('Tournament added successfully!');
  };

  return (
    <div className="privacy-policy-container">
      <div className="privacy-policy-header text-center">
        <img
          src="https://res.cloudinary.com/dm7edtofj/image/upload/v1754505778/logo_suleug.svg"
          alt="NoctaZone Logo"
          style={{ width: '80px', height: 'auto', marginBottom: '10px', filter: 'invert(1)' }}
        />
        <h1>NoctaZone Tournament Creation Page</h1>
        <p className="sub-heading">Create a new weekly challenge</p>
      </div>

      <form className="privacy-policy-content" onSubmit={handleSubmit}>
        <div>
  <label>Tournament Name</label>
  <input
    type="text"
    name="name"
    value={form.name}
    onChange={handleChange}
    required
  />
</div>
        <div>
          <label>Game :</label>
          <select name="game_id" value={form.game_id} onChange={handleChange} required>
            <option value="">Select a game</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>{game.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Entry Fee :(Ksh)</label>
          <input
            type="number"
            name="entry_fee"
            value={form.entry_fee}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Seats :</label>
          <input
            type="number"
            name="seats"
            value={form.seats}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Start Date :</label>
          <input
            type="date"
            name="start_date"
            value={form.start_date}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>End Date :</label>
          <input
            type="date"
            name="end_date"
            value={form.end_date}
            onChange={handleChange}
            required
          />
        </div>

        <p className="mt-3 lead">💰 Estimated Prize : <strong>{prize} Ksh</strong></p>

        <button type="submit" className="btn btn-success mt-4">Add Tournament</button>
      </form>

      <div className="tournament-preview mt-5">
        <h2>🧾 Preview</h2>
        <div className="preview-card">
          <p><strong>Game : </strong> {games.find(g => g.id === form.game_id)?.name || '—'}</p>
          <p><strong>Entry Fee : </strong> {form.entry_fee || '—'} Ksh</p>
          <p><strong>Seats : </strong> {form.seats || '—'}</p>
          <p><strong>Prize : </strong> {prize} Ksh</p>
          <p><strong>Dates : </strong> {form.start_date} → {form.end_date}</p>
          <p><strong>Status : </strong> Upcoming</p>
          {showBreakdown && (
  <div className="mt-3">
    <h4><Trophy size={18} style={{ marginRight: '5px' }} /> Prize Breakdown</h4>
    <p>🥇 1st Place: <strong>{firstPrize} Ksh</strong></p>
    <p>🥈 2nd Place: <strong>{secondPrize} Ksh</strong></p>
    <p>🥉 3rd Place: <strong>{thirdPrize} Ksh</strong></p>
  </div>
)}

        </div>
      </div>
    </div>
  );
};

export default AddTournamentPage;