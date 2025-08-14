import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import MainLayout from "../Components/MainLayout";

const TournamentParticipants = () => {
  const { id } = useParams();
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    const key = `participants_${id}`;
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    setParticipants(data);
  }, [id]);

  // Simple pairing into matches (Round 1)
  const matches = useMemo(() => {
    const m = [];
    for (let i = 0; i < participants.length; i += 2) {
      m.push({
        table: Math.floor(i / 2) + 1,
        p1: participants[i]?.name || "TBD",
        p2: participants[i + 1]?.name || "TBD",
      });
    }
    return m;
  }, [participants]);

  return (
    <MainLayout>
      <div className="privacy-policy-container">
        <div className="privacy-policy-header text-center">
          <h1>Participants</h1>
          <p className="sub-heading">Tournament ID: {id}</p>
        </div>

        {/* Participants List */}
        <h2>Players</h2>
        <ul className="list-disc pl-6 mb-8">
          {participants.length === 0 && <li>No participants yet.</li>}
          {participants.map((p) => (
            <li key={p.id}>
              {p.name} <span className="text-gray-400 text-sm">({new Date(p.joinedAt).toLocaleString()})</span>
            </li>
          ))}
        </ul>

        {/* Matches Table */}
        <h2>Match Tables (Round 1)</h2>
        <table className="w-full text-left border border-[#1f1f2e] rounded overflow-hidden">
          <thead className="bg-[#1f1f2e] text-[#00ffcc]">
            <tr>
              <th className="p-3">Table</th>
              <th className="p-3">Player 1</th>
              <th className="p-3">Player 2</th>
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 && (
              <tr>
                <td className="p-3" colSpan={3}>No matches yet.</td>
              </tr>
            )}
            {matches.map((m, idx) => (
              <tr key={idx} className="border-t border-[#1f1f2e]">
                <td className="p-3">{m.table}</td>
                <td className="p-3">{m.p1}</td>
                <td className="p-3">{m.p2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
};

export default TournamentParticipants;
