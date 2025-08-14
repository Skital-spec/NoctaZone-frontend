import React from "react";
import { 
  Modal, 
  Button, 
  Alert, 
  Row, 
  Col, 
  Spinner 
} from "react-bootstrap";
import { DollarSign, Wallet, CreditCard } from "lucide-react";

const PaymentConfirmationModal = ({ 
  show, 
  onHide, 
  onConfirm, 
  amount, 
  balance, 
  isProcessing 
}) => {
  const entryFee = parseFloat(amount) || 0;
  const remainingBalance = balance - entryFee;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center">
          <CreditCard size={20} className="me-2" />
          Confirm Payment
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-4">
          <h5>Payment Summary</h5>
          
          <div className="bg-light p-3 rounded mb-3">
            <Row className="mb-2">
              <Col>Entry Fee:</Col>
              <Col className="text-end fw-bold">
                <DollarSign size={16} className="me-1" />
                {entryFee.toFixed(2)}
              </Col>
            </Row>
            <hr className="my-2" />
            <Row className="mb-2">
              <Col>
                <Wallet size={16} className="me-1" />
                Current Balance:
              </Col>
              <Col className="text-end">
                ${balance.toFixed(2)}
              </Col>
            </Row>
            <Row>
              <Col>Balance After Payment:</Col>
              <Col className="text-end fw-bold">
                <span className={remainingBalance >= 0 ? "text-success" : "text-danger"}>
                  ${remainingBalance.toFixed(2)}
                </span>
              </Col>
            </Row>
          </div>

          {remainingBalance < 0 && (
            <Alert variant="warning">
              <strong>Insufficient Balance!</strong>
              <br />
              You need ${Math.abs(remainingBalance).toFixed(2)} more to complete this transaction.
              Please top up your wallet first.
            </Alert>
          )}

          {remainingBalance >= 0 && (
            <Alert variant="info">
              <strong>Confirm Payment</strong>
              <br />
              The entry fee of ${entryFee.toFixed(2)} will be deducted from your wallet balance.
            </Alert>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button 
          variant="secondary" 
          onClick={onHide}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        
        {remainingBalance < 0 ? (
          <Button 
            variant="warning"
            onClick={() => {
              // Navigate to wallet top-up page
              window.location.href = "/wallet";
            }}
          >
            Top Up Wallet
          </Button>
        ) : (
          <Button 
            variant="primary" 
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Spinner size="sm" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                <DollarSign size={16} className="me-1" />
                Confirm Payment
              </>
            )}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default PaymentConfirmationModal;