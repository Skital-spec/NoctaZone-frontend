import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ import navigation
import { supabase } from '../supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const navigate = useNavigate(); // ✅ create navigation hook

const handleLogin = async (e) => {
  e.preventDefault();
  setMessage('');

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes('Email not confirmed')) {
      setMessage('Please confirm your email before logging in. Check your inbox or spam folder.');
    } else {
      setMessage(error.message);
    }
  } else {
    setMessage('Logged in successfully!');
    navigate('/account');
  }
};

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      setMessage('Please enter your email for password reset.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) setMessage(error.message);
    else setMessage('Password reset link sent. Check your email.');
  };

  return (
    <div className="login-container">
      <h1 className="login-heading">Log In to NoctaZone</h1>

      <form className="login-form" onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete='email'
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password" 

        />

        <button type="submit">Log In</button>
      </form>

      <div className="login-footer-text">
        Don’t have an account? <a href="/signup">Sign up here</a>
      </div>

      <div className="button-row">
        <button
          className="link-button"
          onClick={() => setShowForgotPassword(!showForgotPassword)}
        >
          Forgot Password?
        </button>

        <a href="/howitworks">
          <button className="how-it-works-btn">How It Works</button>
        </a>
      </div>

      {showForgotPassword && (
        <div className="forgot-password-form">
          <input
            type="email"
            placeholder="Enter your email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
          />
          <button className="reset-btn" onClick={handleForgotPassword}>
            Send Reset Link
          </button>
        </div>
      )}

      {message && <p className="login-message">{message}</p>}

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

export default Login;
