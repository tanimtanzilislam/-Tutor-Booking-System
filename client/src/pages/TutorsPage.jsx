import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { ErrorMessage, Loading } from "../components/PageState.jsx";
import TutorCard from "../components/TutorCard.jsx";

export default function TutorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filtersKey = searchParams.toString();
  const [filters, setFilters] = useState(() => ({
    subject: searchParams.get("subject") || "",
    location: searchParams.get("location") || "",
    teachingMode: searchParams.get("teachingMode") || "",
    minHourlyRate: searchParams.get("minHourlyRate") || "",
    maxHourlyRate: searchParams.get("maxHourlyRate") || ""
  }));
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(filtersKey);
    setFilters({
      subject: params.get("subject") || "",
      location: params.get("location") || "",
      teachingMode: params.get("teachingMode") || "",
      minHourlyRate: params.get("minHourlyRate") || "",
      maxHourlyRate: params.get("maxHourlyRate") || ""
    });
  }, [filtersKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const search = filtersKey ? `?${filtersKey}` : "";
    api(`/tutors${search}`)
      .then(({ tutors: result }) => { if (active) setTutors(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filtersKey]);

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function search(event) {
    event.preventDefault();
    const nextParams = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value.trim()) nextParams.set(key, value.trim());
    }
    setSearchParams(nextParams);
  }

  function resetFilters() {
    setFilters({ subject: "", location: "", teachingMode: "", minHourlyRate: "", maxHourlyRate: "" });
    setSearchParams({});
  }

  return (
    <>
      <section className="page-heading shell" data-reveal>
        <p className="section-kicker">Find your person</p>
        <h1>A tutor for the things you want to learn.</h1>
        <p>Explore subjects, compare availability, and book your next one-hour session.</p>
      </section>
      <section className="directory-section shell">
        <form className="tutor-filter-form" onSubmit={search} data-reveal>
          <label className="filter-keyword">
            Subject or keyword
            <input name="subject" value={filters.subject} onChange={updateFilter} placeholder="Mathematics, biology..." />
          </label>
          <label>
            Location
            <input name="location" value={filters.location} onChange={updateFilter} placeholder="City or area" />
          </label>
          <label>
            Teaching mode
            <select name="teachingMode" value={filters.teachingMode} onChange={updateFilter}>
              <option value="">Any mode</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
              <option value="Both">Online or offline</option>
            </select>
          </label>
          <label>
            Min. hourly fee
            <input name="minHourlyRate" type="number" min="0" step="0.01" value={filters.minHourlyRate} onChange={updateFilter} placeholder="Any" />
          </label>
          <label>
            Max. hourly fee
            <input name="maxHourlyRate" type="number" min="0" step="0.01" value={filters.maxHourlyRate} onChange={updateFilter} placeholder="Any" />
          </label>
          <div className="filter-actions">
            <button className="button button-dark" type="submit">Search tutors <span aria-hidden="true">↗</span></button>
            <button className="filter-reset" type="button" onClick={resetFilters}>Clear filters</button>
          </div>
        </form>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {loading ? <Loading label="Finding tutors..." /> : tutors.length ? (
          <>
            <p className="tutor-result-count" role="status">{tutors.length} {tutors.length === 1 ? "tutor" : "tutors"} found</p>
            <div className="tutor-grid">{tutors.map((tutor) => <TutorCard key={tutor._id} tutor={tutor} />)}</div>
          </>
        ) : (
          <div className="empty-state"><span className="empty-icon">✳</span><h2>No tutors match those filters</h2><p>Try changing your subject, location, teaching mode, or fee range.</p><button className="button button-dark" type="button" onClick={resetFilters}>Clear filters</button></div>
        )}
      </section>
    </>
  );
}
