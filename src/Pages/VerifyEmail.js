import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const VerifyEmail = () => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const openGmail = () => {
    window.open("https://mail.google.com", "_blank");
  };

  const handleResend = async () => {
    setLoading(true);
    setMessage('');

    try {
      // ✅ get the logged-in user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user?.email, // ✅ correctly fetches the email
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) throw error;

      setMessage('Verification email resent! Check your inbox.');
    } catch (err) {
      setMessage(err.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Logo + Heading */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <img
          src="https://res.cloudinary.com/dm7edtofj/image/upload/v1754505778/logo_suleug.svg"
          alt="Logo"
          style={{ filter: 'invert(1)', width: "80px", marginBottom: "10px" }}
        />
        <h1 className="login-heading">Verify Your Email</h1>
      </div>

      {/* Main Message */}
      <div style={{ textAlign: "center", color: "#ccc", marginBottom: "25px" }}>
        <p>
          We’ve sent a verification link to your email.
          Please check your inbox (or spam folder) to activate your account.
        </p>
      </div>
      
      {/* Action Buttons */}
      <div className="button-row">
        <button className="link-button" onClick={openGmail}>
          Open Gmail
        </button>
        <button 
          className="how-it-works-btn" 
          onClick={handleResend}
          disabled={loading}
        >
          {loading ? 'Resending...' : 'Resend Email'}
        </button>
        <button 
          className="how-it-works-btn" 
          onClick={() => navigate('/login')}
        >
          Back to Login
        </button>
      </div>

      {/* Response Message */}
      {message && <p className="login-message">{message}</p>}

      {/* Footer */}
      <footer className="login-footer-links">
        <div className="footer-links">
          <a href="/privacypolicy">Privacy Policy</a>
          <a href="/termsofuse">Terms of Use</a>
          <a href="/supportpage">Contact Us</a>
        </div>
        <p className="copyright">
          &copy; {new Date().getFullYear()} NoctaZone. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default VerifyEmail;
