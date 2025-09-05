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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadChallenge = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Load challenge row
      const { data: ch, error: chErr } = await supabase
        .from("challenges")
        .select(
          "id, creator_id, entry_fee, status, participants, total_participants, game_type, prize_amount, challenge_type, play_time, created_at"
        )
        .eq("id", id)
        .single();

      if (chErr || !ch) {
        setError("Challenge not found");
        setLoading(false);
        return;
      }

      setChallenge(ch);

      // 2) Load participants (two users max)
      const { data: partRows } = await supabase
        .from("challenge_participants")
        .select("user_id, joined_at")
        .eq("challenge_id", id);

      const allUserIds = Array.from(
        new Set(
          [ch.creator_id, ...(partRows || []).map((p) => p.user_id)].filter(Boolean)
        )
      );

      let profileMap = {};
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, full_name");
        (profiles || [])
          .filter((p) => allUserIds.includes(p.id))
          .forEach((p) => {
            profileMap[p.id] = p;
          });
      }

      // Decide p1/p2
      const p1 = profileMap[ch.creator_id] || null;
      const others = (partRows || [])
        .map((p) => profileMap[p.user_id])
        .filter(Boolean)
        .filter((p) => p.id !== ch.creator_id);
      const p2 = others.length > 0 ? others[0] : null;

      setPlayers({ p1, p2 });

      // 3) Load existing matches
      await fetchMatches({ ensure: true, p1, p2, ch });
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
      return { p1Wins: 0, p2Wins: 0 };
    }
    let p1Wins = 0;
    let p2Wins = 0;
    matches.forEach((m) => {
      if (m.status === "completed") {
        if (m.winner_user_id === players.p1.id) p1Wins++;
        if (m.winner_user_id === players.p2.id) p2Wins++;
      }
    });
    return { p1Wins, p2Wins };
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
                  <Badge bg="dark" className="me-2">
                    {players.p1?.username || players.p1?.full_name || "Player 1"}:{" "}
                    {seriesScore.p1Wins}
                  </Badge>
                  <Badge bg="dark">
                    {players.p2?.username || players.p2?.full_name || "Player 2"}:{" "}
                    {seriesScore.p2Wins}
                  </Badge>
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
                                {players.p1?.username || "Player 1"} vs{" "}
                                {players.p2?.username || "Player 2"}
                              </div>
                              <div className="mt-1">
                                Score: {(m.player1_points ?? 0)} - {(m.player2_points ?? 0)}
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
                    <div className="fw-bold">{players.p1?.username || players.p1?.full_name || "Player 1"}</div>
                    <div className="small text-muted">Creator</div>
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
                    <div className="fw-bold">{players.p2?.username || players.p2?.full_name || "Waiting..."}</div>
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