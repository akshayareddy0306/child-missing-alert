import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function ReportForm() {
  const { user, isVerified } = useAuth();
  const navigate = useNavigate();

  const [childName, setChildName] = useState("");
  const [age, setAge] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [firNumber, setFirNumber] = useState("");
  const [policeStation, setPoliceStation] = useState("");
  const [district, setDistrict] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [locating, setLocating] = useState(false);

const handleUseMyLocation = () => {
  if (!navigator.geolocation) {
    alert("Geolocation isn't supported by your browser.");
    return;
  }
  setLocating(true);
  navigator.geolocation.getCurrentPosition(
    (position) => {
      setLat(position.coords.latitude.toFixed(6));
      setLng(position.coords.longitude.toFixed(6));
      setLocating(false);
    },
    (error) => {
      alert("Couldn't get your location: " + error.message);
      setLocating(false);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!isVerified) {
      setError("Your account isn't verified yet. Verified accounts only can submit a report — this prevents fake reports.");
      return;
    }

    setSubmitting(true);
    try {
      let photoUrl = null;
      if (photoFile) {
        const filePath = `${user.id}-${Date.now()}-${photoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("case-photos")
          .upload(filePath, photoFile);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("case-photos")
          .getPublicUrl(filePath);
        photoUrl = publicUrlData.publicUrl;
      }

      // status is always "pending" on create — enforced again server-side by
      // the RLS insert policy, so this can't be bypassed by editing client code.
      const { error: insertError } = await supabase.from("cases").insert({
        reporter_id: user.id,
        child_name: childName,
        age: Number(age),
        description,
        photo_url: photoUrl,
        last_known_lat: Number(lat),
        last_known_lng: Number(lng),
        last_known_address: address,
        fir_number: firNumber || null,
        police_station: policeStation || null,
        district: district || null,
        status: "pending",
      });
      if (insertError) throw insertError;

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>Report a Missing Child</h1>
      <p className="subtle">
        This report will be reviewed by an authority before it appears publicly.
      </p>

      <form onSubmit={handleSubmit} className="form-card">
        <label>Child's name</label>
        <input value={childName} onChange={(e) => setChildName(e.target.value)} required />

        <label>Age</label>
        <input type="number" value={age} onChange={(e) => setAge(e.target.value)} required />

        <label>Description (clothing, height, distinguishing features)</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />

        <label>Photo</label>
        <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} />

        <label>Last known location — address</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} required />


        {/* NOTE: swap the lat/lng inputs above for a real Google Maps click-to-pin
            component when you have time — see comment at bottom of file. */}

        <label>FIR number (optional — add once filed with police)</label>
        <input value={firNumber} onChange={(e) => setFirNumber(e.target.value)} placeholder="e.g. 245/2026" />

        <div className="row">
          <div>
            <label>Police station (optional)</label>
            <input value={policeStation} onChange={(e) => setPoliceStation(e.target.value)} />
          </div>
          <div>
            <label>District (optional)</label>
            <input value={district} onChange={(e) => setDistrict(e.target.value)} />
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Report"}
        </button>
      </form>
    </div>
  );
}

// To add a real map picker: use @react-google-maps/api's <GoogleMap> with an
// onClick handler that sets lat/lng from event.latLng.lat() / .lng() —
// swap in for the two number inputs above once your API key is set up.
