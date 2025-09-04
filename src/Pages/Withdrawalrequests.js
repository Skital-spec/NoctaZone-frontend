import React, { useEffect, useState } from 'react'

function Withdrawalrequests() {
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')

  const fetchRequests = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('https://safcom-payment.onrender.com/api/admin/withdrawal-requests')
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch requests')
      }
      setRequests(data.requests || [])
    } catch (e) {
      setError(e.message)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h2>Withdrawal Requests</h2>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <button onClick={fetchRequests}>Refresh</button>
        {loading && <span>Loading...</span>}
        {error && <span style={{ color: 'red' }}>{error}</span>}
      </div>

      {requests.length === 0 ? (
        <p>No withdrawal requests.</p>
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Withdrawalrequests