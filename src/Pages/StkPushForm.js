import React, { useState } from "react";

function StkPushForm() {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const handlePay = async (e) => {
    e.preventDefault();
    setMessage("Processing payment...");

    try {
      const res = await fetch("http://localhost:5000/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, amount }),
      });

      const data = await res.json();
      setMessage(data.message || JSON.stringify(data));
    } catch (error) {
      console.error(error);
      setMessage("Payment failed");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto" }}>
      <h2>Simulate M-PESA Payment</h2>
      <form onSubmit={handlePay}>
        <div>
          <label>Phone (2547...):</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
        </div>
        <div>
          <label>Amount:</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
        </div>
        <button type="submit" style={{ padding: "10px", width: "100%" }}>
          Pay Now
        </button>
      </form>
      <p>{message}</p>
    </div>
  );
}

export default StkPushForm;
