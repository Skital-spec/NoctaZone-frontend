import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../Components/MainLayout";
import { supabase } from "../supabaseClient";

const ReportResults = () => {
  const { id, matchId } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [userSubmission, setUserSubmission] = useState(null);

  // Goals instead of points
  const [player1Goals, setPlayer1Goals] = useState(0);
  const [player2Goals, setPlayer2Goals] = useState(0);
  const [declaredWinner, setDeclaredWinner] = useState("");

  // File uploads for evidence (submit flow)
  const [evidenceFiles, setEvidenceFiles] = useState([]);

  // Dispute questionnaire state
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeRules, setDisputeRules] = useState("");
  const [disputeWitnesses, setDisputeWitnesses] = useState("");
  const [disputeFiles, setDisputeFiles] = useState([]);

  // Get current user on component mount
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
        setError("Failed to authenticate user");
      }
    };
    getCurrentUser();
  }, []);

  // Fetch submissions for this specific match only (visible to both players)
  const fetchAllSubmissions = async () => {
    if (!id || !matchId) return;
    
    try {
      // Fetch submissions filtered by match_id
      const response = await fetch(`https://safcom-payment.onrender.com/api/matches/${matchId}/submissions`, {
        credentials: "include"
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched match-specific submissions:", data.submissions);
        setSubmissions(data.submissions || []);
        
        // Check if current user has already submitted for this specific match
        if (currentUserId && data.submissions) {
          const userSubmission = data.submissions.find(sub => sub.user_id === currentUserId && sub.match_id === matchId);
          if (userSubmission) {
            console.log("Found user's existing submission for this match:", userSubmission);
            setHasSubmitted(true);
            setPlayer1Goals(userSubmission.player1_goals || 0);
            setPlayer2Goals(userSubmission.player2_goals || 0);
            setDeclaredWinner(userSubmission.declared_winner || "");
          }
        }
      } else {
        // If the endpoint doesn't exist, fall back to filtering client-side
        console.log("Match-specific endpoint not available, using challenge endpoint with client-side filtering");
        const fallbackResponse = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}/submissions`, {
          credentials: "include"
        });
        
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          // Filter submissions to only show those for this specific match
          const matchSubmissions = (data.submissions || []).filter(sub => sub.match_id === matchId);
          console.log("Filtered submissions for match:", matchSubmissions);
          setSubmissions(matchSubmissions);
          
          // Check if current user has already submitted for this specific match
          if (currentUserId && matchSubmissions) {
            const userSubmission = matchSubmissions.find(sub => sub.user_id === currentUserId);
            if (userSubmission) {
              console.log("Found user's existing submission for this match:", userSubmission);
              setHasSubmitted(true);
              setPlayer1Goals(userSubmission.player1_goals || 0);
              setPlayer2Goals(userSubmission.player2_goals || 0);
              setDeclaredWinner(userSubmission.declared_winner || "");
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching submissions:", err);
    }
  };

  useEffect(() => {
    const fetchChallenge = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load challenge");
        const data = await res.json();
        
        // Structure the match data properly for ReportResults
        const challengeData = data.challenge;
        const playersData = data.players;
        
        if (challengeData && playersData) {
          const structuredMatch = {
            ...challengeData,
            player1: playersData.p1,
            player2: playersData.p2
          };
          setMatch(structuredMatch);
        } else {
          setMatch(data.challenge || null);
        }
        
        // Fetch submissions separately to avoid conflicts
        if (currentUserId) {
          await fetchAllSubmissions();
        }
        
        if (data.challenge && !hasSubmitted) {
          setPlayer1Goals(0);
          setPlayer2Goals(0);
        }
      } catch (err) {
        setError(err.message || "Failed to load challenge");
      } finally {
        setLoading(false);
      }
    };
    if (id && currentUserId) fetchChallenge();
  }, [id, currentUserId]);

  const players = useMemo(() => {
    if (!match) return { p1: null, p2: null };
    return { p1: match.player1, p2: match.player2 };
  }, [match]);

  // Automatic winner selection based on scores
  useEffect(() => {
    if (hasSubmitted) return; // Don't auto-select if already submitted
    
    const p1Score = parseInt(player1Goals) || 0;
    const p2Score = parseInt(player2Goals) || 0;
    
    // Only run automatic selection if we have player data and at least one score is entered
    if (players.p1 && players.p2 && (player1Goals !== '' || player2Goals !== '')) {
      if (p1Score > p2Score) {
        // P1 wins automatically
        setDeclaredWinner(players.p1.id);
      } else if (p2Score > p1Score) {
        // P2 wins automatically
        setDeclaredWinner(players.p2.id);
      } else if (p1Score === p2Score) {
        // Draw when scores are equal (including 0-0)
        setDeclaredWinner("draw");
      }
    } else if (player1Goals === '' && player2Goals === '') {
      // Reset winner selection when both fields are empty
      setDeclaredWinner('');
    }
  }, [player1Goals, player2Goals, players.p1, players.p2, hasSubmitted]);

  const isFormLocked = useMemo(() => {
    return match?.status === 'completed';
  }, [match?.status]);

  const canSubmit = useMemo(() => {
    if (!players.p1 || !players.p2 || !currentUserId || isFormLocked) return false;
    if (declaredWinner === "draw") return true;
    return declaredWinner === players.p1?.id || declaredWinner === players.p2?.id;
  }, [players, declaredWinner, currentUserId, isFormLocked]);

  const handleEvidenceFilesChange = (e) => {
    if (isFormLocked) return;
    const files = Array.from(e.target.files || []);
    setEvidenceFiles(files);
  };

  const handleDisputeFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    setDisputeFiles(files);
  };

  const handleSubmitResults = async () => {
    if (isFormLocked || isSubmitting) return;
    
    try {
      setError(null);
      setSuccess(null);
      setIsSubmitting(true);

      if (!currentUserId) {
        setError("User not authenticated");
        return;
      }

      const payload = {
        user_id: currentUserId,
        winner_id: declaredWinner === "draw" ? null : declaredWinner,
        is_draw: declaredWinner === "draw",
        evidence_urls: [],
        player1_goals: parseInt(player1Goals) || 0,
        player2_goals: parseInt(player2Goals) || 0,
        match_id: matchId // Use the actual match ID from the URL parameter
      };

      const res = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(hasSubmitted ? "Results updated successfully!" : "Results submitted successfully!");
        setHasSubmitted(true);
        setIsSubmitting(false);
        
        // Refresh submissions to get the latest data from server
        await fetchAllSubmissions();
      } else {
        setError(data?.error || "Failed to submit results");
      }
    } catch (err) {
      setError(err.message || "Failed to submit results");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDispute = async () => {
    setIsDisputeOpen(true);
  };

  const handleSubmitDispute = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!currentUserId) {
        setError("User not authenticated");
        return;
      }

      const form = new FormData();
      form.append("user_id", currentUserId);
      form.append("description", disputeDescription || "");
      form.append("rules_violated", disputeRules || "");
      form.append("witnesses", disputeWitnesses || "");
      disputeFiles.forEach((file) => form.append("evidence_files[]", file));

      const res = await fetch(`https://safcom-payment.onrender.com/api/matches/${matchId}/dispute`, {
        method: "POST",
        credentials: "include",
        body: form
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create dispute");

      setSuccess("Dispute submitted. Admins have been notified.");
      setIsDisputeOpen(false);
      setDisputeDescription("");
      setDisputeRules("");
      setDisputeWitnesses("");
      setDisputeFiles([]);

      const ref = await fetch(`https://safcom-payment.onrender.com/api/matches/${matchId}`, { credentials: "include" });
      if (ref.ok) {
        const fresh = await ref.json();
        setMatch(fresh.match || null);
        setSubmissions(fresh.submissions || []);
      }
    } catch (err) {
      setError(err.message || "Failed to create dispute");
    }
  };

  const statusBadge = (status) => {
    const styles = status === "completed"
      ? { backgroundColor: "#16a34a", color: "#ffffff" }
      : status === "disputed"
      ? { backgroundColor: "#dc2626", color: "#ffffff" }
      : { backgroundColor: "#f59e0b", color: "#000000" };
    return <span className="px-2 py-1 rounded text-sm font-bold" style={styles}>{(status || "pending").toUpperCase()}</span>;
  };

  return (
    <MainLayout>
      <div style={{marginTop:'-7%'}}>
        <div className="privacy-policy-container">
          <div className="privacy-policy-header text-center">
            <h1 style={{ color: "#ffffff" }}>Report Results</h1>
            <p className="sub-heading" style={{ color: "#cbd5e1" }}>Competition ID: {id} • Match ID: {matchId}</p>
          </div>

          {loading ? (
            <div className="text-center"><p style={{ color: "#cbd5e1" }}>Loading match...</p></div>
          ) : error ? (
            <div className="text-center"><p style={{ color: "#ef4444" }}>{error}</p></div>
          ) : (
            <>
              {success && <div className="mb-4 text-center font-semibold" style={{ color: "#22c55e" }}>{success}</div>}

              <div className="bg-[#1a1a2e] rounded-lg p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-1" style={{ color: "#00ffcc" }}>Match Overview</h2>
                  </div>
                  <div>{statusBadge(match?.status)}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                  <div>
                    <span style={{ color: "#94a3b8" }}>Player 1:</span>
                    <div className="font-bold" style={{ color: "#ffffff" }}>{match?.player1?.username || "Anonymous"}</div>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8" }}>Player 2:</span>
                    <div className="font-bold" style={{ color: "#ffffff" }}>{match?.player2?.username || "Anonymous"}</div>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8" }}>Winner:</span>
                    <div className="font-bold" style={{ color: "#22c55e" }}>{match?.winner === 'draw' ? 'DRAW' : match?.winner ? (match?.winner === match?.player1?.id ? (match?.player1?.username) : (match?.player2?.username )) : 'TBD'}</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1a2e] rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold mb-3" style={{ color: "#00ffcc" }}>Submit Your Result</h3>
                <p className="text-sm mb-4" style={{ color: "#cbd5e1" }}>
                  If not sure of scores just choose winner
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-1">{match?.player1?.username || "Anonymous"}'s Scores</label>
                    <input 
                      type="number" 
                      value={player1Goals} 
                      onChange={(e) => setPlayer1Goals(e.target.value)} 
                      disabled={isFormLocked} 
                      className={`w-full bg-[#1f1f2e] text-black rounded p-2 outline-none ${isFormLocked ? 'opacity-50 cursor-not-allowed' : ''}`} 
                      style={{outline: "none", marginLeft:'3%', border: "none", marginTop:'1rem'}}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ marginTop:'1rem'}}>{match?.player2?.username || "Anonymous"}'s Scores</label>
                    <input 
                      type="number" 
                      value={player2Goals} 
                      onChange={(e) => setPlayer2Goals(e.target.value)} 
                      disabled={isFormLocked} 
                      className={`w-full bg-[#1f1f2e] text-black rounded p-2 outline-none ${isFormLocked ? 'opacity-50 cursor-not-allowed' : ''}`} 
                      style={{outline: "none", marginLeft:'3%', border: "none", marginTop:'1rem'}} 
                    />
                  </div>
                  <div>
                    <label className=" text-sm mb-1" style={{ color: "#cbd5e1" }}>Winner</label>
                    <select value={declaredWinner}             
                    onChange={(e) => setDeclaredWinner(e.target.value)}
                    disabled={isFormLocked}
                    style={{marginLeft:'2%'}}
                    className={`w-full rounded p-2 outline-none text-black ${
                      isFormLocked ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                      <option value="">Select winner</option>
                      {players.p1 && (<option value={players.p1.id} >{players.p1.username}</option>)}
                      {players.p2 && (<option value={players.p2.id}>{players.p2.username}</option>)}
                      <option value="draw">DRAW</option>
                    </select>
                    {/* {((parseInt(player1Goals) || 0) !== (parseInt(player2Goals) || 0) || 
                      ((parseInt(player1Goals) || 0) === (parseInt(player2Goals) || 0) && (parseInt(player1Goals) > 0 || parseInt(player2Goals) > 0))) && (
                      <div className="mt-1 text-xs" style={{ color: "#22c55e" }}>
                        Winner automatically selected based on scores
                      </div>
                    )} */}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm mb-2" style={{ color: "#cbd5e1" }}>Upload Evidence (photos or clips)</label>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*,video/*" 
                    onChange={handleEvidenceFilesChange} 
                    disabled={hasSubmitted}
                    className={`w-full bg-[#1f1f2e] text-white rounded p-2 outline-none ${hasSubmitted ? 'opacity-50 cursor-not-allowed' : ''}`} 
                  />
                  {evidenceFiles.length > 0 && (
                    <div className="mt-2 text-xs" style={{ color: "#94a3b8" }}>
                      {evidenceFiles.length} file(s) selected
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  <button 
                    onClick={handleSubmitResults} 
                    disabled={!canSubmit || isSubmitting} 
                    className={`px-4 py-2 rounded font-bold transition-colors ${(!canSubmit || isSubmitting) ? "cursor-not-allowed" : ""}`} 
                    style={(canSubmit && !isSubmitting) ? { backgroundColor: "#00ffcc", color: "#1a1a2e" } : { backgroundColor: "#2a2a3e", color: "#9ca3af" }}
                  >
                    {isSubmitting ? (hasSubmitted ? "Updating..." : "Submitting...") : 
                     isFormLocked ? "Match Completed" : 
                     hasSubmitted ? "Update Results" : "Submit Results"}
                  </button>
                  <button 
                    onClick={handleCreateDispute} 
                    className="px-4 py-2 rounded font-bold transition-colors" 
                    style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
                  >
                    File Dispute
                  </button>
                  <button 
                    onClick={() => navigate(-1)} 
                    className="px-4 py-2 rounded font-bold transition-colors" 
                    style={{ backgroundColor: "#2a2a3e", color: "#ffffff" }}
                  >
                    Back
                  </button>
                </div>

                {isDisputeOpen && (
                  <div className="mt-6 border-t border-[#2a2a3e] pt-6">
                    <h4 className="text-lg font-bold mb-3" style={{ color: "#00ffcc" }}>Dispute Questionnaire</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm mb-1" style={{ color: "#cbd5e1" }}>Describe what happened during the competition</label>
                        <textarea value={disputeDescription} onChange={(e) => setDisputeDescription(e.target.value)} rows={4} className="w-full bg-[#1f1f2e] text-white rounded p-2 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm mb-1" style={{ color: "#cbd5e1" }}>What specific rules do you believe were violated?</label>
                        <textarea value={disputeRules} onChange={(e) => setDisputeRules(e.target.value)} rows={3} className="w-full bg-[#1f1f2e] text-white rounded p-2 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm mb-1" style={{ color: "#cbd5e1" }}>Do you have witnesses or additional proof?</label>
                        <textarea value={disputeWitnesses} onChange={(e) => setDisputeWitnesses(e.target.value)} rows={3} className="w-full bg-[#1f1f2e] text-white rounded p-2 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm mb-2" style={{ color: "#cbd5e1" }}>Upload Additional Evidence (optional)</label>
                        <input type="file" multiple accept="image/*,video/*" onChange={handleDisputeFilesChange} className="w-full bg-[#1f1f2e] text-white rounded p-2 outline-none" />
                        {disputeFiles.length > 0 && (
                          <div className="mt-2 text-xs" style={{ color: "#94a3b8" }}>
                            {disputeFiles.length} file(s) selected
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button onClick={handleSubmitDispute} className="px-4 py-2 rounded font-bold transition-colors" style={{ backgroundColor: "#00ffcc", color: "#1a1a2e" }}>Submit Dispute</button>
                      <button onClick={() => setIsDisputeOpen(false)} className="px-4 py-2 rounded font-bold transition-colors" style={{ backgroundColor: "#2a2a3e", color: "#ffffff" }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#1a1a2e] rounded-lg p-6">
                <h3 className="text-xl font-bold mb-3" style={{ color: "#00ffcc" }}>Submissions</h3>
                {submissions.length === 0 ? (
                  <div className="text-sm" style={{ color: "#94a3b8" }}>No submissions yet.</div>
                ) : (
                  <div className="overflow-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#1f1f2e]" style={{ color: "#00ffcc" }}>
                        <tr>
                          <th className="p-3">User</th>
                          <th className="p-3">{match?.player1?.username || "Anonymous"}'s Scores</th>
                          <th className="p-3">{match?.player2?.username || "Anonymous"}'s Scores</th>
                          <th className="p-3">Winner</th>
                          <th className="p-3">Evidence</th>
                          <th className="p-3">Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map(s => (
                          <tr key={s.id} className="border-t border-[#2a2a3e]">
                            <td className="p-2 text-sm" style={{ color: "#e5e7eb" }}>
                              {s.profiles?.username || 
                               (players.p1?.id === s.user_id ? players.p1?.username : 
                                players.p2?.id === s.user_id ? players.p2?.username : 
                                s.user_id)}
                            </td>
                            <td className="p-2 text-sm" style={{ color: "#e5e7eb" }}>{s.player1_goals ?? s.player1_points}</td>
                            <td className="p-2 text-sm" style={{ color: "#e5e7eb" }}>{s.player2_goals ?? s.player2_points}</td>
                            <td className="p-2 text-sm" style={{ color: "#e5e7eb" }}>
                              {((s.player1_goals === s.player2_goals && s.player1_goals > 0) || 
                                (!s.declared_winner && s.player1_goals === s.player2_goals && s.player1_goals > 0)) ? 'DRAW' : 
                               (s.declared_winner ? 
                                 (players.p1?.id === s.declared_winner ? players.p1?.username :
                                  players.p2?.id === s.declared_winner ? players.p2?.username : s.declared_winner) : 
                                 '-')
                              }
                            </td>
                            <td className="p-3 text-sm">
                              {(Array.isArray(s.evidence) ? s.evidence : []).length === 0 ? (
                                <span style={{ color: "#94a3b8" }}>-</span>
                              ) : (
                                <ul className="list-disc ml-4">
                                  {(Array.isArray(s.evidence) ? s.evidence : []).map((ev, i) => (
                                    <li key={i} className="truncate" title={ev.url || ''} style={{ color: "#38bdf8" }}>{ev.url || '-'}</li>
                                  ))}
                                </ul>
                              )}
                            </td>
                            <td className="p-3 text-sm" style={{ color: "#e5e7eb" }}>{new Date(s.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ReportResults;
