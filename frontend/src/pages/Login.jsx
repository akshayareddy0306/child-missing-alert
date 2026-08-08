import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("parent");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        // If email confirmation is ON in Supabase, there's no session yet —
        // we still create the profile row using the returned user id.
        if (data.user) {
          const { error: profileError } = await supabase.from("profiles").insert({
            id: data.user.id,
            name,
            phone,
            role: role === "authority" ? "parent" : role, // can't self-assign authority
            verified: false,
          });
          if (profileError) throw profileError;
        }

        if (!data.session) {
          setInfo("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Child Missing Alert</h1>
        <p className="subtle">{mode === "signup" ? "Create an account" : "Sign in"}</p>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <>
              <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
              <input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="parent">Parent / Guardian</option>
                <option value="volunteer">Community member / Volunteer</option>
              </select>
            </>
          )}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          {error && <p className="error-text">{error}</p>}
          {info && <p className="subtle">{info}</p>}

          <button type="submit" className="btn-primary">
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button className="link-btn" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}
