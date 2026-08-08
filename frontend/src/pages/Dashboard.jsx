import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { isAuthority } = useAuth();
  const [cases, setCases] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [alertMsg, setAlertMsg] = useState(null);

  // Ask for browser notification permission once when dashboard loads
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    async function loadCases() {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Dashboard load error:", error);
        setLoadError(error.message);
      } else {
        setCases(data);
      }
    }
    loadCases();

    const channel = supabase
      .channel("cases-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "cases" }, (payload) => {
        loadCases();

        // Fire an alert only when a case newly becomes approved
        if (
          payload.eventType === "UPDATE" &&
          payload.new.status === "approved" &&
          payload.old.status !== "approved"
        ) {
          const msg = `🚨 New case approved: ${payload.new.child_name}`;
          setAlertMsg(msg);
          setTimeout(() => setAlertMsg(null), 8000);

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Child Missing Alert", {
              body: `New case approved: ${payload.new.child_name}`,
              icon: "/favicon.ico"
            });
          }
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Active Cases</h1>
        <div className="header-actions">
          <Link to="/report" className="btn-primary">Report Missing Child</Link>
          {isAuthority && <Link to="/authority" className="btn-secondary">Authority Dashboard</Link>}
        </div>
      </div>

      {alertMsg && (
        <div style={{ background: "#ff5c33", color: "white", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontWeight: "bold" }}>
          {alertMsg}
        </div>
      )}

      {loadError && <p className="error-text">Failed to load cases: {loadError}</p>}
      {!loadError && cases.length === 0 && <p className="subtle">No active approved cases right now.</p>}

      <div className="card-grid">
        {cases.map((c) => (
          <Link to={`/case/${c.id}`} key={c.id} className="case-card">
            {c.photo_url && <img src={c.photo_url} alt={c.child_name} />}
            <div className="case-card-body">
              <h3>{c.child_name}, age {c.age}</h3>
              <p className="subtle">Last seen near: {c.last_known_address}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}