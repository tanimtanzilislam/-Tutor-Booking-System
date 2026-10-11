import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { ErrorMessage, Loading } from "../components/PageState.jsx";
import TutorCard from "../components/TutorCard.jsx";

export default function TutorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const subjectParam = searchParams.get("subject") || "";
  const [subject, setSubject] = useState(subjectParam);
  const [query, setQuery] = useState(subjectParam);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setSubject(subjectParam);
    setQuery(subjectParam);
  }, [subjectParam]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const search = query.trim() ? `?subject=${encodeURIComponent(query.trim())}` : "";
    api(`/tutors${search}`)
      .then(({ tutors: result }) => { if (active) setTutors(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query]);

  function search(event) {
    event.preventDefault();
    const nextSubject = subject.trim();
    setQuery(nextSubject);
    setSearchParams(nextSubject ? { subject: nextSubject } : {});
  }

  return (
    <>
      <section className="page-heading shell">
        <p className="section-kicker">Find your person</p>
        <h1>A tutor for the things you want to learn.</h1>
        <p>Explore subjects, compare availability, and book your next one-hour session.</p>
      </section>
      <section className="directory-section shell">
        <form className="search-bar" onSubmit={search}>
          <label className="sr-only" htmlFor="subject-search">Find tutors by subject</label>
          <span aria-hidden="true">⌕</span>
          <input id="subject-search" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Try mathematics, biology, writing..." />
          <button className="button button-dark" type="submit">Search</button>
        </form>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {loading ? <Loading label="Finding tutors..." /> : tutors.length ? (
          <div className="tutor-grid">{tutors.map((tutor) => <TutorCard key={tutor._id} tutor={tutor} />)}</div>
        ) : (
          <div className="empty-state"><span className="empty-icon">✳</span><h2>No tutors found yet</h2><p>{query ? "Try another subject, or check back as more tutors join." : "There are no tutors to show right now. Check back soon."}</p></div>
        )}
      </section>
    </>
  );
}
