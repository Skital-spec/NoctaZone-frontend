import React, { useState } from 'react';

const SimpleMpesaPayment = () => {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const formatPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) return '254' + cleaned.substring(1);
    if (cleaned.startsWith('254')) return cleaned;
    if (cleaned.startsWith('7') || cleaned.startsWith('1')) return '254' + cleaned;
    return cleaned;
  };

  const initiatePayment = async () => {
    if (!phone || !amount) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formatPhone(phone),
          amount: parseFloat(amount)
        })
      });

      if (response.ok) {
        const result = await response.text();
        setTransactionRef(result);
        setStatus('pending');
      } else {
        setError('Payment failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!transactionRef) return;

    try {
      const response = await fetch(`http://localhost:5000/transactionstatus?mpesaReceiptNumber=${transactionRef}`);
      const result = await response.json();

      if (result.ResultCode === '0') {
        setStatus('success');
      } else if (result.ResultCode === '1032') {
        setStatus('cancelled');
      } else {
        setStatus('failed');
      }
    } catch (err) {
      setError('Status check failed');
    }
  };

  const reset = () => {
    setPhone('');
    setAmount('');
    setTransactionRef('');
    setStatus('');
    setError('');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h2>M-Pesa Payment</h2>
      
      {!transactionRef ? (
        <div>
          <div>
            <label>Phone Number:</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712345678"
              style={{ width: '100%', padding: '8px', margin: '5px 0' }}
            />
          </div>

          <div>
            <label>Amount (KES):</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              style={{ width: '100%', padding: '8px', margin: '5px 0' }}
            />
          </div>
          {error && <div style={{ color: 'red', margin: '10px 0' }}>{error}</div>}
          <button
            onClick={initiatePayment}
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '10px', 
              margin: '10px 0',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Processing...' : 'Pay with M-Pesa'}
          </button>
        </div>
      ) : (
        <div>
          <p>Transaction Ref: {transactionRef}</p>
          <p>Status: {status}</p>
          {status === 'pending' && (
            <p style={{ color: 'orange' }}>Check your phone for M-Pesa prompt</p>
          )}
          {status === 'success' && (
            <p style={{ color: 'green' }}>Payment completed successfully!</p>
          )}
          {status === 'failed' && (
            <p style={{ color: 'red' }}>Payment failed</p>
          )}
          {status === 'cancelled' && (
            <p style={{ color: 'red' }}>Payment cancelled</p>
          )}
          <button onClick={checkStatus} style={{ margin: '5px', padding: '8px' }}>
            Check Status
          </button>          
          <button onClick={reset} style={{ margin: '5px', padding: '8px' }}>
            New Payment
          </button>
        </div>
      )}
    </div>
  );
};

export default SimpleMpesaPayment;


//Now the backend code
const express = require("express");
const app = express();
const http = require("http");
const bodyParser = require("body-parser");
const axios = require("axios");
const moment = require("moment");
const cors = require("cors");

const port = 5000;
const hostname = "localhost";
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

const server = http.createServer(app);

let paymentStatus = {}; // Initialize paymentStatus to an empty object

// ACCESS TOKEN FUNCTION - Updated to use 'axios'
async function getAccessToken() {
  const consumer_key = "LAq9mDDGdx34yNEprFkA7ACc08T2CYVY"; // REPLACE IT WITH YOUR CONSUMER KEY
  const consumer_secret = "0f1VhjHGqGYtQQAR"; // REPLACE IT WITH YOUR CONSUMER SECRET
  const url =
    "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

  const auth =
    "Basic " +
    new Buffer.from(consumer_key + ":" + consumer_secret).toString("base64");

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: auth,
      },
    });
    const accessToken = response.data.access_token;
    return accessToken;
  } catch (error) {
    throw error;
  }
}

app.get("/", (req, res) => {
  res.send("MPESA DARAJA API WITH NODE JS");
  var timeStamp = moment().format("YYYYMMDDHHmmss");
  console.log(timeStamp);
});

//ACCESS TOKEN ROUTE
app.get("/access_token", (req, res) => {
  getAccessToken()
    .then((accessToken) => {
      res.send("😀 Your access token is " + accessToken);
    })
    .catch(console.log);
});

//MPESA STK PUSH ROUTE
app.post("/stkpush", (req, res) => {
  const phoneNumber = req.body.phone;
  const amount = req.body.amount;

  getAccessToken()
    .then((accessToken) => {
      const url =
        "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
      const auth = "Bearer " + accessToken;
      const timestamp = moment().format("YYYYMMDDHHmmss");
      const password = new Buffer.from(
        "4076053" +
          "b277ef43cc9f3f77c80f5b4edeb9cbbbc3dbc77ec0c873cee847ab7a01f95a79" +
          timestamp
      ).toString("base64");

      axios
        .post(
          url,
          {
            BusinessShortCode: "4076053",
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: "254714870528",
            PartyB: "4076053",
            PhoneNumber: phoneNumber,
            CallBackURL: "https://umeskiasoftwares.com/umswifi/callback",
            AccountReference: "KIOTA",
            TransactionDesc: "Mpesa Daraja API stk push test",
          },
          {
            headers: {
              Authorization: auth,
            },
          }
        )
        .then((response) => {
          console.log(response.data.ResponseCode);
          console.log(response.data.ResponseDescription);
          console.log(response.data.CheckoutRequestID); // This is the mpesaReceiptNumber

          const transactionRef = response.data.CheckoutRequestID;


          paymentStatus = {
            resultCode: response.data.ResponseCode,
            resultDesc: response.data.ResponseDescription,
          };
          res.send(
           transactionRef
          );
        })
        .catch((error) => {
          console.log(error);
          res.status(500).send("❌ Request failed");
        });
    })
    .catch(console.log);
});


app.get("/transactionstatus", (req, res) => {
    const mpesaReceiptNumber = req.query.mpesaReceiptNumber;
  
    const myTimestamp = moment().format("YYYYMMDDHHmmss");
    const myPassword =  Buffer.from(
      "4076053" +
        "b277ef43cc9f3f77c80f5b4edeb9cbbbc3dbc77ec0c873cee847ab7a01f95a79" +
        myTimestamp
    ).toString("base64");
    getAccessToken()
      .then((accessToken) => {
        const url =
          "https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query";
  
        const auth = "Bearer " + accessToken;
  
        axios
          .post(
            url,
            {
              BusinessShortCode: "4076053",
              Password: myPassword,
              Timestamp: moment().format("YYYYMMDDHHmmss"),
              CheckoutRequestID: mpesaReceiptNumber,
            },
            {
              headers: {
                Authorization: auth,
              },
            }
          )
          .then((response) => {

           
           console.log(response.data);
  
            // Check the 'response.data' to determine the transaction status
            // For example, you can check 'response.data.ResultCode' to see if it's successful
  
            res.json(response.data);
          })
          .catch((error) => {
            console.log(error);
            res.status(500).send("❌ The Request failed");
          });
      })
      .catch(console.log);
  });
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});