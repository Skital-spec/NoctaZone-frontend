import React, { useState, useEffect } from "react";
import { House, Trophy, Settings, HelpCircle, MessageSquare, DollarSign, Menu } from "lucide-react";

const SideNavbar = () => {
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setExpanded(false); // reset sidebar state on desktop
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setExpanded(!expanded);
  };

  const handleLinkClick = () => {
    if (isMobile) setExpanded(false);
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
        <a href="/privatechat" className="nav-link" onClick={handleLinkClick}>
          <MessageSquare className="icon" />
          <span className="nav-text">Messages</span>
        </a>
        <a href="/help" className="nav-link" onClick={handleLinkClick}>
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
