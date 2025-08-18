import React, { useState, useEffect } from "react";
import { Navbar, Container, Nav } from "react-bootstrap";
import { Menu, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import OnlineUsersModal from "../Pages/OnlineUsersModal";
import UserSearchLogic from "../Pages/UserSearchLogic";
import { supabase } from "../supabaseClient"; // import supabase client
import PublicChatModal from "../Pages/PublicChatModal";

const TopNavbar = ({ onOpenPublicChat }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [searchUsers, setSearchUsers] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  // Fetch username from Supabase
  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (user) {
          const { data, error } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .single();

          if (error) throw error;
          if (data) {
            setUsername(data.username);
          }
        }
      } catch (err) {
        console.error("Error fetching username:", err.message);
      }
    };

    fetchUsername();
  }, []);

  return (
    <>
      <Navbar
        variant="dark"
        expand="lg"
        fixed="top"
        className="px-3 border-bottom border-secondary"
        style={{ backgroundColor: "#0a0a0a" }}
      >
        <Container fluid>
          {/* Logo & Name */}
          <Navbar.Brand href="/" className="d-flex align-items-center text-neon" id="top-nav">
            <img
              src="https://res.cloudinary.com/dm7edtofj/image/upload/v1754505778/logo_suleug.svg"
              alt="Logo"
              width="40"
              height="40"
              style={{ filter: "invert(1)" }}
              className="d-inline-block align-top me-2"
            />
            <h1 className="">NoctaZone</h1>
          </Navbar.Brand>

          {/* Hamburger toggle */}
          <Navbar.Toggle
            aria-controls="navbar-nav"
            className="border-0"
            children={<Menu size={22} color="#00ffcc" />}
          />

          {/* Collapsible menu */}
          <Navbar.Collapse id="navbar-nav" className="bg=#111 p-3 p-lg-0">
            <Nav className="ms-auto align-items-lg-center">
              <Nav.Link href="/wallet" className="text-light">
                💰 KSh 0.00
              </Nav.Link>
              <Nav.Link onClick={() => setShowOnlineUsers(true)} className="text-success">
                👥 Online Users
              </Nav.Link>
              <Nav.Link onClick={() => setSearchUsers(true)} className="text-success">
                👥 Search Users
              </Nav.Link>
              <Nav.Link href="/account" className="text-light">
                {username || "Welcome..."}
              </Nav.Link>
              <Nav.Link
                href="#"
                className="text-info d-flex align-items-center"                
                onClick={() => setShowChatModal(true)} onClose={() => setShowChatModal(false)} >  
                   
                <MessageCircle size={18} className="me-1" />
                Public Chat
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Modals */}
      <OnlineUsersModal
        show={showOnlineUsers}
        onClose={() => setShowOnlineUsers(false)}
      />
      <UserSearchLogic
        show={searchUsers}
        onClose={() => setSearchUsers(false)}
      />
      
      <PublicChatModal
        // currentUser={currentUser} 
        showModal={showChatModal} 
        onClose={() => setShowChatModal(false)} 
      />
    </>
  );
};

export default TopNavbar;
