import React, { useState, useEffect } from "react";
import { House, Trophy, Settings, HelpCircle, MessageSquare, DollarSign, Menu } from "lucide-react";
import { supabase } from "../supabaseClient";

const SideNavbar = () => {
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setExpanded(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages", // 👈 change to your table name
        },
        (payload) => {
          console.log("New message: ", payload);
          setNewMessagesCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleSidebar = () => {
    setExpanded(!expanded);
  };

  const handleLinkClick = () => {
    if (isMobile) setExpanded(false);
    // Reset count when opening messages
    setNewMessagesCount(0);
  };

  return (
    <>
      {isMobile && (
        <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <Menu />
        </button>
      )}

      <div className={`sidebar ${expanded ? "expanded" : ""}`}>
        <a href="/myzone" className="nav-link" onClick={handleLinkClick}>
          <House className="icon" />
          <span className="nav-text">My Zone</span>
        </a>

        <a href="/tournaments" className="nav-link" onClick={handleLinkClick}>
          <Trophy className="icon" />
          <span className="nav-text">Tournaments</span>
        </a>

        {/* Messages with badge */}
        <a href="/privatechat" className="nav-link relative" onClick={handleLinkClick} style={{ position: "relative" }}>
          <MessageSquare className="icon" />
          {newMessagesCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                backgroundColor: "red",
                color: "white",
                borderRadius: "50%",
                fontSize: "12px",
                minWidth: "18px",
                height: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 5px",
                fontWeight: "bold",
              }}
            >
              {newMessagesCount}
            </span>
          )}
          <span className="nav-text">Messages</span>
        </a>

        <a href="/wallet" className="nav-link" onClick={handleLinkClick}>
          <DollarSign className="icon" />
          <span className="nav-text">Wallet</span>
        </a>

        <a href="/account" className="nav-link" onClick={handleLinkClick}>
          <Settings className="icon" />
          <span className="nav-text">Account</span>
        </a>

        <a href="/help" className="nav-link" onClick={handleLinkClick}>
          <HelpCircle className="icon" />
          <span className="nav-text">Help</span>
        </a>
      </div>
    </>
  );
};

export default SideNavbar;
