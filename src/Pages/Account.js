import React, { useEffect, useState } from "react";
import { Container, Form, Button, Alert, Modal } from "react-bootstrap";
import { User, Gamepad2, KeyRound, Trophy, Trash2 } from "lucide-react";
import MainLayout from "../Components/MainLayout";
import { supabase } from "../supabaseClient";

const genresByConsole = {
  Mobile: ["FIFA Mobile", "Chess", "PUBG Mobile", "Clash Royale"],
  PC: ["Valorant", "CS:GO", "Dota 2", "Minecraft"],
  PlayStation: ["FIFA", "God of War", "The Last of Us"],
  Xbox: ["Halo", "Forza Horizon", "FIFA"],
  "Nintendo Switch": ["Zelda", "Mario Kart", "Super Smash Bros"]
};

export default function Account() {
  const [activeTab, setActiveTab] = useState("profile");

  // Profile
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState(""); // Track original username
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [dateJoined, setDateJoined] = useState("");

  // Preferences
  const [consoleChoice, setConsoleChoice] = useState("");
  const [genreChoice, setGenreChoice] = useState("");

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Stats
  const [stats, setStats] = useState({
    totalTournaments: 0,
    totalWinnings: 0,
    totalWins: 0
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // helper: extract path after '/avatars/' from public URL
  const extractAvatarPathFromUrl = (url) => {
    if (!url) return null;
    const marker = "/avatars/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.substring(idx + marker.length));
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Check if username exists (excluding current user) - Case insensitive
  const checkUsernameExists = async (usernameToCheck, currentUserId) => {
    if (!usernameToCheck.trim()) return false;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", usernameToCheck.trim()) // ilike for case-insensitive search
      .neq("id", currentUserId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("Error checking username:", error);
      return false;
    }

    return !!data; // Returns true if username exists
  };

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error, status } = await supabase
          .from("profiles")
          .select("username, avatar_url, console, favorite_genre, created_at")
          .eq("id", user.id)
          .single();

        // If profile doesn't exist we just keep defaults (upsert will create)
        if (error && status !== 406) throw error;
        if (data && mounted) {
          setUsername(data.username || "");
          setOriginalUsername(data.username || "");
          setAvatarUrl(data.avatar_url || "");
          setConsoleChoice(data.console || "");
          setGenreChoice(data.favorite_genre || "");
          setDateJoined(data.created_at || "");
        }

        // Fetch user stats
        await fetchUserStats(user.id);
      } catch (err) {
        console.error("fetchProfile:", err);
        setMessage({ type: "danger", text: "Failed to load profile." });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      mounted = false;
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserStats = async (userId) => {
    try {
      // Fetch tournament participations
      const { data: tournaments, error: tournamentsError } = await supabase
        .from("tournament_participants")
        .select("tournament_id")
        .eq("user_id", userId);

      if (tournamentsError) throw tournamentsError;

      // Fetch total winnings
      const { data: winnings, error: winningsError } = await supabase
        .from("tournament_participants")
        .select("winnings")
        .eq("user_id", userId);

      if (winningsError) throw winningsError;

      // Fetch total match wins
      const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select("id")
        .eq("winner_id", userId);

      if (matchesError) throw matchesError;

      const totalWinnings = winnings.reduce((sum, w) => sum + (w.winnings || 0), 0);

      setStats({
        totalTournaments: tournaments?.length || 0,
        totalWinnings,
        totalWins: matches?.length || 0
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  // handle avatar file selection + preview
  const handleAvatarChange = (file) => {
    if (!file) {
      setAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview("");
      }
      return;
    }

    // revoke old preview
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);

    const previewUrl = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview(previewUrl);
  };

  // Upload avatar, try to delete the previous one after successful upload
  const uploadAvatarToStorage = async (file) => {
    if (!file) return null;
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return { publicUrl: publicUrlData.publicUrl, filePath };
  };

  const handleProfileSave = async () => {
    setMessage({ type: "", text: "" });
    setLoading(true);
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check username uniqueness if it was changed
      if (username.trim() !== originalUsername && username.trim()) {
        const usernameExists = await checkUsernameExists(username.trim(), user.id);
        if (usernameExists) {
          setMessage({ type: "danger", text: "Username already taken. Please choose a different one." });
          setLoading(false);
          return;
        }
      }

      let newAvatarUrl = avatarUrl;
      let newAvatarPath = null;

      if (avatarFile) {
        // upload new avatar
        const uploadResult = await uploadAvatarToStorage(avatarFile);
        newAvatarUrl = uploadResult.publicUrl;
        newAvatarPath = uploadResult.filePath;
      }

      // upsert profile row with new values
      const updates = {
        id: user.id,
        username: username.trim() || null,
        avatar_url: newAvatarUrl,
        console: consoleChoice || null,
        favorite_genre: genreChoice || null,
        updated_at: new Date()
      };

      const { error: upsertError } = await supabase.from("profiles").upsert(updates);
      if (upsertError) throw upsertError;

      // Update original username for future comparisons
      setOriginalUsername(username.trim());

      // if we uploaded and there was a previous avatar, attempt to delete previous object
      if (avatarFile && avatarUrl) {
        const prevPath = extractAvatarPathFromUrl(avatarUrl);
        // only try to delete if prevPath exists and is different from newAvatarPath
        if (prevPath && prevPath !== newAvatarPath) {
          const { error: deleteError } = await supabase.storage.from("avatars").remove([prevPath]);
          // delete may fail if you don't have a DELETE policy on storage.objects — it's non-fatal
          if (deleteError) {
            console.warn("Failed to delete old avatar (may need delete policy):", deleteError.message);
          }
        }
      }

      // cleanup preview url
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview("");
      }
      setAvatarFile(null);
      setAvatarUrl(newAvatarUrl);
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (err) {
      console.error("handleProfileSave:", err);
      setMessage({ type: "danger", text: err.message || "Failed to save profile." });
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSave = async () => {
    setMessage({ type: "", text: "" });
    setLoading(true);
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          console: consoleChoice || null,
          favorite_genre: genreChoice || null,
          updated_at: new Date()
        });
      if (error) throw error;

      setMessage({ type: "success", text: "Preferences saved." });
    } catch (err) {
      console.error("handlePreferencesSave:", err);
      setMessage({ type: "danger", text: "Failed to save preferences." });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setMessage({ type: "", text: "" });
    if (!newPassword) {
      setMessage({ type: "danger", text: "Enter a new password." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "danger", text: "Passwords do not match." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Password changed successfully." });
    } catch (err) {
      console.error("handlePasswordChange:", err);
      setMessage({ type: "danger", text: err.message || "Failed to change password." });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error.message);
      // Optionally show a toast or alert to the user
    } else {
      // Clear any local state or context
      // Redirect to login or landing page
      window.location.href = '/login'; 
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      setMessage({ type: "danger", text: 'Please type "DELETE" to confirm account deletion.' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Call the delete account function
      const { error } = await supabase.rpc('delete_user_account', {
        user_id_to_delete: user.id
      });

      if (error) throw error;

      // Sign out the user
      await supabase.auth.signOut();
      
      // Redirect to home page
      window.location.href = '/';
    } catch (err) {
      console.error("handleDeleteAccount:", err);
      setMessage({ type: "danger", text: err.message || "Failed to delete account." });
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <MainLayout>
      <div className="help-page">
        {/* Tabs */}
        <div className="help-tabs flex-nowrap">
          {[
            { id: "profile", label: "Profile" },
            { id: "preferences", label: "Gaming Preferences" },
            { id: "stats", label: "Statistics" },
            { id: "password", label: "Security" }
          ].map((tab) => (
            <div
              key={tab.id}
              className={`help-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {activeTab === tab.id && <div className="tab-arrow" />}
            </div>
          ))}
        </div>

        <Container className="py-4 " style={{marginTop:'-80px'}}>
          {message.text && (
            <Alert variant={message.type} onClose={() => setMessage({ type: "", text: "" })} dismissible>
              {message.text}
            </Alert>
          )}

          {/* Profile */}
          {activeTab === "profile" && (
            <div className="privacy-policy-container text-center">
              <div className="privacy-policy-header">
                <User size={40} className="privacy-icon" />
                <h1>Profile</h1>
                <p className="sub-heading">Manage your gamer identity</p>
              </div>

              <Form className="privacy-policy-content text-start">
                <Form.Group className="mb-3">
                  <Form.Label style={{ color: "#00ffcc" }}>Gamertag</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your unique gamertag"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label style={{ color: "#00ffcc" }}>Avatar</Form.Label>
                  {(avatarPreview || avatarUrl) && (
                    <div className="mb-2">
                      <img
                        src={avatarPreview || avatarUrl}
                        alt="Avatar preview"
                        style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "2px solid #00ffcc" }}
                      />
                    </div>
                  )}
                  <Form.Control type="file" accept="image/*" onChange={(e) => handleAvatarChange(e.target.files?.[0])} />
                  
                  {/* Date Joined Display */}
                  {dateJoined && (
                    <div className="mt-2">
                      <small style={{ color: "#00ffcc", opacity: 0.8 }}>
                        Member since: {formatDate(dateJoined)}
                      </small>
                    </div>
                  )}
                </Form.Group>

                <Button variant="success" onClick={handleProfileSave} disabled={loading}>
                  {loading ? "Saving..." : "Save Profile"}
                </Button>
              </Form>
            </div>
          )}

          {/* Preferences */}
          {activeTab === "preferences" && (
            <div className="privacy-policy-container text-center">
              <div className="privacy-policy-header">
                <Gamepad2 size={40} className="privacy-icon" />
                <h1>Gaming Preferences</h1>
                <p className="sub-heading">Set your console and favorite genre</p>
              </div>

              <Form className="privacy-policy-content text-start">
                <Form.Group className="mb-3">
                  <Form.Label style={{ color: "#00ffcc" }}>Gaming Console</Form.Label>
                  <Form.Select
                    value={consoleChoice}
                    onChange={(e) => {
                      setConsoleChoice(e.target.value);
                      setGenreChoice(""); // reset genre when console changes
                    }}
                  >
                    <option value="">Select console</option>
                    {Object.keys(genresByConsole).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {consoleChoice && (
                  <Form.Group className="mb-3">
                    <Form.Label style={{ color: "#00ffcc" }}>Favorite Genre</Form.Label>
                    <Form.Select value={genreChoice} onChange={(e) => setGenreChoice(e.target.value)}>
                      <option value="">Select genre</option>
                      {genresByConsole[consoleChoice].map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                )}

                <Button variant="success" onClick={handlePreferencesSave} disabled={loading}>
                  {loading ? "Saving..." : "Save Preferences"}
                </Button>
              </Form>
            </div>
          )}

          {/* Statistics */}
          {activeTab === "stats" && (
            <div className="privacy-policy-container text-center">
              <div className="privacy-policy-header">
                <Trophy size={40} className="privacy-icon" />
                <h1>Statistics</h1>
                <p className="sub-heading">Your gaming achievements</p>
              </div>

              <div className="privacy-policy-content">
                <div className="row text-center">
                  <div className="col-md-4 mb-4">
                    <div className="card bg-dark text-light" style={{ border: "2px solid #00ffcc" }}>
                      <div className="card-body">
                        <h3 style={{ color: "#00ffcc" }}>{stats.totalTournaments}</h3>
                        <p className="card-title">Total Tournaments</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4 mb-4">
                    <div className="card bg-dark text-light" style={{ border: "2px solid #00ffcc" }}>
                      <div className="card-body">
                        <h3 style={{ color: "#00ffcc" }}>KSh {stats.totalWinnings.toLocaleString()}</h3>
                        <p className="card-title">Total Winnings</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4 mb-4">
                    <div className="card bg-dark text-light" style={{ border: "2px solid #00ffcc" }}>
                      <div className="card-body">
                        <h3 style={{ color: "#00ffcc" }}>{stats.totalWins}</h3>
                        <p className="card-title">Matches Won</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Password */}
          {activeTab === "password" && (
            <div className="privacy-policy-container text-center">
              <div className="privacy-policy-header">
                <KeyRound size={40} className="privacy-icon" />
                <h1>Security</h1>
                <p className="sub-heading">Manage Your Account</p>
                <p className="sub-heading">Change your account password</p>
              </div>

              <Form className="privacy-policy-content text-start">
                <Form.Group className="mb-3">
                  <Form.Label style={{ color: "#00ffcc" }}>New Password</Form.Label>
                  <Form.Control type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label style={{ color: "#00ffcc" }}>Confirm Password</Form.Label>
                  <Form.Control type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </Form.Group>

                <div className="d-flex gap-2 flex-wrap">
                  <Button variant="danger" onClick={handlePasswordChange} disabled={loading}>
                    {loading ? "Working..." : "Change Password"}
                  </Button>
                  <Button variant="success" onClick={handleLogout} disabled={loading}>
                    {loading ? "Working..." : "Log Out"}
                  </Button>
                  <Button 
                    variant="outline-danger" 
                    onClick={() => setShowDeleteModal(true)} 
                    disabled={loading}
                  >
                    <Trash2 size={16} className="me-1" />
                    Delete Account
                  </Button>
                </div>
              </Form>
            </div>
          )}
        </Container>

        {/* Delete Account Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
          <Modal.Header closeButton className="bg-dark text-light">
            <Modal.Title>Delete Account</Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-dark text-light">
            <p><strong>Warning:</strong> This action cannot be undone!</p>
            <p>Deleting your account will:</p>
            <ul>
              <li>Permanently delete your profile</li>
              <li>Remove you from all tournaments</li>
              <li>Delete your match history</li>
              <li>Remove all your data</li>
            </ul>
            <p>Type <strong>DELETE</strong> to confirm:</p>
            <Form.Control
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
            />
          </Modal.Body>
          <Modal.Footer className="bg-dark">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteAccount}
              disabled={loading || deleteConfirmText !== "DELETE"}
            >
              {loading ? "Deleting..." : "Delete Account"}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </MainLayout>
  );
}