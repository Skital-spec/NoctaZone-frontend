import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import MainLayout from "../Components/MainLayout";
import Modal from "react-modal";
import { Trophy, CreditCard } from "lucide-react";
import { useWallet } from "../context/WalletContext"; // ✅ wallet context

Modal.setAppElement("#root");

const TournamentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { balance, setBalance } = useWallet(); // ✅ wallet state

  const [tournament, setTournament] = useState(null);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    const fetchTournament = async () => {
      const { data } = await supabase
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
        <div className="privacy-policy-container text-center">
          Loading tournament...
        </div>
      </MainLayout>
    );
  }

  const prize = tournament.prize || 0;
  const prizeBreakdown =
    tournament.seats >= 10
      ? [
          { place: "1st", amount: tournament.first_place_prize },
          { place: "2nd", amount: tournament.second_place_prize },
          { place: "3rd", amount: tournament.third_place_prize },
        ]
      : [{ place: "1st", amount: tournament.first_place_prize || prize }];

  // --- FRONTEND-ONLY join (no backend) ---
  const handleConfirmJoin = () => {
    const fee = Number(tournament.entry_fee || 0);

    if (balance < fee) {
      alert("Insufficient wallet balance.");
      return;
    }

    // Deduct from wallet
    setBalance((b) => b - fee);

    // Increment participants locally
    setTournament((prev) => ({
      ...prev,
      seats_taken: (prev.seats_taken || 0) + 1,
    }));

    // Save participant locally
    const key = `participants_${id}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const newParticipant = {
      id: crypto.randomUUID(),
      name: "You",
      joinedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify([...existing, newParticipant]));

    setConfirmModalOpen(false);
    alert("✅ You've successfully joined this tournament!");
    navigate(`/tournament/${id}/participants`);
  };

  return (
    <MainLayout>
      <div className="privacy-policy-container">
        {/* Header */}
        <div className="privacy-policy-header text-center">
          <Trophy size={40} className="privacy-icon" />
          <h1>{tournament.tournament_name}</h1>
          <p className="sub-heading">{tournament.game_name}</p>
        </div>

        {/* Image */}
        <img
          src={tournament.game_image}
          alt={tournament.game_name}
          className="w-full h-64 object-cover rounded mb-6"
        />

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-400">Entry Fee</p>
            <p className="text-lg font-semibold text-[#00ffcc]">
              KSh {tournament.entry_fee}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Seats</p>
            <p className="text-lg font-semibold text-[#00ffcc]">
              {tournament.seats_taken || "0"} / {tournament.seats}
            </p>
          </div>
        </div>

        {/* Prize Table */}
        <h2>🏆 Prizes to be Won</h2>
        <table className="w-full text-left border border-[#1f1f2e] rounded overflow-hidden mb-6">
          <thead className="bg-[#1f1f2e] text-[#00ffcc]">
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

        {/* Buttons */}
        <div className="flex space-x-6 mb-6">
          <button
            onClick={() => setRulesModalOpen(true)}
            className="text-[#00ffcc] underline hover:text-[#00cbd4]"
          >
            Rules
          </button>
          <button
            onClick={() => navigate("/howitworks")}
            className="text-[#00ffcc] underline hover:text-[#00cbd4]"
          >
            Walkthrough
          </button>
        </div>

        {/* Join Tournament Button */}
        <button
          onClick={() => setConfirmModalOpen(true)}
          className="w-full bg-[#00ffcc] text-black font-bold py-3 rounded hover:bg-[#00cbd4] flex items-center justify-center space-x-2"
        >
          <CreditCard size={18} />
          <span>Join Tournament Now</span>
        </button>

        {/* Rules Modal */}
        <Modal
          isOpen={rulesModalOpen}
          onRequestClose={() => setRulesModalOpen(false)}
          className="bg-[#111] text-white p-6 rounded max-w-xl w-full mx-auto max-h-[80vh] overflow-y-auto"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
        >
          <h2 className="text-xl font-bold text-[#00ffcc] mb-4">
            Tournament Rules
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
            <li>No cheating or use of unauthorized tools.</li>
            <li>Players must check in before the match starts.</li>
            <li>Disputes must be filed within 1 hour of match end.</li>
            <li>Respect all participants and staff.</li>
          </ul>
          <button
            onClick={() => setRulesModalOpen(false)}
            className="mt-6 bg-[#00ffcc] text-black px-4 py-2 rounded hover:bg-[#00cbd4]"
          >
            Close
          </button>
        </Modal>

        {/* Confirm Join Modal */}
        <Modal
          isOpen={confirmModalOpen}
          onRequestClose={() => setConfirmModalOpen(false)} style={{marginLeft:'10%'}}
          className="bg-[#111] text-white p-6 rounded max-w-md w-full mx-auto " 
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" 
        >
          <h2 className="text-xl font-bold text-[#00ffcc] mb-4">Confirm Join</h2>
          <p className="mb-4">
            Do you want to pay{" "}
            <span className="text-[#00ffcc] font-bold">
              KSh {tournament.entry_fee}
            </span>{" "}
            to join this tournament?
          </p>
          <div className="flex space-x-4">
            <button
              onClick={handleConfirmJoin}
              className="flex-1 bg-[#00ffcc] text-black font-bold py-3 rounded hover:bg-[#00cbd4]"
            >
              Yes, Join
            </button>
            <button
              onClick={() => setConfirmModalOpen(false)}
              className="flex-1 bg-gray-600 text-white font-bold py-3 rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default TournamentDetails;
