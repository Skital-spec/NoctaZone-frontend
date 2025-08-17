import React, { useState } from "react";
import { Container, Button } from "react-bootstrap";
import { Gamepad, Search, Clock, Trophy, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../Components/MainLayout";

const MyZone = () => {
  const [activeTab, setActiveTab] = useState("matches");
  const navigate = useNavigate();

  const tabs = [
    { id: "matches", label: "My Matches", icon: <Gamepad size={18} /> },
    { id: "find", label: "Find a Match", icon: <Search size={18} /> },
    { id: "history", label: "Match History", icon: <Clock size={18} /> },
    { id: "tournaments", label: "My Tournaments", icon: <Trophy size={18} /> },
  ];

  const handleCreateChallenge = () => {
    navigate("/createchallenge");
  };

  return (
    <MainLayout>
      <div className="myzone-page">
        {/* Navbar Tabs */}
        <div className="myzone-tabs flex-nowrap">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`myzone-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span style={{ marginLeft: "6px" }}>{tab.label}</span>
              {activeTab === tab.id && <div className="tab-arrow" />}
            </div>
          ))}
        </div>

        <Container className="py-4">
          {activeTab === "matches" && (
            <div className="tab-content">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>My Matches</h2>
                <Button 
                  variant="primary" 
                  onClick={handleCreateChallenge}
                  className="d-flex align-items-center"
                >
                  <Plus size={18} className="me-2" />
                  Create Match Challenge
                </Button>
              </div>
              <p>Create challenges, track matches, and compete with other players.</p>
            </div>
          )}

          {activeTab === "find" && (
            <div className="tab-content">
              <h2>Find a Match</h2>
              <p>Browse available matches and join the ones that interest you.</p>
            </div>
          )}

          {activeTab === "history" && (
            <div className="tab-content">
              <h2>Match History</h2>
              <p>View the results and stats of your previous matches.</p>
            </div>
          )}

          {activeTab === "tournaments" && (
            <div className="tab-content">
              <h2>My Tournaments</h2>
              <p>See all the tournaments you are participating in or have completed.</p>
            </div>
          )}
        </Container>
      </div>
    </MainLayout>
  );
};

export default MyZone;