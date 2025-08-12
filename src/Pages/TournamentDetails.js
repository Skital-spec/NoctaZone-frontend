import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import MainLayout from "../Components/MainLayout";
import Modal from "react-modal";

const TournamentDetails = () => {
  const { id } = useParams(); // tournament ID from URL
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);

  useEffect(() => {
    const fetchTournament = async () => {
      const { data, error } = await supabase
        .from("tournament_with_game")
        .select("*")
        .eq("id", id)
        .single();

      if (data) setTournament(data);
    };

    fetchTournament();
  }, [id]);

  if (!tournament) {
    return (
      <MainLayout>
        <div className="text-white text-center py-20">Loading tournament...</div>
      </MainLayout>
    );
  }

const prize = tournament.prize || 0;

const prizeBreakdown = tournament.seats >= 10
  ? [
      { place: "1st", amount: tournament.first_place_prize },
      { place: "2nd", amount: tournament.second_place_prize },
      { place: "3rd", amount: tournament.third_place_prize },
    ]
  : [
      { place: "1st", amount: tournament.first_place_prize || prize },
    ];

  return (
    <MainLayout>
      <div className="text-white max-w-3xl mx-auto py-10 px-4">
        {/* Image */}
        <img
          src={tournament.game_image}
          alt={tournament.game_name}
          className="w-full h-64 object-cover rounded mb-6"
        />

        {/* Title */}
        <h1 className="text-3xl font-bold text-[#00f7ff] mb-2">
          {tournament.tournament_name}
        </h1>
        <p className="text-gray-400 mb-4">{tournament.game_name}</p>

        {/* Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Entry Fee</p>
            <p className="text-lg font-semibold">KSh {tournament.entry_fee}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Seats</p>
            <p className="text-lg font-semibold">
              {tournament.seats_taken} / {tournament.seats}
            </p>
          </div>
        </div>

        {/* Prize Table */}
<div className="mb-6">
  <h2 className="text-xl font-semibold text-[#00f7ff] mb-2">
    🏆 Prizes to be Won
  </h2>
  <table className="w-full text-left border border-[#1f1f2e] rounded overflow-hidden">
    <thead className="bg-[#1f1f2e] text-[#00f7ff]">
      <tr>
        <th className="p-3">Place</th>
        <th className="p-3">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-t border-[#1f1f2e]">
        <td className="p-3 font-semibold">Total Prize</td>
        <td className="p-3">KSh {prize}</td>
      </tr>
      {prizeBreakdown.map((row, idx) => (
        <tr key={idx} className="border-t border-[#1f1f2e]">
          <td className="p-3">{row.place} Place</td>
          <td className="p-3">KSh {row.amount}</td>
        </tr>
      ))}
      
    </tbody>
  </table>
</div>

        {/* Links */}
        <div className="flex space-x-6 mb-6">
          <button
            onClick={() => setRulesModalOpen(true)}
            className="text-[#00f7ff] underline hover:text-[#00cbd4]"
          >
            Rules
          </button>
          <button
            onClick={() => navigate("/how-it-works")}
            className="text-[#00f7ff] underline hover:text-[#00cbd4]"
          >
            Walkthrough
          </button>
        </div>

        {/* Join Button */}
        {/* <button
          onClick={() => navigate(/payment?tournament=${id})}
          className="w-full bg-[#00f7ff] text-black font-semibold py-3 rounded hover:bg-[#00cbd4] transition"
        >
          Join Now
        </button> */}

        {/* Rules Modal */}
        <Modal
          isOpen={rulesModalOpen}
          onRequestClose={() => setRulesModalOpen(false)}
          className="bg-[#111] text-white p-6 rounded max-w-xl mx-auto mt-20"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start"
        >
          <h2 className="text-xl font-bold text-[#00f7ff] mb-4">Tournament Rules</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
            <li>No cheating or use of unauthorized tools.</li>
            <li>Players must check in before the match starts.</li>
            <li>Disputes must be filed within 1 hour of match end.</li>
            <li>Respect all participants and staff.</li>
          </ul>
          <button
            onClick={() => setRulesModalOpen(false)}
            className="mt-6 bg-[#00f7ff] text-black px-4 py-2 rounded hover:bg-[#00cbd4]"
          >
            Close
          </button>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default TournamentDetails;