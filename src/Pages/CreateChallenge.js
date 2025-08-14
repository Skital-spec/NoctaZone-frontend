import React, { useState, useContext } from "react";
import { 
  Container, 
  Card, 
  Form, 
  Button, 
  Row, 
  Col, 
  Modal, 
  Alert,
  Spinner 
} from "react-bootstrap";
import { ArrowLeft, Users, Calendar, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../Components/MainLayout";
import { useWallet } from "../context/WalletContext";
import UserSelectionModal from "../Components/UserSelectionModal";
import PaymentConfirmationModal from "../Components/PaymentConfirmationModal";

const CreateChallenge = () => {
  const navigate = useNavigate();
  const { balance, setBalance } = useWallet();
  
  const [formData, setFormData] = useState({
    entryFee: "",
    participants: 2,
    playTime: "",
    challengeType: "open"
  });
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChallengeTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      challengeType: type
    }));
    
    if (type === "challenge" && !selectedUser) {
      setShowUserModal(true);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setShowUserModal(false);
  };

  const validateForm = () => {
    if (!formData.entryFee || formData.entryFee <= 0) {
      setAlert({ type: "danger", message: "Please enter a valid entry fee" });
      return false;
    }
    
    if (!formData.playTime) {
      setAlert({ type: "danger", message: "Please select a time to play" });
      return false;
    }
    
    if (formData.challengeType === "challenge" && !selectedUser) {
      setAlert({ type: "danger", message: "Please select a user to challenge" });
      return false;
    }
    
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setAlert(null);
    
    if (!validateForm()) return;
    
    // Check if user has sufficient balance
    const entryFee = parseFloat(formData.entryFee);
    if (balance < entryFee) {
      setAlert({ 
        type: "warning", 
        message: `Insufficient balance. You need $${entryFee} but have $${balance}. Please top up your wallet.` 
      });
      return;
    }
    
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = async () => {
    setIsSubmitting(true);
    
    try {
      const entryFee = parseFloat(formData.entryFee);
      
      // Deduct from wallet balance
      setBalance(prevBalance => prevBalance - entryFee);
      
      // Create challenge object
      const challengeData = {
        id: Date.now(),
        entryFee: entryFee,
        participants: formData.participants,
        playTime: formData.playTime,
        type: formData.challengeType,
        targetUser: selectedUser,
        creator: { id: 1, name: "Current User" }, // Replace with actual user data
        createdAt: new Date().toISOString(),
        status: "pending"
      };
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Post to appropriate destination
      if (formData.challengeType === "challenge") {
        // Send to private chat with selected user
        console.log("Posting challenge to private chat:", selectedUser);
      } else {
        // Post to public chat
        console.log("Posting challenge to public chat");
      }
      
      setShowPaymentModal(false);
      setAlert({ 
        type: "success", 
        message: "Match created successfully!" 
      });
      
      // Navigate back after 2 seconds
      setTimeout(() => {
        navigate("/my-zone");
      }, 2000);
      
    } catch (error) {
      console.error("Error creating challenge:", error);
      setAlert({ 
        type: "danger", 
        message: "Failed to create challenge. Please try again." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <Container className="py-4">
        <div className="d-flex align-items-center mb-4">
          <Button 
            variant="link" 
            className="p-0 me-3 text-decoration-none"
            onClick={() => navigate("/myzone")}
          >
            <ArrowLeft size={20} />
          </Button>
          <h2 className="mb-0">Create Match Challenge</h2>
        </div>

        {alert && (
          <Alert variant={alert.type} className="mb-4">
            {alert.message}
          </Alert>
        )}

        <Row className="justify-content-center">
          <Col lg={8}>
            <Card>
              <Card.Body className="p-4">
                <Form onSubmit={handleSubmit}>
                  {/* Entry Fee */}
                  <Row className="mb-4">
                    <Col>
                      <Form.Group>
                        <Form.Label className="d-flex align-items-center fw-bold">
                          <DollarSign size={18} className="me-2" />
                          Entry Fee
                        </Form.Label>
                        <Form.Control
                          type="number"
                          name="entryFee"
                          value={formData.entryFee}
                          onChange={handleInputChange}
                          placeholder="Enter entry fee amount"
                          min="1"
                          step="0.01"
                          required
                        />
                        <Form.Text className="text-muted">
                          Current wallet balance: ${balance}
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Number of Participants */}
                  <Row className="mb-4">
                    <Col>
                      <Form.Group>
                        <Form.Label className="d-flex align-items-center fw-bold">
                          <Users size={18} className="me-2" />
                          Number of Participants
                        </Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.participants}
                          disabled
                          className="bg-light"
                        />
                        <Form.Text className="text-muted">
                          Currently fixed at 2 participants
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Time to be Played */}
                  <Row className="mb-4">
                    <Col>
                      <Form.Group>
                        <Form.Label className="d-flex align-items-center fw-bold">
                          <Calendar size={18} className="me-2" />
                          Time to be Played
                        </Form.Label>
                        <Form.Control
                          type="datetime-local"
                          name="playTime"
                          value={formData.playTime}
                          onChange={handleInputChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Challenge Type */}
                  <Row className="mb-4">
                    <Col>
                      <Form.Group>
                        <Form.Label className="fw-bold">Challenge Type</Form.Label>
                        <div className="mt-2">
                          <Form.Check
                            type="radio"
                            id="open-challenge"
                            name="challengeType"
                            value="open"
                            checked={formData.challengeType === "open"}
                            onChange={(e) => handleChallengeTypeChange(e.target.value)}
                            label="Open Challenge"
                            className="mb-2"
                          />
                          <Form.Check
                            type="radio"
                            id="challenge-user"
                            name="challengeType"
                            value="challenge"
                            checked={formData.challengeType === "challenge"}
                            onChange={(e) => handleChallengeTypeChange(e.target.value)}
                            label="Challenge Specific User"
                          />
                        </div>
                        
                        {formData.challengeType === "challenge" && (
                          <div className="mt-3 p-3 bg-light rounded">
                            {selectedUser ? (
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <strong>Selected User:</strong> {selectedUser.name}
                                  <br />
                                  <small className="text-muted">@{selectedUser.username}</small>
                                </div>
                                <Button 
                                  variant="outline-primary" 
                                  size="sm"
                                  onClick={() => setShowUserModal(true)}
                                >
                                  Change
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline-primary"
                                onClick={() => setShowUserModal(true)}
                              >
                                Select User to Challenge
                              </Button>
                            )}
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Submit Button */}
                  <div className="d-flex justify-content-end gap-3">
                    <Button 
                      variant="outline-secondary"
                      onClick={() => navigate("/my-zone")}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      variant="primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Creating...
                        </>
                      ) : (
                        "Create Challenge"
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* User Selection Modal */}
        <UserSelectionModal
          show={showUserModal}
          onHide={() => setShowUserModal(false)}
          onSelectUser={handleUserSelect}
        />

        {/* Payment Confirmation Modal */}
        <PaymentConfirmationModal
          show={showPaymentModal}
          onHide={() => setShowPaymentModal(false)}
          onConfirm={handlePaymentConfirm}
          amount={formData.entryFee}
          balance={balance}
          isProcessing={isSubmitting}
        />
      </Container>
    </MainLayout>
  );
};

export default CreateChallenge;