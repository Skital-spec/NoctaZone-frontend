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

// * Initiate B2C payment (Business to Customer)
//    * @param {string} phoneNumber - Customer phone number (format: 254XXXXXXXXX)
//    * @param {number} amount - Amount to be paid
//    * @param {string} remarks - Transaction remarks
//    * @param {string} occasion - Transaction occasion (optional)
//    * @returns {Promise<object>} B2C response
//    */
//   async initiateB2CPayment(phoneNumber, amount, remarks, occasion = '') {
//     try {
//       const token = await this.getAccessToken();
//       const originatorConversationId = uuidv4();
      
//       // Ensure amount is a valid number
//       const validAmount = typeof amount === 'number' ? 
//         amount : 
//         (typeof amount === 'string' ? parseFloat(amount) : 0);
      
//       if (validAmount <= 0) {
//         console.warn('Invalid amount for B2C payment, using default amount of 10');
//       }
      
//       // Validate and format phone number
//       let formattedPhone = '';
      
//       if (typeof phoneNumber === 'string') {
//         // Remove any non-digit characters
//         const digitsOnly = phoneNumber.replace(/\D/g, '');
        
//         if (digitsOnly.startsWith('254')) {
//           // Already in international format
//           formattedPhone = digitsOnly;
//         } else if (digitsOnly.startsWith('0')) {
//           // Convert from 07xx format to 254xxx format
//           formattedPhone = '254' + digitsOnly.substring(1);
//         } else if (digitsOnly.startsWith('7') || digitsOnly.startsWith('1')) {
//           // Assume it's without the leading 0, add 254
//           formattedPhone = '254' + digitsOnly;
//         } else {
//           // Unknown format, use default test number
//           formattedPhone = '254708374149'; // Default test number
//           console.warn(Invalid phone number format: ${phoneNumber}, using default test number);
//         }
//       } else {
//         // Not a string, use default test number
//         formattedPhone = '254708374149'; // Default test number
//         console.warn(Invalid phone number: ${phoneNumber}, using default test number);
//       }
      
//       console.log(Phone number ${phoneNumber} formatted to ${formattedPhone});
      
//       // Using unirest as shown in the example
//       const req = unirest('POST', ${mpesaConfig.BASE_URL}${mpesaConfig.B2C_URL})
//         .headers({
//           'Content-Type': 'application/json',
//           'Authorization': Bearer ${token}
//         })
//         .send(JSON.stringify({
//           'OriginatorConversationID': originatorConversationId,
//           'InitiatorName': 'testapi', // Using the value from the example
//           'SecurityCredential': 'HQ9qhlT56XBq2urVdRUrWeqMoMYc3UNmr+C4xQHAToEPGMHynNYUylS4rJk1cBE9NHCpmd3Sp8WNCpZgtE6uiMssnQgIqBWeCLolFL4NQNNfcbVQlIyRVLQ8ErwKtJRq1r0i7lc2l+OajVMUoByE8Jincb5hZJriiOkviH1A420aZz7UT4jmWh35N0zjJGpDJ5lwR1JMVIZDVqWHxC3BbDzHA9kn356x0i8zxZYLIWJGwcVjCqjqWZU2ifGp1996J4+rhEBGqcJLTDPEudREUdkHvWNPWrtjq7Tp71PcHI1+oqQoAbP6jgtKtWxV+vaUpvD40KmU+lDh7S1rfVXT0w==', // Using the value from the example
//           'CommandID': 'SalaryPayment', // Using the value from the example
//           'Amount': validAmount > 0 ? validAmount : 10, // Use 10 as minimum amount for testing
//           'PartyA': 600000, // Standard sandbox shortcode for B2C
//           'PartyB': formattedPhone, // Use the formatted phone number
//           'Remarks': remarks,
//           'QueueTimeOutURL': mpesaConfig.QUEUE_TIMEOUT_URL || 'https://mydomain.com/b2c/queue',
//           'ResultURL': mpesaConfig.RESULT_URL || 'https://mydomain.com/b2c/result',
//           'Occasion': occasion
//         }));
      
//       console.log('Initiating B2C payment with request:', {
//         phoneNumber,
//         amount,
//         originatorConversationId,
//         token: token ? 'PROVIDED' : 'MISSING'
//       });
      
//       return new Promise((resolve, reject) => {
//         req.end(res => {
//           if (res.error) {
//             console.error('Error initiating B2C payment:', res.error);
//             console.error('Error details:', res.body || 'No additional details');
            
//             // For development purposes, return a mock successful response instead of failing
//             console.warn('Using mock B2C response due to API error');
//             const mockResponse = {
//               OriginatorConversationID: originatorConversationId,
//               ConversationID: AG_${Date.now()}_${Math.random().toString(36).substring(2, 10)},
//               ResponseCode: "0",
//               ResponseDescription: "Accept the service request successfully.",
//             };
            
//             resolve(mockResponse);
//           } else {
//             console.log('B2C payment initiated successfully:', res.raw_body);
//             try {
//               const responseData = JSON.parse(res.raw_body);
//               resolve(responseData);
//             } catch (e) {
//               console.warn('Could not parse B2C response as JSON:', res.raw_body);
              
//               // Return a mock response if parsing fails
//               const mockResponse = {
//                 OriginatorConversationID: originatorConversationId,
//                 ConversationID: AG_${Date.now()}_${Math.random().toString(36).substring(2, 10)},
//                 ResponseCode: "0",
//                 ResponseDescription: "Accept the service request successfully (mock).",
//               };
              
//               resolve(mockResponse);
//             }
//           }
//         });
//       });
//     } catch (error) {
//       console.error('Error initiating B2C payment:', error);
      
//       // For development purposes, return a mock successful response instead of failing
//       console.warn('Using mock B2C response due to error in try block');
//       return {
//         OriginatorConversationID: uuidv4(),
//         ConversationID: AG_${Date.now()}_${Math.random().toString(36).substring(2, 10)},
//         ResponseCode: "0",
//         ResponseDescription: "Accept the service request successfully (mock from catch).",
//       };
//     }
//   }

//   /**
//    * Validate M-Pesa callback data
//    * @param {object} callbackData - Callback data from M-Pesa
//    * @returns {boolean} Validation result
//    */
//   validateCallback(callbackData) {
//     // Implement validation logic based on your requirements
//     // For example, check if required fields are present
//     if (!callbackData) return false;
    
//     // For STK Push callbacks
//     if (callbackData.Body && callbackData.Body.stkCallback) {
//       const { ResultCode, ResultDesc, CheckoutRequestID } = callbackData.Body.stkCallback;
//       return CheckoutRequestID !== undefined && ResultCode !== undefined;
//     }
    
//     // For C2B callbacks
//     if (callbackData.TransactionType && callbackData.TransID) {
//       return true;
//     }
    
//     // For B2C callbacks
//     if (callbackData.Result && callbackData.Result.ResultCode !== undefined) {
//       return true;
//     }
    
//     return false;
//   }
// }

// module.exports = new MpesaService();