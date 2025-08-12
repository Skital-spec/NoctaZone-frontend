import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const HowItWorks = () => (
  <div>
    {/* Navbar */}
    <nav className="navbar navbar-expand-lg navbar-light bg-light mb-4">
      <div className="container">
        <a className="navbar-brand" href="/">YourBrand</a>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#hwNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="hwNav">
          <ul className="navbar-nav ms-auto">
            {['1v1 Matches','Tournaments','Team Matches','1‑Day Tournaments','Leaderboard','1‑Day Explanation'].map((text) => (
              <li className="nav-item" key={text}>
                <a className="nav-link" href={`#${text.toLowerCase().replace(/\s+/g, '-')}`}>{text}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>

    <div className="container">
      {/* Section Templates */}
      {[
        { id: '1v1-matches', title: '1v1 Matches' },
        { id: 'tournaments', title: 'Tournaments' },
        { id: 'team-matches', title: 'Team Matches' },
        { id: '1-day-tournaments', title: '1‑Day Tournaments' },
        { id: 'leaderboard', title: 'Leaderboard' },
        { id: '1-day-explanation', title: '1‑Day Tournaments: How They Work' },
      ].map(section => (
        <section id={section.id} className="mb-5" key={section.id}>
          <h2>{section.title}</h2>
          {/* Placeholder for image */}
          <div className="mb-3" style={{ width: '100%', height: '200px', backgroundColor: '#ddd', borderRadius: '8px' }}>
            <p className="text-center pt-5 text-muted">[ Upload {section.title} Image ]</p>
          </div>
          {/* Placeholder for description */}
          <p>[ Insert explanation text for {section.title}. Describe steps or process here. ]</p>
        </section>
      ))}

    </div>
  </div>
);

export default HowItWorks;
