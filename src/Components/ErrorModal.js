import React, { useEffect } from 'react';
import './ErrorModal.css';

const ErrorModal = ({ message, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 6000); // 6 seconds

      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div className="error-modal-overlay">
      <div className="error-modal-content">
        <p>{message}</p>
        <button onClick={onClose} className="error-modal-close-btn">&times;</button>
      </div>
    </div>
  );
};

export default ErrorModal;
