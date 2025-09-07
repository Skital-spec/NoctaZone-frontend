import React, { useState, useEffect } from 'react';
import { Modal, ListGroup, Badge, Spinner, Alert, InputGroup, Form } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

const OnlineUsersModal = ({ show, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session error:', sessionError);
          return;
        }
        
        if (session?.user?.id) {
          console.log('👤 Current user ID:', session.user.id);
          setCurrentUserId(session.user.id);
        } else {
          console.log('⚠️ No active session found');
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };
    getCurrentUser();
  }, []);

  // Update user presence when modal opens
  useEffect(() => {
    if (show && currentUserId) {
      updateUserPresence();
    }
  }, [show, currentUserId]);

  // Fetch users with presence data
  useEffect(() => {
    if (show) {
      fetchUsers();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('user-presence-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_presence' },
          (payload) => {
            console.log('👥 Presence change:', payload);
            fetchUsers(); // Refetch users when presence changes
          }
        )
        .subscribe();

      // Set up heartbeat to maintain online status
      const heartbeatInterval = setInterval(() => {
        if (currentUserId) {
          updateUserPresence();
        }
      }, 60000); // Update every minute

      return () => {
        supabase.removeChannel(channel);
        clearInterval(heartbeatInterval);
      };
    }
  }, [show, currentUserId]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching users and presence data...');
      
      // Get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username')
        .order('username', { ascending: true });

      if (profilesError) throw profilesError;
      console.log('👥 Profiles data:', profilesData);

      // Get presence data for all users
      const userIds = profilesData.map(profile => profile.id);
      console.log('🔍 Fetching presence for user IDs:', userIds);
      
      const { data: presenceData, error: presenceError } = await supabase
        .from('user_presence')
        .select('*')
        .in('user_id', userIds);

      if (presenceError) {
        console.error('Error fetching presence:', presenceError);
        // Continue without presence data
      }
      
      console.log('🟢 Raw presence data from DB:', presenceData);

      // Create presence map
      const presenceMap = {};
      if (presenceData) {
        presenceData.forEach(presence => {
          console.log(`👤 Processing presence for user ${presence.user_id}:`, {
            is_online: presence.is_online,
            last_seen: presence.last_seen,
            last_seen_type: typeof presence.last_seen,
            raw_presence: presence
          });
          presenceMap[presence.user_id] = presence;
        });
      }
      
      console.log('🗺️ Presence map:', presenceMap);

      // Combine profiles with presence data
      const usersWithPresence = profilesData.map(profile => {
        const presence = presenceMap[profile.id];
        
        if (!presence) {
          console.log(`⚠️ No presence record found for user: ${profile.username} (${profile.id})`);
        }
        
        const result = {
          ...profile,
          presence: presence ? {
            is_online: Boolean(presence.is_online),
            last_seen: presence.last_seen
          } : {
            is_online: false,
            last_seen: null
          }
        };
        
        console.log(`🔄 Combined data for ${profile.username}:`, {
          id: profile.id,
          username: profile.username,
          presence: result.presence,
          hasPresenceRecord: !!presence
        });
        
        return result;
      });

      // Sort: online users first, then by username
      usersWithPresence.sort((a, b) => {
        if (a.presence.is_online && !b.presence.is_online) return -1;
        if (!a.presence.is_online && b.presence.is_online) return 1;
        
        // Handle null usernames safely
        const usernameA = a.username || 'Anonymous';
        const usernameB = b.username || 'Anonymous';
        return usernameA.localeCompare(usernameB);
      });

      console.log('✅ Final users with presence:', usersWithPresence);
      setUsers(usersWithPresence);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateUserPresence = async () => {
    if (!currentUserId) return;

    const currentTime = new Date().toISOString();
    
    const { error } = await supabase
      .from('user_presence')
      .upsert({
        user_id: currentUserId,
        is_online: true,
        last_seen: currentTime,
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error updating presence:', error);
    }
  };

  const setUserOffline = async () => {
    if (!currentUserId) return;

    const currentTime = new Date().toISOString();
    
    await supabase
      .from('user_presence')
      .upsert({
        user_id: currentUserId,
        is_online: false,
        last_seen: currentTime,
      }, {
        onConflict: 'user_id'
      });
  };

  const handleClose = async () => {
    await setUserOffline();
    onClose();
  };

  const getLastSeenText = (lastSeen, isOnline) => {
    // If user is currently online, don't show last seen
    if (isOnline) return null;
    
    console.log('⏰ Processing last seen:', { lastSeen, type: typeof lastSeen, isOnline });
    
    if (!lastSeen) {
      console.log('❌ No last seen timestamp');
      return 'Never seen';
    }
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    
    console.log('📅 Date processing:', {
      now: now.toISOString(),
      lastSeen: lastSeen,
      lastSeenDate: lastSeenDate.toISOString(),
      isValid: !isNaN(lastSeenDate.getTime())
    });
    
    // Check if the date is valid
    if (isNaN(lastSeenDate.getTime())) {
      console.log('❌ Invalid date');
      return 'Never seen';
    }
    
    const diffMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
    console.log('⏱️ Time difference:', { diffMinutes });
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onlineCount = users.filter(user => user.presence.is_online).length;

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          👥 Online Users
          <Badge bg="success" className="ms-2">
            {onlineCount} online
          </Badge>
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {/* Search Bar */}
        <InputGroup className="mb-3">
          <Form.Control
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center text-muted py-4">
            <p>No users found.</p>
          </div>
        ) : (
          <ListGroup variant="flush">
            {filteredUsers.map((user) => (
              <ListGroup.Item 
                key={user.id} 
                className="d-flex justify-content-between align-items-center border-0 px-0 py-3"
                style={{ borderBottom: '1px solid #f0f0f0' }}
              >
                <div className="d-flex align-items-center gap-3">
                  {/* Profile Avatar Placeholder */}
                  <div 
                    className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white"
                    style={{ width: '40px', height: '40px', fontSize: '18px', fontWeight: 'bold' }}
                  >
                    {user.username?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <strong>{user.username || 'Anonymous'}</strong>
                      {user.id === currentUserId && (
                        <Badge bg="secondary" size="sm">You</Badge>
                      )}
                    </div>
                    <small className="text-muted">
                      {user.presence.is_online ? (
                        <span className="text-success">
                          <span className="me-1">🟢</span>
                          Online
                        </span>
                      ) : (
                        <span className="text-muted">
                          <span className="me-1">⚪</span>
                          Last seen {getLastSeenText(user.presence.last_seen, user.presence.is_online)}
                        </span>
                      )}
                    </small>
                  </div>
                </div>

                {/* Status Indicator */}
                <div 
                  className={`rounded-circle ${user.presence.is_online ? 'bg-success' : 'bg-secondary'}`}
                  style={{ 
                    width: '12px', 
                    height: '12px',
                    opacity: user.presence.is_online ? 1 : 0.3
                  }}
                />
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default OnlineUsersModal;