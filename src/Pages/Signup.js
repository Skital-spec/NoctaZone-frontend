import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [over18, setOver18] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const isOver18 = () => {
    const birthDate = new Date(`${birthYear}-${birthMonth}-${birthDay}`);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;
    return age >= 18;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (!isOver18()) {
        setMessage('You must be over 18 to sign up.');
        return;
      }

      if (email !== confirmEmail) {
        setMessage('Emails do not match.');
        return;
      }

      if (!over18) {
        setMessage('You must confirm you are over 18 and agree to the terms.');
        return;
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      setMessage('Account created! Please check your email to verify.');
      navigate('/login'); // Redirect to login after email verification
    } catch (error) {
      console.error('Signup error:', error);
      setMessage(error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  return (
    <div className="signup-container">
      <h1>Create Your NoctaZone Account</h1>
      <form onSubmit={handleSignup}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="email" placeholder="Re-type Email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} required autoComplete="email" />
        <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />

        <div className="birthdate-section">
          <label>Birthdate:</label>
          <div className="birthdate-selects">
            <select value={birthDay} onChange={(e) => setBirthDay(e.target.value)} required>
              <option value="">Day</option>
              {days.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} required>
              <option value="">Month</option>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)} required>
              <option value="">Year</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <p className="note">
          To be a member of NoctaZone.com you must enter your location and birthdate.
          This is needed to verify that it is legal for you to participate in games of skill
          for cash prizes on our website.
        </p>

        <div className="checkbox-section">
          <input type="checkbox" id="over18" checked={over18} onChange={(e) => setOver18(e.target.checked)} required />
          <label htmlFor="over18">
            I AM OVER 18 YEARS OLD AND DO NOT HAVE AN ACCOUNT.
            I AGREE TO THE TERMS OF USE, PRIVACY & COOKIES POLICY.
          </label>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>

      <p className="mt-3 text-center text-light">
        Already have an account?{' '}
        <a href="/login" style={{ color: '#00ffcc' }}>
          Login
        </a>
      </p>

      {message && <p className="signup-message">{message}</p>}

      <footer className="signup-footer-links">
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

export default Signup;