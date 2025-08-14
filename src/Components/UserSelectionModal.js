import React, { useState, useEffect } from "react";
import { 
  Modal, 
  Form, 
  ListGroup, 
  Button, 
  Spinner, 
  Alert,
  InputGroup 
} from "react-bootstrap";
import { Search, User } from "lucide-react";

const UserSelectionModal = ({ show, onHide, onSelectUser }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mock users data - replace with your actual API call
  const mockUsers = [
    { id: 1, name: "John Doe", username: "johndoe", avatar: "https://via.placeholder.com/40", status: "online" },
    { id: 2, name: "Jane Smith", username: "janesmith", avatar: "https://via.placeholder.com/40", status: "offline" },
    { id: 3, name: "Mike Johnson", username: "mikej", avatar: "https://via.placeholder.com/40", status: "online" },
    { id: 4, name: "Sarah Wilson", username: "sarahw", avatar: "https://via.placeholder.com/40", status: "online" },
    { id: 5, name: "David Brown", username: "davidb", avatar: "https://via.placeholder.com/40", status: "offline" },
    { id: 6, name: "Emily Davis", username: "emilyd", avatar: "https://via.placeholder.com/40", status: "online" },
  ];

  useEffect(() => {
    if (show) {
      fetchUsers();
    }
  }, [show]);

  useEffect(() => {
    // Filter users based on search term
    const filtered = users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setUsers(mockUsers);
    } catch (err) {
      setError("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    onSelectUser(user);
    setSearchTerm("");
  };

  const handleClose = () => {
    setSearchTerm("");
    setError(null);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="md" centered>
      <Modal.Header closeButton>
        <Modal.Title>Select User to Challenge</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Search Input */}
        <InputGroup className="mb-3">
          <InputGroup.Text>
            <Search size={16} />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Search users by name or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        {/* Error Alert */}
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
            <div className="mt-2">
              <Button variant="outline-danger" size="sm" onClick={fetchUsers}>
                Retry
              </Button>
            </div>
          </Alert>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <div className="mt-2">Loading users...</div>
          </div>
        )}

        {/* Users List */}
        {!loading && !error && (
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {filteredUsers.length > 0 ? (
              <ListGroup variant="flush">
                {filteredUsers.map((user) => (
                  <ListGroup.Item
                    key={user.id}
                    action
                    onClick={() => handleUserSelect(user)}
                    className="d-flex align-items-center py-3 border-0 border-bottom"
                    style={{ cursor: "pointer" }}
                  >
                    <div className="position-relative me-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="rounded-circle"
                          width="40"
                          height="40"
                        />
                      ) : (
                        <div 
                          className="rounded-circle bg-secondary d-flex align-items-center justify-content-center"
                          style={{ width: "40px", height: "40px" }}
                        >
                          <User size={20} className="text-white" />
                        </div>
                      )}
                      <span
                        className={`position-absolute top-0 end-0 rounded-circle border border-2 border-white ${
                          user.status === "online" ? "bg-success" : "bg-secondary"
                        }`}
                        style={{ width: "12px", height: "12px" }}
                      />
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-semibold">{user.name}</div>
                      <div className="text-muted small">@{user.username}</div>
                    </div>
                    <div className="text-end">
                      <small className={user.status === "online" ? "text-success" : "text-muted"}>
                        {user.status}
                      </small>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            ) : (
              <div className="text-center py-4 text-muted">
                {searchTerm ? (
                  <>
                    <Search size={48} className="mb-3 opacity-50" />
                    <div>No users found matching "{searchTerm}"</div>
                    <small>Try a different search term</small>
                  </>
                ) : (
                  <>
                    <User size={48} className="mb-3 opacity-50" />
                    <div>No users available</div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default UserSelectionModal;