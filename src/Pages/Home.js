import React , {useEffect, useRef}from 'react'
import { Typewriter } from 'react-simple-typewriter';
import CustomNavbar from '../Components/CustomNavbar';
import { useNavigate } from 'react-router-dom';
import TournamentsCarousel from '../Components/TournamentsCarousel';

function Home() {
  const navigate = useNavigate();
    const stepsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            observer.unobserve(entry.target); // Only animate once
          }
        });
      },
      {
        threshold: 0.2, // Adjust based on when you want it to trigger
      }
    );

    stepsRef.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
  return (
    <>
<CustomNavbar />

<div className="page-one no-video-bg"> 
  <div className="overlay-content">
    <h1 className="animated-title">Turn Your Gaming Skill <br /> Into Instant Cash</h1>
    <h2>
      C<span>
        <Typewriter
          words={["ompete, win and withdraw in minutes"]}
          loop={Infinity}
          cursor
          cursorStyle="|"
          typeSpeed={70}
          deleteSpeed={50}
          delaySpeed={1000}
        />
      </span>
    </h2>
    <h2>The battleground for the skilled. Are you ready?</h2>

    {/* Centered custom button */}
    <div className="centered-cta"   onClick={() => navigate('/signup')}>      
      <div className="cta-hover-container">
        <div className="logo-box">
          <img src="https://res.cloudinary.com/dm7edtofj/image/upload/v1754505778/logo_suleug.svg" alt="Logo" />
        </div>
        <span className="cta-text">Signup</span>
      </div>
    </div>
  </div>
</div>

<div className="page-two">
  <div className="video-section">
    <video
      className="video-player"
      autoPlay
      loop
      muted
      playsInline
    >
      <source src="https://res.cloudinary.com/dm7edtofj/video/upload/v1754509418/large-thumbnail20240205-16489-16byu7t_oazwvq.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>

    <div className="quote-box">
      <p>
        “NoctaZone is where skill speaks. No luck. Just pure gaming strategy and grind.<br/>
        Win real money playing your favorite games with people all over East Africa.”
      </p>
    </div>
  </div>
</div>
 <div className="page-three">
      <h2 className="section-title">How It Works</h2>
      <div className="steps-container">
        <div
          className="step-card slide-in-left"
          ref={(el) => (stepsRef.current[0] = el)}
        >
          <span className="material-icons step-icon">credit_card</span>
          <h3>Step 1: Fund Your Account</h3>
          <p>We accept card and mobile money.</p>
        </div>

        <div
          className="step-card slide-in-bottom"
          ref={(el) => (stepsRef.current[1] = el)}
        >
          <span className="material-icons step-icon">sports_esports</span>
          <h3>Step 2: Play a Game</h3>
          <p>Link up, play, and report your results.</p>
        </div>

        <div
          className="step-card slide-in-right"
          ref={(el) => (stepsRef.current[2] = el)}
        >
          <span className="material-icons step-icon">monetization_on</span>
          <h3>Step 3: Get Paid</h3>
          <p>The winner receives the cash prize.</p>
        </div>
      </div>
    </div>

    <TournamentsCarousel />


  <footer className="noctazone-footer">
  {/* Social Media Icons */}
  <div className="footer-social">
    <a href="https://www.instagram.com/noctazonegamers/" target="_blank"
        rel="noopener noreferrer"><i className="fab fa-instagram"></i></a>

    <a href="https://www.x.com/@noctazonegamers" target="_blank"
    rel="noopener noreferrer"><i className="fab fa-twitter"></i></a>

     <a href="https://www.tiktok.com/@noctazonegamers" target="_blank"
        rel="noopener noreferrer"><i className="fab fa-tiktok"></i></a>

    <a href="https://www.facebook.com/groups/789814063516963" target="_blank"
    rel="noopener noreferrer"><i className="fab fa-facebook"></i></a>

    <a href="https://www.youtube.com/@Noctazonegamers" target="_blank"
        rel="noopener noreferrer"><i className="fab fa-youtube"></i></a>
  </div>

  {/* Branding Info */}
  <div className="footer-info">
    <p>POWERED BY NOCTAZONE</p>
    <p>©2025 NOCTAZONE™. ALL RIGHTS RESERVED</p>

    {/* Legal and Help Links */}
    <div className="footer-legal-links">
      <a href="/howitworks">HOW IT WORKS</a> / <a href="/supportpage">SUPPORT</a>  / 
      <a href="/termsofuse">TERMS</a> / <a href="/privacypolicy">PRIVACY</a>  / 
      <a href="/about">ABOUT US</a> / <a href="/responsiblegaming">RESPONSIBLE GAMING</a>
    </div>

    {/* Responsible Gaming Warning */}
    <p className="footer-warning">
      Gaming too much? If you or someone you know is struggling, call or text the Problem Gaming Helpline: 
      <strong> 0726883960 </strong> or visit <a href="https://gamhelpkenya.com/services/gambling-oversight/" target="_blank" rel="noopener noreferrer">gamhelpkenya</a>.
    </p>
  </div>
{/* Gaming icons */}
  <div className="footer-icons">
  <img src="https://img.icons8.com/ios-filled/50/ffffff/18-plus.png" alt="18+" />
  <img src="https://img.icons8.com/color/48/fortnite.png" alt="Fortnite" />
  <img src="https://img.icons8.com/color/48/pubg.png" alt="PUBG" />
  <img src="https://img.icons8.com/color/48/minecraft-logo.png" alt="Minecraft" />
  <img src="https://img.icons8.com/color/48/league-of-legends.png" alt="League of Legends" />
</div>

  {/* Bottom Text */}
  <p className="footer-small-text">
    NoctaZone empowers competitive gamers to monetize their skill. All logos are property of their owners. Play responsibly.
  </p>
</footer>

    </>
  )
}
export default Home
 