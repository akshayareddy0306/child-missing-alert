import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function AuthorityDashboard() {
  const { isAuthority } = useAuth();
  const [cases, setCases] = useState([]);

  async function loadCases() {
    // Authority accounts can see ALL cases (pending, approved, resolved) —
    // this query only succeeds because the RLS select policy grants
    // authorities broader read access than the public dashboard.
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("AuthorityDashboard load error:", error);
    } else {
      setCases(data);
    }
  }

  useEffect(() => {
    if (!isAuthority) return;
    loadCases();

    const channel = supabase
      .channel("authority-cases-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "cases" }, loadCases)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [isAuthority]);

  async function approve(caseId, authorityId) {
    const { error } = await supabase
      .from("cases")
      .update({ status: "approved", approved_by: authorityId, approved_at: new Date().toISOString() })
      .eq("id", caseId);
    if (error) console.error("Approve error:", error);
  }

  async function resolve(caseId) {
    const { error } = await supabase
      .from("cases")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", caseId);
    if (error) console.error("Resolve error:", error);
  }

  const { user } = useAuth();

  if (!isAuthority) {
    return <div className="page"><p>This dashboard is restricted to verified authority accounts.</p></div>;
  }

  return (
    <div className="page">
      <h1>Authority Dashboard</h1>
      <p className="subtle">Full visibility across pending, approved, and resolved cases.</p>

      <table className="authority-table">
        <thead>
          <tr>
            <th>Child</th><th>Status</th><th>Reported</th><th>Full address</th><th>FIR / Station</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id}>
              <td>{c.child_name}, {c.age}</td>
              <td><span className={`status-pill status-${c.status}`}>{c.status}</span></td>
              <td>{c.created_at ? new Date(c.created_at).toLocaleString() : "—"}</td>
              <td>{c.last_known_address}</td>
              <td>{c.fir_number} — {c.police_station}, {c.district}</td>
              <td>
                {c.status === "pending" && (
                  <button className="btn-primary btn-sm" onClick={() => approve(c.id, user.id)}>Approve</button>
                )}
                {c.status === "approved" && (
                  <button className="btn-secondary btn-sm" onClick={() => resolve(c.id)}>Mark Resolved</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
