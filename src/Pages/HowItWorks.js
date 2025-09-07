import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link } from "react-router-dom";
import { Navbar } from "react-bootstrap";

const HowItWorks = () => {
  const sections = [
    {
      id: "1v1-matches",
      title: "1v1 Matches",
      content: (
        <>
          In a 1v1 match, two players go head-to-head in a private or public
          challenge. Here’s how it works:
          <br />
          <br />
          <strong>1. Create a Challenge –</strong> Set up a private challenge for
          a specific player or post it publicly for anyone in the community to
          accept.
          <br />
          <strong>2. Challenge Accepted –</strong> Once another player accepts,
          you both connect through NoctaZone’s messaging to agree on the match
          time.
          <br />
          <strong>3. Share Match Code –</strong> The host sends the game code
          (for titles like <em>eFootball</em>, <em>Call of Duty</em>, etc.) so
          both players can join the same match.
          <br />
          <strong>4. Play the Match –</strong> Compete fairly and give it your
          best shot.
          <br />
          <strong>5. Report Results –</strong> After the match, both players
          report the outcome. The winner is confirmed based on the final score.
          <br />
          <br />
          ⚡ These matches are quick, competitive, and the best way to test your
          skills directly against another player.
          <br />
          <br />
          <span style={{ color: "#ff0000", fontWeight: "bold" }}>NB: </span>
          <span style={{ color: "#00ffcc", fontWeight: "bold" }}>
            If you send a private challenge and it is declined, your stake will
            be refunded.
          </span>
          <br />
          <span style={{ color: "#00ffcc", fontWeight: "bold" }}>
            For private challenges, if it’s not accepted within 12 hours, the
            match is cancelled and your stake refunded.
          </span>
          <br />
          <span style={{ color: "#00ffcc", fontWeight: "bold" }}>
            For public challenges, if not accepted within 24 hours, the match is
            deemed expired and your stake refunded.
          </span>
        </>
      ),
    },
    {
      id: "tournaments",
      title: "Tournaments",
      content: (
        <>
          Compete in structured tournaments where only the best advance. Each
          tournament has multiple rounds, and players battle it out until a
          champion is crowned. Prizes, rankings, and glory await those who make
          it to the top.
          <br />
          <br />
          <strong>How it works:</strong>
          <br />• Register for a tournament before it begins.
          <br />• Get matched with opponents each round.
          <br />• Play and report results.
          <br />• Winners progress, losers are eliminated.
          <br />• Final match decides the champion!
        </>
      ),
    },
    {
      id: "leaderboard",
      title: "Leaderboard",
      content: (
        <>
          Track your performance across all matches and tournaments. The
          leaderboard shows:
          <br />• Top players in the NoctaZone community.
          <br />
          Climb higher to prove yourself among the best.
        </>
      ),
    },
  ];

  return (
    <div
      style={{ backgroundColor: "#0a0a0a", minHeight: "100vh", color: "#fff" }}
    >
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
            <h1
              className="m-0"
              style={{ color: "#00ffcc", fontSize: "1.5rem" }}
            >
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
              {sections.map((s) => (
                <li className="nav-item" key={s.id}>
                  <a
                    className="nav-link"
                    href={`#${s.id}`}
                    style={{ color: "#00ffcc" }}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Navbar>

      <div className="container">
        {/* Intro */}
        <div className="mb-5 text-center">
          <h2 style={{ color: "#00ffcc" }}>Welcome to NoctaZone</h2>
          <p className="lead">
            NoctaZone is your ultimate hub for competitive gaming. Whether
            you’re into intense <strong>1v1 battles</strong>, large-scale{" "}
            <strong>tournaments</strong>, or quick{" "}
            <strong>one-day challenges</strong>, we’ve built a platform where
            skill, strategy, and community come together. Track your progress,
            climb leaderboards, and prove yourself as a true gamer.
          </p>
        </div>

        {/* Sections */}
        {sections.map((section) => (
          <section id={section.id} className="mb-5" key={section.id}>
            <h2 style={{ color: "#00ffcc" }}>{section.title}</h2>
            <div
              className="p-4"
              style={{
                backgroundColor: "#1a1a1a",
                borderRadius: "8px",
                border: "2px solid #00ffcc",
              }}
            >
              <p>{section.content}</p>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default HowItWorks;
