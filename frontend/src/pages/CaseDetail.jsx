import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function CaseDetail() {
  const { caseId } = useParams();
  const { user, isVerified } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [sightings, setSightings] = useState([]);
  const [notes, setNotes] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [error, setError] = useState("");

  async function loadSightings() {
    const { data, error: sightingsError } = await supabase
      .from("sightings")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });
    if (sightingsError) {
      console.error("Sightings load error:", sightingsError);
    } else {
      setSightings(data);
    }
  }

  useEffect(() => {
    async function loadCase() {
      const { data, error: caseError } = await supabase
        .from("cases")
        .select("*")
        .eq("id", caseId)
        .single();

      if (caseError) {
        console.error("CaseDetail load error:", caseError);
        setLoadError(
          caseError.code === "PGRST116"
            ? "No case found with this ID, or you don't have permission to view it (it may still be pending review)."
            : `Failed to load case: ${caseError.message}`
        );
      } else {
        setCaseData(data);
      }
    }
    loadCase();
    loadSightings();

    const channel = supabase
      .channel(`sightings-${caseId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sightings", filter: `case_id=eq.${caseId}` },
        loadSightings
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [caseId]);

  async function submitSighting(e) {
    e.preventDefault();
    setError("");
    if (!isVerified) {
      setError("Only verified accounts can submit sightings — this keeps leads trustworthy.");
      return;
    }
    try {
      const { error: insertError } = await supabase.from("sightings").insert({
        case_id: caseId,
        reporter_id: user.id,
        lat: Number(lat),
        lng: Number(lng),
        notes,
      });
      if (insertError) throw insertError;
      setNotes(""); setLat(""); setLng("");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loadError) return <div className="page"><p className="error-text">{loadError}</p></div>;
  if (!caseData) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <h1>{caseData.child_name}, age {caseData.age}</h1>
      {caseData.photo_url && <img className="case-detail-photo" src={caseData.photo_url} alt={caseData.child_name} />}
      <p>{caseData.description}</p>
      <p className="subtle">Last known location: {caseData.last_known_address}</p>

      <h2>Sighting Reports</h2>
      <div className="sighting-list">
        {sightings.length === 0 && <p className="subtle">No sightings reported yet.</p>}
        {sightings.map((s) => (
          <div key={s.id} className="sighting-item">
            <p>{s.notes}</p>
            <p className="subtle">Near ({s.lat}, {s.lng})</p>
          </div>
        ))}
      </div>

      <h2>Report a Sighting</h2>
      <form onSubmit={submitSighting} className="form-card">
        <label>What did you see?</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} required />
        <div className="row">
          <div>
            <label>Latitude</label>
            <input value={lat} onChange={(e) => setLat(e.target.value)} required />
          </div>
          <div>
            <label>Longitude</label>
            <input value={lng} onChange={(e) => setLng(e.target.value)} required />
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="btn-primary">Submit Sighting</button>
      </form>
    </div>
  );
}
