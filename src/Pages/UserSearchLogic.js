import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Form, ListGroup } from "react-bootstrap";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

const supabaseUrl = 'https://yfboormaqzgjxbskjnuk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmYm9vcm1hcXpnanhic2tqbnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0Nzc0MDYsImV4cCI6MjA3MDA1MzQwNn0.CnQkxFOD8LgImr5NCFV3m7z1FpLqdBoPqDEns5J6d6k';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const UserSearchLogic = ({ show, onClose }) => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // debounce timer ref
  const debounceTimeout = useRef(null);

  // Fetch results on searchTerm change (debounced)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    // Clear existing timer
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    // Set new debounce timer
    debounceTimeout.current = setTimeout(() => {
      fetchResults(searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimeout.current);
  }, [searchTerm]);

  const fetchResults = async (term) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .ilike("username", `%${term.trim()}%`)
      .limit(20);
    setLoading(false);

    if (error) {
      alert("Error fetching users: " + error.message);
      return;
    }

    setResults(data);
  };

  // Navigate to chat page for selected user (change path as per your routing)
  const handleMessageUser = () => {
    if (!selectedUser) return;
    // Assuming your chat route looks like /messages/:userId
    navigate(`/privatechat/${selectedUser.id}`);
    onClose();
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>User Search</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!selectedUser ? (
          <>
            <Form.Group className="mb-3" controlId="searchInput">
              <Form.Control
                type="text"
                placeholder="Start typing username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </Form.Group>

            {loading && <p>Loading...</p>}

            <ListGroup>
              {results.length === 0 && searchTerm.trim() !== "" && !loading && (
                <p>No users found.</p>
              )}
              {results.map((user) => (
                <ListGroup.Item
                  action
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                >
                  {user.username}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </>
        ) : (
          <>
            <div className="text-center mb-3">
              <img
                src={selectedUser.avatar_url || "https://via.placeholder.com/100"}
                alt={`${selectedUser.username}'s avatar`}
                style={{ width: 100, height: 100, borderRadius: "50%" }}
              />
            </div>
            <p><strong>Username:</strong> {selectedUser.username}</p>
            {/* Add more details here */}

            <Button variant="primary" onClick={handleMessageUser} className="me-2">
              Message
            </Button>
            <Button variant="secondary" onClick={() => setSelectedUser(null)}>
              Back to results
            </Button>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default UserSearchLogic;
