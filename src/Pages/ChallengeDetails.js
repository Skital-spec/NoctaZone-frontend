import React, { useEffect, useMemo, useState } from "react";
import {
  Container,
  Card,
  Row,
  Col,
  Badge,
  Button,
  Alert,
  Spinner
} from "react-bootstrap";
import {
  ArrowLeft,
  Users,
  Calendar,
  Clock,
  User,
  Trophy
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

const ChallengeDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // /challenge/:id
  const [challenge, setChallenge] = useState(null);
  const [players, setPlayers] = useState({ p1: null, p2: null });
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingMatches, setCreatingMatches] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadChallenge();
  }, [id]);

  useEffect(() => {
    if (!challenge || challenge.challenge_type !== 'open') return;
    if (players.p2) return;
    const t = setInterval(() => {
      loadChallenge();
    }, 4000);
    return () => clearInterval(t);
  }, [challenge, players.p2]);

  const loadChallenge = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Challenge + players from backend
      const chRes = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}`, { credentials: "include" });
      if (!chRes.ok) throw new Error("Failed to load challenge");
      const chJson = await chRes.json();
      setChallenge(chJson.challenge);
      
      // 2) Get detailed player information from Supabase if we have player IDs
      let playersData = chJson.players || { p1: null, p2: null };
      
      if (playersData.p1?.id || playersData.p2?.id) {
        const playerIds = [];
        if (playersData.p1?.id) playerIds.push(playersData.p1.id);
        if (playersData.p2?.id) playerIds.push(playersData.p2.id);
        
        // Fetch complete user profiles from Supabase
        const { data: userProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', playerIds);
        
        if (!profileError && userProfiles) {
          // Merge the complete user data
          if (playersData.p1?.id) {
            const p1Profile = userProfiles.find(u => u.id === playersData.p1.id);
            if (p1Profile) {
              playersData.p1 = { ...playersData.p1, ...p1Profile };
            }
          }
          if (playersData.p2?.id) {
            const p2Profile = userProfiles.find(u => u.id === playersData.p2.id);
            if (p2Profile) {
              playersData.p2 = { ...playersData.p2, ...p2Profile };
            }
          }
        }
      }
      
      setPlayers(playersData);

      // 3) Ensure matches (only if two players present)
      if (playersData?.p1?.id && playersData?.p2?.id) {
        const ensureRes = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}/ensure-matches`, {
          method: "POST",
          credentials: "include"
        });
        if (ensureRes.ok) {
          const ensureJson = await ensureRes.json();
          setMatches(ensureJson.matches || []);
        } else {
          // fallback: fetch matches even if ensure failed
          const mRes = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}/matches`, { credentials: "include" });
          const mJson = await mRes.json();
          setMatches(mJson.matches || []);
        }
      } else {
        // 4) Fetch existing matches (might be 0 until opponent joins)
        const mRes = await fetch(`https://safcom-payment.onrender.com/api/challenges/${id}/matches`, { credentials: "include" });
        const mJson = await mRes.json();
        setMatches(mJson.matches || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load challenge");
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async ({ ensure, p1, p2, ch }) => {
    const { data: m } = await supabase
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", id) // reuse tournament_matches; treat challenge id as tournament_id
      .order("match_number", { ascending: true });

    let current = m || [];

    // Create 3 matches if both players exist and matches missing
    if (ensure && current.length < 3 && p1?.id && p2?.id) {
      try {
        setCreatingMatches(true);
        const toCreate = [1, 2, 3]
          .filter((n) => !current.find((x) => x.match_number === n))
          .map((n) => ({
            tournament_id: id,
            round: 1,
            match_number: n,
            status: "pending",
            player1_id: p1.id,
            player2_id: p2.id,
            created_at: new Date().toISOString()
          }));

        if (toCreate.length > 0) {
          const { error: insErr } = await supabase
            .from("tournament_matches")
            .insert(toCreate);
          if (!insErr) {
            const { data: fresh } = await supabase
              .from("tournament_matches")
              .select("*")
              .eq("tournament_id", id)
              .order("match_number", { ascending: true });
            current = fresh || [];
          }
        }
      } finally {
        setCreatingMatches(false);
      }
    }

    setMatches(current);
  };

  const seriesScore = useMemo(() => {
    if (!players.p1 || !players.p2 || matches.length === 0) {
      return { p1Wins: 0, p2Wins: 0, seriesWinner: null };
    }
    let p1Wins = 0;
    let p2Wins = 0;
    matches.forEach((m) => {
      if (m.status === "completed") {
        if (m.winner_user_id === players.p1.id) p1Wins++;
        if (m.winner_user_id === players.p2.id) p2Wins++;
      }
    });
    
    // Determine series winner
    let seriesWinner = null;
    if (p1Wins > p2Wins) {
      seriesWinner = players.p1;
    } else if (p2Wins > p1Wins) {
      seriesWinner = players.p2;
    }
    
    return { p1Wins, p2Wins, seriesWinner };
  }, [players, matches]);

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "pending":
        return "warning";
      case "ongoing":
        return "info";
      case "completed":
        return "success";
      case "disputed":
        return "danger";
      default:
        return "secondary";
    }
  };

  const gotoReport = (matchId) => {
    navigate(`/tournament/${id}/report-match/${matchId}`);
  };

  if (loading) {
    return (
        <Container className="py-5 text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <div className="mt-3">Loading challenge...</div>
        </Container>
    );
  }

  if (error || !challenge) {
    return (
        <Container className="py-4">
          <Alert variant="danger">
            {error || "Challenge not found"}
            <div className="mt-3">
              <Button variant="outline-danger" onClick={loadChallenge}>
                Retry
              </Button>
              <Button variant="link" onClick={() => navigate("/myzone")} className="ms-2">
                Go Back
              </Button>
            </div>
          </Alert>
        </Container>
    );
  }

  return (
      <Container className="py-4">
        <div className="d-flex align-items-center mb-4">
          <Button
            variant="link"
            className="p-0 me-3 text-decoration-none"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} />
          </Button>
          <h2 className="mb-0">Challenge Details</h2>
        </div>

        <Row>
          <Col lg={8}>
            <Card className="mb-4">
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 d-flex align-items-center">
                    <Trophy size={20} className="me-2" />
                    {challenge.game_type || "1v1 Match"}
                  </h5>
                  <Badge bg={getStatusVariant(challenge.status)} className="text-capitalize">
                    {challenge.status}
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body className="p-4">
                <Row className="mb-3">
                  <Col md={6} className="mb-3">
                    <div className="d-flex align-items-center mb-1">
                      <Users size={18} className="me-2 text-info" />
                      <span className="fw-bold">Participants</span>
                    </div>
                    <div className="ms-4">
                      <span className="h6">
                        {challenge.participants || 0} / {challenge.total_participants || 2}
                      </span>
                    </div>
                  </Col>
                  <Col md={6} className="mb-3">
                    <div className="d-flex align-items-center mb-1">
                      <Calendar size={18} className="me-2 text-warning" />
                      <span className="fw-bold">Scheduled Time</span>
                    </div>
                    <div className="ms-4">{formatDateTime(challenge.play_time)}</div>
                  </Col>
                </Row>

                <Row className="mb-4">
                  <Col md={6} className="mb-3">
                    <div className="fw-bold">Entry Fee</div>
                    <div className="h5 text-success">{challenge.entry_fee} Tokens</div>
                  </Col>
                  <Col md={6} className="mb-3">
                    <div className="fw-bold">Prize Pool</div>
                    <div className="h5 text-success">
                      {(challenge.prize_amount || (challenge.entry_fee || 0) * 2)} Tokens
                    </div>
                  </Col>
                </Row>

                <div className="mb-2 fw-bold">Best of 3 Series</div>
                <div className="mb-3">
                  {seriesScore.seriesWinner ? (
                    <div className="d-flex align-items-center">
                      <Trophy size={20} className="me-2 text-warning" />
                      <Badge bg="success" className="me-2">
                        Winner: {seriesScore.seriesWinner.username || `User ${seriesScore.seriesWinner.id}`}
                      </Badge>
                      <Badge bg="dark" className="me-2">
                        {players.p1?.username || `User ${players.p1?.id}` || "Player 1"}: {seriesScore.p1Wins}
                      </Badge>
                      <Badge bg="dark">
                        {players.p2?.username || `User ${players.p2?.id}` || "Player 2"}: {seriesScore.p2Wins}
                      </Badge>
                    </div>
                  ) : (
                    <div>
                      <Badge bg="dark" className="me-2">
                        {players.p1?.username || `User ${players.p1?.id}` || "Player 1"}: {seriesScore.p1Wins}
                      </Badge>
                      <Badge bg="dark">
                        {players.p2?.username || `User ${players.p2?.id}` || "Player 2"}: {seriesScore.p2Wins}
                      </Badge>
                    </div>
                  )}
                </div>

                {creatingMatches && (
                  <div className="mb-3">
                    <Spinner size="sm" className="me-2" />
                    Preparing matches...
                  </div>
                )}

                <div className="d-grid gap-3">
                  {matches.length === 0 ? (
                    <div className="text-muted">Matches will appear here once both players join.</div>
                  ) : (
                    matches.map((m) => {
                      const statusVariant =
                        m.status === "completed"
                          ? "success"
                          : m.status === "disputed"
                          ? "danger"
                          : m.status === "ongoing"
                          ? "info"
                          : "secondary";
                      return (
                        <Card key={m.id}>
                          <Card.Body className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
                            <div className="mb-2 mb-md-0">
                              <div className="fw-bold">Match {m.match_number}</div>
                              <div className="small text-muted">
                                {players.p1?.username || `User ${players.p1?.id}` || "Player 1"} vs{" "}
                                {players.p2?.username || `User ${players.p2?.id}` || "Player 2"}
                              </div>
                              <div className="mt-1">
                                {m.status === "completed" && m.winner_user_id ? (
                                  <div className="d-flex align-items-center">
                                    {m.winner_user_id === 'draw' ? (
                                      <span className="text-warning fw-bold">
                                        Result: Draw
                                      </span>
                                    ) : (
                                      <>
                                        <Trophy size={16} className="me-1 text-warning" />
                                        <span className="text-success fw-bold">
                                          Winner: {m.winner_user_id === players.p1?.id 
                                            ? (players.p1?.username || `User ${players.p1?.id}`)
                                            : (players.p2?.username || `User ${players.p2?.id}`)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                ) : m.status === "disputed" ? (
                                  <span className="text-danger fw-bold">Disputed - Awaiting Resolution</span>
                                ) : (
                                  <span className="text-muted">Winner: TBD</span>
                                )}
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <Badge bg={statusVariant}>{(m.status || "pending").toUpperCase()}</Badge>
                              <Button
                                variant="outline-primary"
                                onClick={() => gotoReport(m.id)}
                              >
                                Report Results
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      );
                    })
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="mb-4">
              <Card.Header>
                <h6 className="mb-0">Players</h6>
              </Card.Header>
              <Card.Body>
                <div className="d-flex align-items-center mb-3">
                  {players.p1?.avatar_url ? (
                    <img
                      src={players.p1.avatar_url}
                      alt="p1"
                      className="rounded-circle me-3"
                      width="44"
                      height="44"
                    />
                  ) : (
                    <div
                      className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-3"
                      style={{ width: "44px", height: "44px" }}
                    >
                      <User size={22} className="text-white" />
                    </div>
                  )}
                  <div>
                    <div className="fw-bold">
                      {players.p1?.username || `User ${players.p1?.id}` || "Player 1"}
                    </div>
                    <div className="small text-muted">
                      Creator{players.p1?.username ? ` (${players.p1.username})` : ""}
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-center">
                  {players.p2?.avatar_url ? (
                    <img
                      src={players.p2.avatar_url}
                      alt="p2"
                      className="rounded-circle me-3"
                      width="44"
                      height="44"
                    />
                  ) : (
                    <div
                      className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-3"
                      style={{ width: "44px", height: "44px" }}
                    >
                      <User size={22} className="text-white" />
                    </div>
                  )}
                  <div>
                    <div className="fw-bold">
                      {players.p2 ? 
                        (players.p2.username || `User ${players.p2.id}`) : 
                        "Waiting..."
                      }
                    </div>
                    <div className="small text-muted">
                      {players.p2 ? "Opponent" : "Waiting for opponent to join"}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header>
                <h6 className="mb-0">Meta</h6>
              </Card.Header>
              <Card.Body>
                <div className="mb-2">
                  <span className="fw-bold me-2">Type:</span>
                  <span className="text-capitalize">{challenge.challenge_type}</span>
                </div>
                <div className="mb-2">
                  <span className="fw-bold me-2">Created:</span>
                  <span>{formatDateTime(challenge.created_at)}</span>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
  );
};

export default ChallengeDetails;