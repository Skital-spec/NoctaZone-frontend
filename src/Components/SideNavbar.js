import React, { useState, useEffect } from "react";
import { House, Trophy, Settings, HelpCircle, MessageSquare, DollarSign, Menu } from "lucide-react";
import { supabase } from "../supabaseClient";

const SideNavbar = () => {
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [userId, setUserId] = useState(null);

  // Get logged-in user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      }
    };
    getUser();
  }, []);

  // Fetch unread messages count on load
  useEffect(() => {
    if (!userId) return;

    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from("private_messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("is_read", false); // 👈 adjust column name if different

      if (!error && count !== null) {
        setNewMessagesCount(count);
      }
    };

    fetchUnreadCount();
  }, [userId]);

  // Subscribe to new messages
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
        },
        (payload) => {
          const newMessage = payload.new;
          if (newMessage.receiver_id === userId) {
            setNewMessagesCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const toggleSidebar = () => {
    setExpanded(!expanded);
  };

  const handleLinkClick = (path) => {
    if (isMobile) setExpanded(false);

    // Reset badge only when navigating to messages
    if (path === "/privatechat") {
      setNewMessagesCount(0);

      // Mark messages as read in DB (optional, depends on your flow)
      supabase
        .from("private_messages")
        .update({ is_read: true })
        .eq("receiver_id", userId)
        .eq("is_read", false);
    }
  };

  return (
    <>
      {isMobile && (
        <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <Menu />
        </button>
      )}

      <div className={`sidebar ${expanded ? "expanded" : ""}`}>
        <a href="/myzone" className="nav-link" onClick={() => handleLinkClick("/myzone")}>
          <House className="icon" />
          <span className="nav-text">My Zone</span>
        </a>

        <a href="/tournaments" className="nav-link" onClick={() => handleLinkClick("/tournaments")}>
          <Trophy className="icon" />
          <span className="nav-text">Tournaments</span>
        </a>

        {/* Messages with badge */}
        <a
          href="/privatechat"
          className="nav-link relative"
          onClick={() => handleLinkClick("/privatechat")}
          style={{ position: "relative" }}
        >
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
              {newMessagesCount > 99 ? "99+" : newMessagesCount}
            </span>
          )}
          <span className="nav-text">Messages</span>
        </a>

        <a href="/wallet" className="nav-link" onClick={() => handleLinkClick("/wallet")}>
          <DollarSign className="icon" />
          <span className="nav-text">Wallet</span>
        </a>

        <a href="/account" className="nav-link" onClick={() => handleLinkClick("/account")}>
          <Settings className="icon" />
          <span className="nav-text">Account</span>
        </a>

        <a href="/help" className="nav-link" onClick={() => handleLinkClick("/help")}>
          <HelpCircle className="icon" />
          <span className="nav-text">Help</span>
        </a>
      </div>
    </>
  );
};

export default SideNavbar;
