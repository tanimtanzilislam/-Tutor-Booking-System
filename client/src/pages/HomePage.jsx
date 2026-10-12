import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import TutorCard from "../components/TutorCard.jsx";
import { ErrorMessage, Loading } from "../components/PageState.jsx";

const slides = [
  {
    eyebrow: "Learning, made personal",
    title: "A great tutor can change the way you see a subject.",
    text: "Find thoughtful one-to-one support and make your next learning goal feel closer.",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1800&q=85",
    alt: "Student reading a book at a desk"
  },
  {
    eyebrow: "Your pace, your place",
    title: "Make space for the questions you want to ask.",
    text: "Browse tutors by subject and book a focused hour that fits your week.",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1800&q=85",
    alt: "Students studying together around a table"
  },
  {
    eyebrow: "Small steps add up",
    title: "Build confidence one session at a time.",
    text: "Turn a tricky topic into a plan, with a tutor ready to help you move forward.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1800&q=85",
    alt: "Learner attending an online class on a laptop"
  }
];

export default function HomePage() {
  const [active, setActive] = useState(0);
  const [tutors, setTutors] = useState([]);
  const [tutorsLoading, setTutorsLoading] = useState(true);
  const [tutorsError, setTutorsError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setActive((index) => (index + 1) % slides.length), 7000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let current = true;
    api("/tutors/featured")
      .then(({ tutors: result }) => { if (current) setTutors(result); })
      .catch((requestError) => { if (current) setTutorsError(requestError.message); })
      .finally(() => { if (current) setTutorsLoading(false); });
    return () => { current = false; };
  }, []);

  const slide = slides[active];
  const subjects = [...new Set(tutors.map((tutor) => tutor.subject))];
  return (
    <>
      <section className="hero shell" aria-label="Featured learning stories" data-reveal>
        <img key={slide.image} className="hero-image" src={slide.image} alt={slide.alt} />
        <div className="hero-shade" />
        <div className="hero-content" key={active}>
          <p className="eyebrow">{slide.eyebrow}</p>
          <h1>{slide.title}</h1>
          <p className="hero-copy">{slide.text}</p>
          <Link className="button button-light" to="/tutors">Explore tutors <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="carousel-controls">
          <button type="button" aria-label="Previous slide" onClick={() => setActive((active + slides.length - 1) % slides.length)}>←</button>
          <div className="carousel-dots" aria-label={`Slide ${active + 1} of ${slides.length}`}>
            {slides.map((item, index) => (
              <button
                key={item.eyebrow}
                type="button"
                aria-label={`Show slide ${index + 1}`}
                aria-current={active === index ? "true" : undefined}
                className={active === index ? "active" : ""}
                onClick={() => setActive(index)}
              />
            ))}
          </div>
          <button type="button" aria-label="Next slide" onClick={() => setActive((active + 1) % slides.length)}>→</button>
        </div>
      </section>

      <section className="available-tutors-section shell" aria-labelledby="available-tutors-heading" data-reveal>
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Start somewhere good</p>
            <h2 id="available-tutors-heading">Available tutors</h2>
            <p>Meet tutors ready to help you take your next step.</p>
          </div>
          <Link className="text-link" to="/tutors">Browse all tutors <span aria-hidden="true">↗</span></Link>
        </div>
        {tutorsError ? <ErrorMessage>{tutorsError}</ErrorMessage> : tutorsLoading ? (
          <Loading label="Finding available tutors..." />
        ) : tutors.length ? (
          <div className="tutor-grid featured-tutor-grid">
            {tutors.map((tutor) => <TutorCard key={tutor._id} tutor={tutor} />)}
          </div>
        ) : (
          <div className="featured-empty-state">
            <span className="empty-icon">✳</span>
            <div><h3>New tutors are on their way</h3><p>Check the tutor directory again soon to see who’s available.</p></div>
            <Link className="button button-dark" to="/tutors">Explore tutors</Link>
          </div>
        )}
      </section>

      <section className="subject-explore-section">
        <div className="shell subject-explore-inner">
          <div>
            <p className="section-kicker">Follow your curiosity</p>
            <h2>Find help in a subject that matters to you.</h2>
            <p>Start with a subject, then choose a tutor whose weekly schedule works for you.</p>
          </div>
          {subjects.length ? (
            <div className="subject-links" aria-label="Subjects offered by available tutors" data-reveal>
              {subjects.map((subject) => (
                <Link key={subject} to={`/tutors?subject=${encodeURIComponent(subject)}`}>
                  {subject}<span aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
          ) : (
            <Link className="button button-dark" to="/tutors">Browse all subjects</Link>
          )}
        </div>
      </section>

      <section className="intro-section shell" id="how-it-works" data-reveal>
        <div className="section-kicker">A clearer way to learn</div>
        <div className="intro-grid">
          <h2>Good learning starts with the right conversation.</h2>
          <p>Search by subject, explore tutor availability, and book an hour that works. Your session details and token stay together in one place.</p>
        </div>
        <div className="steps-grid">
          <article><span>01</span><h3>Find your subject</h3><p>Browse the tutor directory and filter for the help you need.</p></article>
          <article><span>02</span><h3>Choose a time</h3><p>See available one-hour sessions in your local timezone.</p></article>
          <article><span>03</span><h3>Keep your token</h3><p>Your booking confirmation includes a unique session token.</p></article>
        </div>
      </section>
      <section className="session-prep-section" data-reveal>
        <div className="shell session-prep-inner">
          <div className="session-prep-heading">
            <p className="section-kicker">Make it your hour</p>
            <h2>A little preparation can open up a lot.</h2>
            <p>Bring what you’re working on and your tutor can help you make the session count.</p>
          </div>
          <div className="prep-cards">
            <article><span>01</span><h3>Pick one thing</h3><p>Think of a question, topic, or learning goal you’d like to focus on.</p></article>
            <article><span>02</span><h3>Bring your questions</h3><p>Share where you feel stuck so you and your tutor can get started together.</p></article>
            <article><span>03</span><h3>Keep your token handy</h3><p>Your booking confirmation gives you a unique token for your session.</p></article>
          </div>
        </div>
      </section>
      <section className="home-cta" data-reveal>
        <div className="shell home-cta-inner">
          <div><p className="eyebrow">A next step is waiting</p><h2>Curiosity looks good on you.</h2></div>
          <Link className="button button-dark" to="/tutors">Meet the tutors <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </>
  );
}
