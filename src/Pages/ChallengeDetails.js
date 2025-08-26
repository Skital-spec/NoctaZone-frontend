import React, { useState, useEffect } from "react";
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
  Trophy,
  MessageCircle
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../Components/MainLayout";

const ChallengeDetails = () => {
  const navigate = useNavigate();
  const { challengeId } = useParams();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchChallengeDetails();
  }, [challengeId]);

  const fetchChallengeDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock challenge data - replace with actual API call
      const mockChallenge = {
        id: challengeId,
        entryFee: 25.00,
        participants: 2,
        playTime: "2024-12-20T15:30",
        type: "challenge", // or "open"
        creator: { 
          id: 1, 
          name: "John Doe", 
          username: "johndoe",
          avatar: "https://picsum.photos/40" 
        },
        targetUser: { 
          id: 2, 
          name: "Jane Smith", 
          username: "janesmith",
          avatar: "https://picsum.photos/40" 
        },
        createdAt: "2024-12-18T10:00:00Z",
        status: "pending", // pending, accepted, declined, completed
        joinedUsers: [],
        gameType: "1v1 Match",
        description: "Looking for a competitive match. Good luck!"
      };
      
      setChallenge(mockChallenge);
    } catch (err) {
      setError("Failed to load challenge details.");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'declined': return 'danger';
      case 'completed': return 'info';
      default: return 'secondary';
    }
  };

  const handleAcceptChallenge = async () => {
    setActionLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setChallenge(prev => ({ ...prev, status: 'accepted' }));
      // Show success message or redirect
    } catch (err) {
      setError("Failed to accept challenge.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineChallenge = async () => {
    setActionLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setChallenge(prev => ({ ...prev, status: 'declined' }));
    } catch (err) {
      setError("Failed to decline challenge.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinChallenge = async () => {
    setActionLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setChallenge(prev => ({ 
        ...prev, 
        status: 'accepted',
        joinedUsers: [...prev.joinedUsers, { id: 999, name: "Current User" }]
      }));
    } catch (err) {
      setError("Failed to join challenge.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Container className="py-5 text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <div className="mt-3">Loading challenge details...</div>
        </Container>
      </MainLayout>
    );
  }

  if (error || !challenge) {
    return (
      <MainLayout>
        <Container className="py-4">
          <Alert variant="danger">
            {error || "Challenge not found"}
            <div className="mt-3">
              <Button variant="outline-danger" onClick={fetchChallengeDetails}>
                Retry
              </Button>
              <Button 
                variant="link" 
                onClick={() => navigate("/my-zone")}
                className="ms-2"
              >
                Go Back
              </Button>
            </div>
          </Alert>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container className="py-4">
        {/* Header */}
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

        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        <Row>
          <Col lg={8}>
            {/* Main Challenge Card */}
            <Card className="mb-4">
              <Card.Header className="bg-primary text-white">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 d-flex align-items-center">
                    <Trophy size={20} className="me-2" />
                    {challenge.gameType}
                  </h5>
                  <Badge bg={getStatusVariant(challenge.status)} className="text-capitalize">
                    {challenge.status}
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body className="p-4">
                {/* Challenge Info Grid */}
                <Row className="mb-4">
                  <Col md={6} className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      Kshs
                      <span className="fw-bold">Entry Fee</span>
                    </div>
                    <div className="ms-4">
                      <h4 className="text-success mb-0">${challenge.entryFee.toFixed(2)}</h4>
                    </div>
                  </Col>
                  
                  <Col md={6} className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <Users size={18} className="me-2 text-info" />
                      <span className="fw-bold">Participants</span>
                    </div>
                    <div className="ms-4">
                      <span className="h5">{challenge.participants} Players</span>
                    </div>
                  </Col>
                </Row>

                <Row className="mb-4">
                  <Col md={6} className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <Calendar size={18} className="me-2 text-warning" />
                      <span className="fw-bold">Scheduled Time</span>
                    </div>
                    <div className="ms-4">
                      <div>{formatDateTime(challenge.playTime)}</div>
                    </div>
                  </Col>
                  
                  <Col md={6} className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <Clock size={18} className="me-2 text-secondary" />
                      <span className="fw-bold">Created</span>
                    </div>
                    <div className="ms-4">
                      <div>{new Date(challenge.createdAt).toLocaleDateString()}</div>
                    </div>
                  </Col>
                </Row>

                {/* Description */}
                {challenge.description && (
                  <div className="mb-4">
                    <h6 className="fw-bold">Description</h6>
                    <p className="text-muted">{challenge.description}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="d-flex gap-2 flex-wrap">
                  {challenge.status === 'pending' && challenge.type === 'open' && (
                    <Button 
                      variant="success" 
                      onClick={handleJoinChallenge}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Joining...
                        </>
                      ) : (
                        <>
                          <Trophy size={16} className="me-1" />
                          Join Challenge
                        </>
                      )}
                    </Button>
                  )}
                  
                  {challenge.status === 'pending' && challenge.type === 'challenge' && (
                    <>
                      <Button 
                        variant="success" 
                        onClick={handleAcceptChallenge}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <Spinner size="sm" className="me-2" />
                        ) : (
                          "Accept Challenge"
                        )}
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        onClick={handleDeclineChallenge}
                        disabled={actionLoading}
                      >
                        Decline
                      </Button>
                    </>
                  )}
                  
                  <Button 
                    variant="outline-primary"
                    onClick={() => navigate(`/chat/${challenge.creator.id}`)}
                  >
                    <MessageCircle size={16} className="me-1" />
                    Message Creator
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            {/* Creator Info */}
            <Card className="mb-4">
              <Card.Header>
                <h6 className="mb-0">Challenge Creator</h6>
              </Card.Header>
              <Card.Body>
                <div className="d-flex align-items-center">
                  {challenge.creator.avatar ? (
                    <img
                      src={challenge.creator.avatar}
                      alt={challenge.creator.name}
                      className="rounded-circle me-3"
                      width="50"
                      height="50"
                    />
                  ) : (
                    <div 
                      className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-3"
                      style={{ width: "50px", height: "50px" }}
                    >
                      <User size={24} className="text-white" />
                    </div>
                  )}
                  <div>
                    <div className="fw-bold">{challenge.creator.name}</div>
                    <div className="text-muted">@{challenge.creator.username}</div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Target User (for direct challenges) */}
            {challenge.type === 'challenge' && challenge.targetUser && (
              <Card className="mb-4">
                <Card.Header>
                  <h6 className="mb-0">Challenged User</h6>
                </Card.Header>
                <Card.Body>
                  <div className="d-flex align-items-center">
                    {challenge.targetUser.avatar ? (
                      <img
                        src={challenge.targetUser.avatar}
                        alt={challenge.targetUser.name}
                        className="rounded-circle me-3"
                        width="50"
                        height="50"
                      />
                    ) : (
                      <div 
                        className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-3"
                        style={{ width: "50px", height: "50px" }}
                      >
                        <User size={24} className="text-white" />
                      </div>
                    )}
                    <div>
                      <div className="fw-bold">{challenge.targetUser.name}</div>
                      <div className="text-muted">@{challenge.targetUser.username}</div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Prize Pool */}
            <Card>
              <Card.Header>
                <h6 className="mb-0">Prize Pool</h6>
              </Card.Header>
              <Card.Body className="text-center">
                <div className="display-6 text-success fw-bold">
                  ${(challenge.entryFee * challenge.participants).toFixed(2)}
                </div>
                <small className="text-muted">
                  Winner takes all
                </small>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </MainLayout>
  );
};

export default ChallengeDetails;