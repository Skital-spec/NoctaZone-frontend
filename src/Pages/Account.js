import React, { useEffect, useState } from "react";
import { Container, Form, Button, Alert } from "react-bootstrap";
import { User, Gamepad2, KeyRound } from "lucide-react";
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
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  // Preferences
  const [consoleChoice, setConsoleChoice] = useState("");
  const [genreChoice, setGenreChoice] = useState("");

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // helper: extract path after '/avatars/' from public URL
  const extractAvatarPathFromUrl = (url) => {
    if (!url) return null;
    const marker = "/avatars/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.substring(idx + marker.length));
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
          .select("username, avatar_url, console, favorite_genre")
          .eq("id", user.id)
          .single();

        // If profile doesn't exist we just keep defaults (upsert will create)
        if (error && status !== 406) throw error;
        if (data && mounted) {
          setUsername(data.username || "");
          setAvatarUrl(data.avatar_url || "");
          setConsoleChoice(data.console || "");
          setGenreChoice(data.favorite_genre || "");
        }
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
        username,
        avatar_url: newAvatarUrl,
        console: consoleChoice || null,
        favorite_genre: genreChoice || null,
        updated_at: new Date()
      };

      const { error: upsertError } = await supabase.from("profiles").upsert(updates);
      if (upsertError) throw upsertError;

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
    window.location.href = '/login'; // or use React Router's navigate()
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
            { id: "password", label: "Password" }
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

        <Container className="py-4">
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
                  <Form.Control type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
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

          {/* Password */}
          {activeTab === "password" && (
            <div className="privacy-policy-container text-center">
              <div className="privacy-policy-header">
                <KeyRound size={40} className="privacy-icon" />
                <h1>Password</h1>
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

                <Button variant="danger" onClick={handlePasswordChange} disabled={loading}>
                  {loading ? "Working..." : "Change Password"}
                </Button>
                <Button variant="success" onClick={handleLogout} disabled={loading}>
                  {loading ? "Working..." : " Log Out"}
                </Button>
              </Form>
            </div>
          )}
        </Container>
      </div>
    </MainLayout>
  );
}
