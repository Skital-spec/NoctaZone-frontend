import React, { useEffect, useState } from 'react';
import { config } from '../config';
import ErrorModal from '../Components/ErrorModal';

function Withdrawalrequests() {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [payingRequestId, setPayingRequestId] = useState(null);

  const fetchRequests = async () => {
    setLoading(true)
    setError('')
    
    try {
      const apiUrl = `${config.API_BASE_URL}/api/admin/withdrawal-requests`
      
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      console.log('Response status:', res.status)
      console.log('Response headers:', res.headers)
      
      const data = await res.json()
      console.log('Response data:', data)
      
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Failed to fetch requests`)
      }
      
      setRequests(data.requests || [])
      
    } catch (e) {
      console.error('Fetch error:', e)
      setError(e.message)
      setRequests([])
      if (e.name === 'AbortError') {
        setError('Request timeout - server may be unavailable')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, []);

  const handlePay = async (requestId, amount, username) => {
    if (!window.confirm(`Are you sure you want to pay KES ${amount} to ${username}?`)) {
      return;
    }

    setPayingRequestId(requestId);
    setError('');

    try {
      const apiUrl = `${config.API_BASE_URL}/api/admin/withdrawal-requests/${requestId}/pay`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process payment');
      }

      // Refresh the list to show the updated status
      fetchRequests();
    } catch (e) {
      setError(e.message);
    } finally {
      setPayingRequestId(null);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <ErrorModal message={error} onClose={() => setError('')} />
      <h2>Withdrawal Requests</h2>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <button onClick={fetchRequests} disabled={loading}>Refresh</button>
        {loading && <span>Loading...</span>}
      </div>

      {!loading && !error && requests.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{ color: '#6c757d', marginBottom: '10px' }}>No Withdrawal Requests</h4>
          <p style={{ color: '#6c757d', margin: 0 }}>There are currently no withdrawal requests in the system.</p>
        </div>
      ) : (
        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          {requests.map((r) => (
            <div key={r.id} style={{ border: '1px solid #eee', padding: 12, marginBottom: 10, borderRadius: 6, background: '#fff' }}>
              <div><strong>Time:</strong> {r.time}</div>
              <div><strong>User:</strong> {r.username && r.username !== 'Unknown User' ? r.username : `User ID: ${r.user_id}`}</div>
              <div><strong>User ID:</strong> {r.user_id}</div>
              <div><strong>Phone:</strong> {r.phone}</div>
              <div><strong>Amount:</strong> KES {r.amount}</div>
              <div><strong>Status:</strong> <span style={{ 
                color: r.status === 'pending' ? 'orange' : r.status === 'completed' ? 'green' : 'red',
                fontWeight: 'bold'
              }}>{r.status.toUpperCase()}</span></div>
              {r.status === 'pending' && (
                <div style={{ marginTop: 10 }}>
                  <button 
                    onClick={() => handlePay(r.id, r.amount, r.username)} 
                    disabled={payingRequestId === r.id}
                    style={{ 
                      backgroundColor: '#28a745', 
                      color: 'white', 
                      padding: '8px 12px', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer' 
                    }}
                  >
                    {payingRequestId === r.id ? 'Processing...' : 'Pay'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Withdrawalrequests