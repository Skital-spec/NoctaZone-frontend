import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import MainLayout from "../Components/MainLayout";
import Modal from "react-modal";
import { Trophy, CreditCard, X } from "lucide-react";

Modal.setAppElement("#root");

const TournamentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState(null);
  const [balance, setBalance] = useState(0); // Local balance state
  const [userId, setUserId] = useState("");
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [lowBalanceModalOpen, setLowBalanceModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Get logged-in user from Supabase
  useEffect(() => {
    const getProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
        // fetch wallet balance once user is ready
        fetchBalance(user.id);
      }
    };

    getProfile();
  }, []);

  // ✅ Fetch balance from backend (same logic as WalletPage)
  const fetchBalance = async (uid) => {
    try {
      console.log("Fetching balance for user:", uid);
      const res = await fetch(
        `https://safcom-payment.onrender.com/api/wallet/transaction?user_id=${uid}`
      );
      const data = await res.json();
      console.log("Balance response:", data);
      const newBalance = data.balance || 0;
      setBalance(newBalance);
      
      // ✅ Dispatch custom event to update TopNavbar
      window.dispatchEvent(new CustomEvent('balanceUpdated', {
        detail: { balance: newBalance }
      }));
      
    } catch (err) {
      console.error("Fetch balance failed", err);
    }
  };

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
    tournament.max_participants >= 10
      ? [
          { place: "1st", amount: tournament.first_place_prize },
          { place: "2nd", amount: tournament.second_place_prize },
          { place: "3rd", amount: tournament.third_place_prize },
        ]
      : [{ place: "1st", amount: tournament.first_place_prize || prize }];

  const handleJoinClick = async () => {
    // ✅ Refresh balance before checking
    await fetchBalance(userId);
    
    const fee = Number(tournament.entry_fee || 0);
    if (balance < fee) {
      setLowBalanceModalOpen(true);
    } else {
      setConfirmModalOpen(true);
    }
  };

const handleConfirmJoin = async () => {
  const fee = Number(tournament.entry_fee || 0);
  setLoading(true);

  try {
    // ✅ Double-check balance from backend before proceeding
    await fetchBalance(userId);
    
    if (balance < fee) {
      setConfirmModalOpen(false);
      setLowBalanceModalOpen(true);
      setLoading(false);
      return;
    }

    console.log("🎮 Joining tournament:", { userId, tournamentId: id, fee });

    // ✅ Use backend API to join tournament (now handles database updates)
    const response = await fetch("https://safcom-payment.onrender.com/api/wallet/tournament-join", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        user_id: userId,
        tournament_id: id,
        amount: fee,
      }),
    });

    // Parse response as JSON
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error("❌ Failed to parse response:", parseError);
      throw new Error("Invalid response from server");
    }

    console.log("🎮 Tournament join response:", result);

    // Check if response was successful
    if (!response.ok) {
      console.error("❌ Tournament join failed:", result);
      
      // Handle specific error cases
      if (result.error === "Insufficient balance") {
        setConfirmModalOpen(false);
        setLowBalanceModalOpen(true);
        return;
      }
      
      if (result.error === "You have already joined this tournament") {
        alert("❌ You have already joined this tournament!");
        setConfirmModalOpen(false);
        return;
      }
      
      if (result.error === "Tournament is no longer accepting participants") {
        alert(`❌ ${result.message || 'This tournament is no longer accepting new participants.'}`);
        setConfirmModalOpen(false);
        return;
      }
      
      if (result.error === "Tournament is full") {
        alert("❌ Tournament is full! No seats available.");
        setConfirmModalOpen(false);
        return;
      }
      
      throw new Error(result.error || result.details || `Server error: ${response.status}`);
    }

    // Check if the operation was successful
    if (!result.success && result.success !== undefined) {
      console.error("❌ Tournament join was not successful:", result);
      throw new Error(result.error || "Tournament join failed");
    }
    
    // 🔥 FIX: Update local balance state with the new balance from backend
    const newBalance = result.new_balance;
    if (newBalance !== undefined && newBalance !== null) {
      console.log("💰 Updating balance from", balance, "to", newBalance);
      setBalance(newBalance);
      
      // ✅ Dispatch custom event to update TopNavbar with new balance
      window.dispatchEvent(new CustomEvent('balanceUpdated', {
        detail: { balance: newBalance }
      }));
    } else {
      // Fallback: Refresh balance from backend if new_balance not provided
      console.log("⚠️ New balance not provided in response, fetching from backend");
      await fetchBalance(userId);
    }

    // ✅ Update tournament state with new seats count from backend
    setTournament((prev) => ({
      ...prev,
      current_participants: result.current_participants || (prev.current_participants || 0) + 1,
    }));

    // Close modal and show success
    setConfirmModalOpen(false);
    
    // Show enhanced success message with updated balance
    alert(`✅ Successfully joined ${result.name || 'tournament'}! ${fee} tokens deducted. New balance: ${(newBalance || balance - fee).toFixed(2)} tokens.`);
    
    // Navigate to participants page
    navigate(`/tournament/${id}/participants`);

  } catch (err) {
    console.error("🔥 Tournament join error:", err);
    alert(`❌ Failed to join tournament: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

  // ✅ Add refresh balance function
  const refreshBalance = () => {
    if (userId) {
      fetchBalance(userId);
    }
  };

  // Modal styles to ensure proper positioning
  const modalStyles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      position: "relative",
      backgroundColor: "#0d0d0d",
      border: "2px solid #00ffcc",
      borderRadius: "12px",
      padding: "24px",
      maxWidth: "500px",
      width: "90%",
      maxHeight: "80vh",
      overflow: "auto",
      margin: "0",
      inset: "auto",
      boxShadow: "0 0 15px #00ffcc55", // neon glow
    },
  };

  return (
    <MainLayout>
      <div className="privacy-policy-container" style={{marginTop:'1%'}}>
        <div className="privacy-policy-header text-center mb-6">
          <Trophy size={40} className="privacy-icon" />
          <h1>{tournament.name}</h1>
          <p className="sub-heading text-xl font-bold text-[#00ffcc] fs-30">{tournament.game_name}</p>
          
          {/* Tournament Status Badge */}
          {(tournament.status === "closed" || tournament.status === "expired") && (
            <div className="mt-3">
              <span 
                className="badge px-4 py-2 text-white font-semibold rounded"
                style={{
                  backgroundColor: tournament.status === "closed" ? "#dc3545" : "#6c757d",
                  fontSize: "1rem"
                }}
              >
                {tournament.status === "closed" ? 
                  "🔒 CLOSED - No longer accepting participants" : 
                  "⏰ EXPIRED - Tournament expired"
                }
              </span>
            </div>
          )}
        </div>

        {/* ✅ Display current balance */}
        <div className="text-center mb-4">
          <p className="text-lg text-[#00ffcc]">
            Your Balance: <span className="font-bold">{balance.toFixed(2)} Tokens</span>
            <button 
              onClick={refreshBalance} 
              style={{ 
                marginLeft: '10px', 
                padding: '5px 10px', 
                fontSize: '12px',
                background: '#00ffcc',
                color: 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Refresh
            </button>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-400">Entry Cost : {tournament.entry_fee} Tokens</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Seats : {tournament.current_participants || "0"} / {tournament.max_participants}</p>
          </div>
        </div>

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
              <td className="p-3">{prize} Tokens</td>
            </tr>
            {prizeBreakdown.map((row, idx) => (
              <tr key={idx} className="border-t border-[#1f1f2e]">
                <td className="p-3">{row.place} Place</td>
                <td className="p-3">{row.amount} Tokens</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div >
          <button style={{background: '#00ffcc' , border:'none' , padding:'7px 17px' , borderRadius:'10px'}}
            onClick={() => setRulesModalOpen(true)}            
          >
            Rules
          </button>
          <button style={{background: '#00ffcc' , border:'none' , padding:'7px 17px' , borderRadius:'10px', 
            marginLeft:'30px'
          }}
            onClick={() => navigate("/howitworks")}            
          >
            Walkthrough
          </button>
        </div>

        <button style={{
          background: (tournament.status === "closed" || tournament.status === "expired") 
            ? '#6c757d' : '#00ffcc', 
          border:'none', 
          padding:'7px 27px', 
          borderRadius:'10px', 
          marginTop:'10px',
          cursor: (tournament.status === "closed" || tournament.status === "expired") 
            ? 'not-allowed' : 'pointer',
          opacity: (tournament.status === "closed" || tournament.status === "expired") 
            ? 0.6 : 1
        }}
          onClick={(tournament.status === "closed" || tournament.status === "expired") 
            ? () => {}
            : handleJoinClick
          }
          disabled={tournament.status === "closed" || tournament.status === "expired"}
          className="w-full  text-black font-bold py-3 rounded hover:bg-[#00e6b8] transition-all shadow-[0_0_12px_#00ffccaa] flex items-center justify-center space-x-2"
        >
          <CreditCard size={18} />
          <span>
            {tournament.status === "closed" 
              ? "🔒 Tournament Closed" 
              : tournament.status === "expired" 
              ? "⏰ Tournament Expired" 
              : "Join Tournament Now"
            }
          </span>
        </button>

        {/* Rules Modal */}
        <Modal
          isOpen={rulesModalOpen}
          onRequestClose={() => setRulesModalOpen(false)}
          style={modalStyles}
          contentLabel="Tournament Rules"
        >
          <div className="text-white">
            <button style={{background: '#00ffcc', border:'none', borderRadius:'20px'}}
              onClick={() => setRulesModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <h2 style={{color: '#00ffcc', border:'none'}}>
              Tournament Rules
            </h2>
            <ul >
              <li>No cheating or use of unauthorized tools.</li>
              <li>Players must check in before the match starts.</li>
              <li>Disputes must be filed within 1 hour of match end.</li>
              <li>Respect all participants and staff.</li>
              <li>Late arrivals may result in automatic disqualification.</li>
              <li>All tournament decisions by staff are final.</li>
            </ul>
          </div>
        </Modal>

        {/* Confirm Join Modal */}
        <Modal
          isOpen={confirmModalOpen}
          onRequestClose={() => setConfirmModalOpen(false)}
          style={modalStyles}
          contentLabel="Confirm Tournament Join"
        >
          <div className="text-white">
            <button style={{background: '#00ffcc', border:'none', borderRadius:'20px'}}
              onClick={() => setConfirmModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold text-[#00ffcc] mb-4 pr-8">
              Confirm Join
            </h2>
            <p className="mb-6 text-gray-300">
              Do you want to pay{" "}
              <span className="text-[#00ffcc] font-bold">
                {tournament.entry_fee} Tokens
              </span>{" "}
              to join this tournament?
            </p>
            <div className="flex space-x-4">
             <button style={{background: '#00ffcc', border:'none' , padding:'7px 27px' , borderRadius:'10px', marginTop:'10px'}}
              onClick={handleConfirmJoin}
              disabled={loading}
              className="flex-1 bg-[#00ffcc] text-black font-bold py-3 rounded hover:bg-[#00e6b8] transition-all shadow-[0_0_10px_#00ffccaa] disabled:opacity-50"
            >
              {loading ? "Joining..." : "Yes, Join"}
            </button>
            <button style={{background: '#00ffcc', border:'none' , padding:'7px 27px' , borderRadius:'10px'}}
              onClick={() => setConfirmModalOpen(false)}
              className="flex-1 bg-gray-800 text-white font-bold py-3 rounded hover:bg-gray-700 transition-colors border border-gray-600"
            >
              Cancel
            </button>
            </div>
          </div>
        </Modal>

        {/* Low Balance Modal */}
        <Modal
          isOpen={lowBalanceModalOpen}
          onRequestClose={() => setLowBalanceModalOpen(false)}
          style={modalStyles}
          contentLabel="Insufficient Balance"
        >
          <div className="text-white">
            <button style={{background: '#00ffcc', border:'none', borderRadius:'20px'}}
              onClick={() => setLowBalanceModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold text-[#ff6b6b] mb-4 pr-8">
              Insufficient Balance
            </h2>
            <div className="mb-6">
              <p className="text-gray-300 mb-2">
                You don't have enough tokens to join this tournament.
              </p>
              <div className="bg-[#1a1a1a] p-3 rounded border border-gray-700">
                <p className="text-sm text-gray-400">Required:</p>
                <p className="text-lg font-semibold text-[#00ffcc]">
                  {tournament.entry_fee} Tokens
                </p>
                <p className="text-sm text-gray-400 mt-2">Your Balance:</p>
                <p className="text-lg font-semibold text-red-400">
                  {balance.toFixed(2)} Tokens
                </p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button style={{background: '#00ffcc', border:'none' , padding:'7px 17px' , borderRadius:'10px'}}
                onClick={() => {
                  setLowBalanceModalOpen(false);
                  navigate("/wallet");
                }}
                className="flex-1 bg-[#00ffcc] ! text-black font-bold py-3 rounded hover:bg-[#00e6b8] transition-all shadow-[0_0_10px_#00ffccaa]"
              >
                Deposit Now
              </button>
              <button style={{background: '#00ffcc', border:'none' , padding:'7px 27px' , borderRadius:'10px', marginTop:'10px' ,
               marginLeft:'10px'}}
                onClick={() => setLowBalanceModalOpen(false)}
                className="   py-3 rounded "
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default TournamentDetails;