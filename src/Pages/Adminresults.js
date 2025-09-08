import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../Components/MainLayout";
import { supabase } from "../supabaseClient";

const PAGE_SIZE = 20;

const Adminresults = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [submissions, setSubmissions] = useState([]);
  const [submissionsTotal, setSubmissionsTotal] = useState(0);
  const [subPage, setSubPage] = useState(1);

  const [disputes, setDisputes] = useState([]);
  const [disputesTotal, setDisputesTotal] = useState(0);
  const [dispPage, setDispPage] = useState(1);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Build filters for search
        const submissionQuery = supabase
          .from("match_submissions")
          .select(
            `id, match_id, user_id, player1_goals, player2_goals, declared_winner, evidence, created_at,
             profiles:user_id ( id, username ),
             winner_profile:declared_winner ( id, username ),
             match:match_id ( id, tournament_id, status, winner_user_id )`
          )
          .order("created_at", { ascending: false })
          .range((subPage - 1) * PAGE_SIZE, subPage * PAGE_SIZE - 1);

        // Count submissions separately
        const submissionCountQuery = supabase
          .from("match_submissions")
          .select("id", { count: "exact", head: true });

        // Apply search on username or IDs if query provided
        if (query && query.trim().length > 0) {
          const q = query.trim();
          // For username search we have to filter on related table -> workaround: filter by user_id if UUID fragment, plus client-side filter by username
          // We'll fetch and then client-filter by username
        }

        const [subResult, subCount] = await Promise.all([
          submissionQuery,
          submissionCountQuery,
        ]);

        if (subResult.error) throw subResult.error;
        if (subCount.error) throw subCount.error;

        let submissionRows = subResult.data || [];
        if (query && query.trim().length > 0) {
          const q = query.trim().toLowerCase();
          submissionRows = submissionRows.filter((s) => {
            const submitterUsername = s.profiles?.username || "";
            const winnerUsername = s.winner_profile?.username || "";
            return (
              submitterUsername.toLowerCase().includes(q) ||
              winnerUsername.toLowerCase().includes(q) ||
              String(s.user_id).toLowerCase().includes(q) ||
              String(s.declared_winner || "").toLowerCase().includes(q) ||
              String(s.match?.id || "").toLowerCase().includes(q) ||
              String(s.match?.tournament_id || "").toLowerCase().includes(q)
            );
          });
        }

        // Disputes
        const disputesQuery = supabase
          .from("disputes")
          .select(
            `id, match_id, tournament_id, created_by, status, answers, evidence, created_at,
             user:created_by ( id, username ),
             match:match_id ( id, tournament_id, status )`
          )
          .order("created_at", { ascending: false })
          .range((dispPage - 1) * PAGE_SIZE, dispPage * PAGE_SIZE - 1);

        if (statusFilter !== "all") {
          disputesQuery.eq("status", statusFilter);
        }

        const disputesCountQuery = supabase
          .from("disputes")
          .select("*", { count: "exact", head: true });

        const [dispResult, dispCount] = await Promise.all([
          disputesQuery,
          disputesCountQuery,
        ]);
        if (dispResult.error) throw dispResult.error;
        if (dispCount?.error) throw dispCount.error;

        let disputeRows = dispResult.data || [];
        if (query && query.trim().length > 0) {
          const q = query.trim().toLowerCase();
          disputeRows = disputeRows.filter((d) => {
            const username = d.user?.username || "";
            const desc = d.answers?.description || "";
            return (
              username.toLowerCase().includes(q) ||
              desc.toLowerCase().includes(q) ||
              String(d.match?.id || "").toLowerCase().includes(q) ||
              String(d.tournament_id || "").toLowerCase().includes(q)
            );
          });
        }

        if (!isMounted) return;
        setSubmissions(submissionRows);
        setSubmissionsTotal(subCount.count || submissionRows.length || 0);
        setDisputes(disputeRows);
        setDisputesTotal(dispCount?.count || disputeRows.length || 0);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Failed to load admin data");
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [subPage, dispPage, query, statusFilter]);

  const subPages = useMemo(() => Math.max(1, Math.ceil(submissionsTotal / PAGE_SIZE)), [submissionsTotal]);
  const dispPages = useMemo(() => Math.max(1, Math.ceil(disputesTotal / PAGE_SIZE)), [disputesTotal]);

  const statusBadge = (status) => {
    const styles = status === "completed"
      ? { backgroundColor: "#16a34a", color: "#ffffff" }
      : status === "disputed"
      ? { backgroundColor: "#dc2626", color: "#ffffff" }
      : { backgroundColor: "#f59e0b", color: "#000000" };
    return <span className="px-2 py-1 rounded text-xs font-bold" style={styles}>{(status || "pending").toUpperCase()}</span>;
  };

  return (
    <MainLayout>
      <div className="privacy-policy-container">
        <div className="privacy-policy-header text-center">
          <h1 style={{ color: "#ffffff" }}>Admin: Results & Disputes</h1>
          <p className="sub-heading" style={{ color: "#cbd5e1" }}>Review user result submissions and manage disputes</p>
        </div>

        <div className="bg-[#1a1a2e] rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSubPage(1); setDispPage(1); }}
              placeholder="Search by username, user ID, match ID, tournament ID"
              className="w-full bg-[#1f1f2e] text-black rounded p-2 outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setDispPage(1); }}
              className="w-full bg-[#94a3b8] text-black rounded p-2 outline-none"
            >
              <option value="all">All dispute statuses</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>
            <div className="flex items-center gap-2 text-sm" style={{ color: "#94a3b8" }}>
              <span>Submissions: {submissionsTotal}</span>
              <span>•</span>
              <span>Disputes: {disputesTotal}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center"><p style={{ color: "#cbd5e1" }}>Loading...</p></div>
        ) : error ? (
          <div className="text-center"><p style={{ color: "#ef4444" }}>{error}</p></div>
        ) : (
          <>
            <div className="bg-[#1a1a2e] rounded-lg p-4 mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold" style={{ color: "#00ffcc" }}>Recent Result Submissions</h2>
                <div className="text-sm" style={{ color: "#94a3b8" }}>Page {subPage} / {subPages}</div>
              </div>
              {submissions.length === 0 ? (
                <div className="text-sm" style={{ color: "#94a3b8" }}>No submissions found.</div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#1f1f2e]" style={{ color: "#00ffcc" }}>
                      <tr>
                        <th className="p-3">Match</th>
                        <th className="p-3">Submitted By</th>
                        <th className="p-3">Scores</th>
                        <th className="p-3">Declared Winner</th>
                        <th className="p-3">Evidence</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Submitted</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((s) => (
                        <tr key={s.id} className="border-t border-[#2a2a3e]">
                          <td className="p-3 text-sm" style={{ color: "#e5e7eb" }}>
                            <div>Match #{s.match?.id}</div>
                            <div className="text-xs" style={{ color: "#94a3b8" }}>Tournament #{s.match?.tournament_id}</div>
                          </td>
                          <td className="p-3 text-sm" style={{ color: "#e5e7eb" }}>
                            <div className="font-semibold">{s.profiles?.username || `User ${s.user_id}`}</div>
                            <div className="text-xs" style={{ color: "#94a3b8" }}>User ID: {s.user_id}</div>
                          </td>
                          <td className="p-3 text-sm" style={{ color: "#e5e7eb" }}>
                            {s.player1_goals ?? s.player1_points} - {s.player2_goals ?? s.player2_points}
                          </td>
                          <td className="p-3 text-sm" style={{ color: "#e5e7eb" }}>
                            {s.declared_winner === 'draw' ? 'DRAW' : (
                              s.winner_profile?.username || 
                              (s.declared_winner ? `User ${s.declared_winner}` : '-')
                            )}
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
                          <td className="p-3 text-sm">{statusBadge(s.match?.status)}</td>
                          <td className="p-3 text-sm" style={{ color: "#e5e7eb" }}>{new Date(s.created_at).toLocaleString()}</td>
                          <td className="p-3 text-sm">
                            <button
                              onClick={() => navigate(`/tournament/${s.match?.tournament_id}/report-match/${s.match?.id}`)}
                              className="px-3 py-1 rounded text-xs font-bold transition-colors hover:opacity-80"
                              style={{ backgroundColor: "#00ffcc", color: "#1a1a2e" }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 mt-3">
                <button onClick={() => setSubPage((p) => Math.max(1, p - 1))} disabled={subPage <= 1} className={`px-3 py-1 rounded ${subPage <= 1 ? "cursor-not-allowed" : ""}`} style={{ backgroundColor: "#2a2a3e", color: "#ffffff" }}>Prev</button>
                <button onClick={() => setSubPage((p) => Math.min(subPages, p + 1))} disabled={subPage >= subPages} className={`px-3 py-1 rounded ${subPage >= subPages ? "cursor-not-allowed" : ""}`} style={{ backgroundColor: "#2a2a3e", color: "#ffffff" }}>Next</button>
              </div>
            </div>

            <div className="bg-[#1a1a2e] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold" style={{ color: "#00ffcc" }}>Disputes</h2>
                <div className="text-sm" style={{ color: "#94a3b8" }}>Page {dispPage} / {dispPages}</div>
              </div>
              {disputes.length === 0 ? (
                <div className="text-sm" style={{ color: "#94a3b8" }}>No disputes found.</div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#1f1f2e]" style={{ color: "#00ffcc" }}>
                      <tr>
                        <th className="p-3">Dispute</th>
                        <th className="p-3">Match</th>
                        <th className="p-3">Created By</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Evidence</th>
                        <th className="p-3">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disputes.map((d) => (
                        <tr key={d.id} className="border-t border-[#2a2a3e]">
                          <td className="p-3 text-sm" style={{ color: "#e5e7eb" }}>
                            <div>#{d.id}</div>
                            <div className="text-xs" style={{ color: "#94a3b8" }}>{d.answers?.description?.slice(0, 80) || "-"}</div>
                          </td>
                          <td className="p-3 text-sm" style={{ color: "#e5e7eb" }}>
                            <div>Match #{d.match?.id}</div>
                            <div className="text-xs" style={{ color: "#94a3b8" }}>Tournament #{d.tournament_id}</div>
                          </td>
                          <td className="p-3 text-sm" style={{ color: "#e5e7eb" }}>
                            <div className="font-semibold">{d.user?.username || `User ${d.created_by}`}</div>
                            <div className="text-xs" style={{ color: "#94a3b8" }}>User ID: {d.created_by}</div>
                          </td>
                          <td className="p-3 text-sm">{statusBadge(d.status)}</td>
                          <td className="p-3 text-sm">
                            {(Array.isArray(d.evidence) ? d.evidence : []).length === 0 ? (
                              <span style={{ color: "#94a3b8" }}>-</span>
                            ) : (
                              <ul className="list-disc ml-4">
                                {(Array.isArray(d.evidence) ? d.evidence : []).map((ev, i) => (
                                  <li key={i} className="truncate" title={ev.url || ''} style={{ color: "#38bdf8" }}>{ev.url || '-'}</li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className="p-3 text-sm" style={{ color: "#e5e7eb" }}>{new Date(d.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 mt-3">
                <button onClick={() => setDispPage((p) => Math.max(1, p - 1))} disabled={dispPage <= 1} className={`px-3 py-1 rounded ${dispPage <= 1 ? "cursor-not-allowed" : ""}`} style={{ backgroundColor: "#2a2a3e", color: "#ffffff" }}>Prev</button>
                <button onClick={() => setDispPage((p) => Math.min(dispPages, p + 1))} disabled={dispPage >= dispPages} className={`px-3 py-1 rounded ${dispPage >= dispPages ? "cursor-not-allowed" : ""}`} style={{ backgroundColor: "#2a2a3e", color: "#ffffff" }}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Adminresults;


