import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link } from "react-router-dom";
import { Navbar } from "react-bootstrap";

const HowItWorks = () => (
  <div style={{ backgroundColor: "#0a0a0a", minHeight: "100vh", color: "#fff" }}>
    {/* Navbar */}
    <Navbar expand="lg" className="mb-4" style={{ backgroundColor: "#0f0f0f" }}>
      <div className="container">
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <img
            src="https://res.cloudinary.com/dm7edtofj/image/upload/v1754505778/logo_suleug.svg"
            alt="Logo"
            width="40"
            height="40"
            style={{ filter: "invert(1)" }}
            className="d-inline-block align-top me-2"
          />
          <h1 className="m-0" style={{ color: "#00ffcc", fontSize: "1.5rem" }}>
            NoctaZone
          </h1>
        </Navbar.Brand>

        <button
          className="navbar-toggler bg-light"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#hwNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="hwNav">
          <ul className="navbar-nav ms-auto">
            {[
              "1v1 Matches",
              "Tournaments",
              "Team Matches",
              "1-Day Tournaments",
              "Leaderboard",
              "1-Day Explanation",
            ].map((text) => (
              <li className="nav-item" key={text}>
                <a
                  className="nav-link"
                  href={`#${text.toLowerCase().replace(/\s+/g, "-")}`}
                  style={{ color: "#00ffcc" }}
                >
                  {text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Navbar>

    <div className="container">
      {/* Intro about Noctazone */}
      <div className="mb-5 text-center">
        <h2 style={{ color: "#00ffcc" }}>Welcome to NoctaZone</h2>
        <p className="lead">
          NoctaZone is your ultimate hub for competitive gaming. Whether you’re
          into intense **1v1 battles**, large-scale **tournaments**, or quick
          **one-day challenges**, we’ve built a platform where skill, strategy,
          and community come together.  
          Track your progress, climb leaderboards, and prove yourself as a true
          gamer.
        </p>
      </div>

      {/* Section Templates */}
      {[
        { id: "1v1-matches", title: "1v1 Matches", desc: "Challenge your friends or random players in fast-paced 1v1 duels. Prove your skills and climb your personal ranking." },
        { id: "tournaments", title: "Tournaments", desc: "Compete in structured tournaments where only the best advance. Win prizes and recognition across the NoctaZone community." },
        { id: "team-matches", title: "Team Matches", desc: "Join forces with teammates for squad battles. Strategy, communication, and synergy matter most here." },
        { id: "1-day-tournaments", title: "1-Day Tournaments", desc: "Short, high-intensity competitions designed to fit into a single day. Perfect for gamers who want action-packed challenges without long commitments." },
        { id: "leaderboard", title: "Leaderboard", desc: "Track your performance across all matches and tournaments. The leaderboard showcases the top players in NoctaZone." },
        { id: "1-day-explanation", title: "1-Day Tournaments: How They Work", desc: "Players join at the start of the day, matches run in quick rounds, and a winner is crowned by the end of the same day. Fast, fair, and thrilling." },
      ].map((section) => (
        <section id={section.id} className="mb-5" key={section.id}>
          <h2 style={{ color: "#00ffcc" }}>{section.title}</h2>
          {/* Placeholder for image */}
          <div
            className="mb-3"
            style={{
              width: "100%",
              height: "200px",
              backgroundColor: "#1a1a1a",
              borderRadius: "8px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              border: "2px dashed #00ffcc",
            }}
          >
            <p className="text-muted">[ Upload {section.title} Image ]</p>
          </div>
          {/* Section description */}
          <p>{section.desc}</p>
        </section>
      ))}
    </div>
  </div>
);

export default HowItWorks;
