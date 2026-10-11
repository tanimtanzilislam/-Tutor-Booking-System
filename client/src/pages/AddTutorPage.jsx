import { useState } from "react";
import { api } from "../api.js";
import { ErrorMessage } from "../components/PageState.jsx";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AddTutorPage() {
  const [details, setDetails] = useState({ name: "", subject: "", bio: "", hourlyRate: "" });
  const [availability, setAvailability] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateDetails(event) {
    setDetails((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function toggleDay(dayOfWeek, checked) {
    setAvailability((current) => checked
      ? [...current, { dayOfWeek, startTime: "09:00", endTime: "17:00" }]
      : current.filter((window) => window.dayOfWeek !== dayOfWeek));
  }

  function updateWindow(dayOfWeek, key, value) {
    setAvailability((current) => current.map((window) => window.dayOfWeek === dayOfWeek ? { ...window, [key]: value } : window));
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await api("/tutors", {
        method: "POST",
        body: JSON.stringify({
          ...details,
          hourlyRate: Number(details.hourlyRate),
          availability,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      });
      setMessage("Tutor added successfully.");
      setDetails({ name: "", subject: "", bio: "", hourlyRate: "" });
      setAvailability([]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="form-page shell">
      <div className="form-page-intro"><p className="section-kicker">Share what you know</p><h1>Add a tutor</h1><p>Tell learners about the tutor and the weekly hours they can book. Availability uses your current timezone.</p></div>
      <form className="editor-card" onSubmit={submit}>
        <div className="form-fields-two">
          <label>Tutor name<input name="name" value={details.name} onChange={updateDetails} required maxLength={100} /></label>
          <label>Subject<input name="subject" value={details.subject} onChange={updateDetails} required maxLength={100} placeholder="e.g. Algebra" /></label>
        </div>
        <label>About the tutor<textarea name="bio" value={details.bio} onChange={updateDetails} required maxLength={2000} rows={4} /></label>
        <label>Hourly rate<input name="hourlyRate" type="number" min="0.01" step="0.01" value={details.hourlyRate} onChange={updateDetails} required /></label>
        <fieldset className="availability-editor">
          <legend>Weekly availability</legend>
          <p>Choose the weekdays and a time range. Sessions are one hour and start on the hour.</p>
          {weekdays.map((day, dayOfWeek) => {
            const window = availability.find((item) => item.dayOfWeek === dayOfWeek);
            return (
              <div className={`availability-row ${window ? "selected" : ""}`} key={day}>
                <label className="day-check"><input type="checkbox" checked={Boolean(window)} onChange={(event) => toggleDay(dayOfWeek, event.target.checked)} />{day}</label>
                {window ? (
                  <div className="time-inputs">
                    <input aria-label={`${day} start time`} type="time" value={window.startTime} onChange={(event) => updateWindow(dayOfWeek, "startTime", event.target.value)} required />
                    <span>to</span>
                    <input aria-label={`${day} end time`} type="time" value={window.endTime} onChange={(event) => updateWindow(dayOfWeek, "endTime", event.target.value)} required />
                  </div>
                ) : <span className="day-off">Not available</span>}
              </div>
            );
          })}
        </fieldset>
        <ErrorMessage>{error}</ErrorMessage>
        {message && <p className="form-success" role="status">{message}</p>}
        <button className="button button-dark" type="submit" disabled={submitting}>{submitting ? "Saving..." : "Add tutor"}</button>
      </form>
    </section>
  );
}
