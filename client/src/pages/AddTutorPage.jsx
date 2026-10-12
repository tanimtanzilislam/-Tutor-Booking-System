import { useState } from "react";
import { DateTime } from "luxon";
import { api } from "../api.js";
import { ErrorMessage } from "../components/PageState.jsx";
import { useToast } from "../components/ToastContext.jsx";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const subjects = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Computer Science",
  "History",
  "Other"
];

const initialDetails = {
  name: "",
  photoUrl: "",
  subject: "",
  institution: "",
  experience: "",
  location: "",
  teachingMode: "",
  hourlyRate: "",
  totalSlots: "",
  sessionStartDate: ""
};

export default function AddTutorPage() {
  const [details, setDetails] = useState(initialDetails);
  const [availability, setAvailability] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photoPreviewFailed, setPhotoPreviewFailed] = useState(false);
  const { notify } = useToast();

  function updateDetails(event) {
    setDetails((current) => ({ ...current, [event.target.name]: event.target.value }));
    if (event.target.name === "photoUrl") setPhotoPreviewFailed(false);
  }

  function toggleDay(dayOfWeek, checked) {
    setAvailability((current) => checked
      ? [...current, { dayOfWeek, startTime: "09:00", endTime: "17:00" }]
      : current.filter((window) => window.dayOfWeek !== dayOfWeek));
  }

  function updateWindow(dayOfWeek, key, value) {
    setAvailability((current) => current.map((window) => window.dayOfWeek === dayOfWeek ? { ...window, [key]: value } : window));
  }

  function validateAvailability() {
    if (availability.length === 0) return "Choose at least one available day.";
    const insufficientWindow = availability.find((window) => {
      const start = Number(window.startTime.slice(0, 2)) * 60 + Number(window.startTime.slice(3));
      const end = Number(window.endTime.slice(0, 2)) * 60 + Number(window.endTime.slice(3));
      return start % 60 !== 0 || end % 60 !== 0 || start >= end;
    });
    return insufficientWindow
      ? "Each selected day's time range must use valid on-the-hour start and end times."
      : "";
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const availabilityError = validateAvailability();
    if (availabilityError) {
      setError(availabilityError);
      setSubmitting(false);
      return;
    }

    try {
      const result = await api("/tutors", {
        method: "POST",
        body: JSON.stringify({
          ...details,
          hourlyRate: Number(details.hourlyRate),
          experience: Number(details.experience),
          totalSlots: Number(details.totalSlots),
          availability,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      });
      notify(result.message || "Tutor added successfully.");
      setDetails(initialDetails);
      setAvailability([]);
    } catch (requestError) {
      setError(requestError.message);
      notify(requestError.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="form-page shell">
      <div className="form-page-intro">
        <p className="section-kicker">Share what you know</p>
        <h1>Add a tutor</h1>
        <p>Complete the tutor profile and weekly schedule. Times are saved in your current timezone.</p>
      </div>
      <form className="editor-card tutor-editor" onSubmit={submit}>
        <div className="form-fields-two">
          <label>
            Tutor name
            <input name="name" value={details.name} onChange={updateDetails} required maxLength={100} />
          </label>
          <label>
            Photo URL
            <input name="photoUrl" type="url" value={details.photoUrl} onChange={updateDetails} required placeholder="https://..." />
          </label>
        </div>
        {details.photoUrl && !photoPreviewFailed && (
          <div className="tutor-photo-preview">
            <img src={details.photoUrl} alt="Tutor photo preview" onError={() => setPhotoPreviewFailed(true)} />
          </div>
        )}
        <div className="form-fields-two">
          <label>
            Subject / category
            <select name="subject" value={details.subject} onChange={updateDetails} required>
              <option value="">Select a subject</option>
              {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
            </select>
          </label>
          <label>
            Institution
            <input name="institution" value={details.institution} onChange={updateDetails} required maxLength={150} placeholder="School, college, or university" />
          </label>
          <label>
            Experience (years)
            <input name="experience" type="number" min="0" max="80" step="1" value={details.experience} onChange={updateDetails} required />
          </label>
          <label>
            Location (area / city)
            <input name="location" value={details.location} onChange={updateDetails} required maxLength={150} placeholder="e.g. Dhanmondi, Dhaka" />
          </label>
          <label>
            Teaching mode
            <select name="teachingMode" value={details.teachingMode} onChange={updateDetails} required>
              <option value="">Select a teaching mode</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
              <option value="Both">Both</option>
            </select>
          </label>
          <label>
            Hourly fee
            <input name="hourlyRate" type="number" min="0.01" step="0.01" value={details.hourlyRate} onChange={updateDetails} required />
          </label>
          <label>
            Session start date
            <input name="sessionStartDate" type="date" value={details.sessionStartDate} onChange={updateDetails} min={DateTime.now().toISODate()} required />
          </label>
          <label>
            Total booking slots
            <input name="totalSlots" type="number" min="1" step="1" value={details.totalSlots} onChange={updateDetails} required />
          </label>
        </div>
        <fieldset className="availability-editor">
          <legend>Available days and time slots</legend>
          <p>Sessions are one hour. Weekly availability repeats from the session start date; the booking-slot limit applies across all dates.</p>
          {weekdays.map((day, dayOfWeek) => {
            const window = availability.find((item) => item.dayOfWeek === dayOfWeek);
            return (
              <div className={`availability-row ${window ? "selected" : ""}`} key={day}>
                <label className="day-check">
                  <input type="checkbox" checked={Boolean(window)} onChange={(event) => toggleDay(dayOfWeek, event.target.checked)} />
                  {day}
                </label>
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
        <button className="button button-dark" type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Submit tutor"}
        </button>
      </form>
    </section>
  );
}
