import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { ErrorMessage, Loading } from "../components/PageState.jsx";
import TutorEditorForm from "../components/TutorEditorForm.jsx";
import { useToast } from "../components/ToastContext.jsx";

export default function MyTutorsPage() {
  const { user } = useAuth();
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingTutor, setEditingTutor] = useState(null);
  const [deletingTutor, setDeletingTutor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const { notify } = useToast();

  useEffect(() => {
    let mounted = true;
    setError("");
    setLoading(true);
    api("/tutors/mine")
      .then(({ tutors: ownTutors }) => {
        if (mounted) setTutors(ownTutors);
      })
      .catch((requestError) => {
        if (mounted) setError(requestError.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [reload]);

  useEffect(() => {
    if (!editingTutor && !deletingTutor) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape" && !saving) {
        setEditingTutor(null);
        setDeletingTutor(null);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editingTutor, deletingTutor, saving]);

  async function updateTutor(details) {
    const result = await api(`/tutors/${editingTutor._id}`, {
      method: "PATCH",
      body: JSON.stringify(details)
    });
    setTutors((current) => current.map((tutor) => (
      tutor._id === result.tutor._id ? result.tutor : tutor
    )));
    setEditingTutor(null);
    notify(result.message || "Tutor updated successfully.");
  }

  async function removeTutor() {
    if (!deletingTutor || saving) return;
    setSaving(true);
    try {
      const result = await api(`/tutors/${deletingTutor._id}`, { method: "DELETE" });
      setTutors((current) => current.filter((tutor) => tutor._id !== deletingTutor._id));
      setDeletingTutor(null);
      notify(result.message || "Tutor removed successfully.");
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="content-page shell">
      <div className="page-heading compact-heading">
        <p className="section-kicker">Your space</p>
        <h1>My tutor profile</h1>
        <p>Manage your public teaching profile and its availability.</p>
      </div>
      {loading ? <Loading label="Loading your tutors..." /> : error ? (
        <div className="management-load-error">
          <ErrorMessage>{error}</ErrorMessage>
          <button className="button button-outline" type="button" onClick={() => setReload((current) => current + 1)}>Try again</button>
        </div>
      ) : (
        <>
          {tutors.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">T</span>
              <h2>No tutor profile yet</h2>
              <p>Your public tutor profile will appear here after you publish it.</p>
              <Link className="button button-dark" to="/add-tutor">Create your tutor profile</Link>
            </div>
          ) : (
            <div className="management-table-wrap">
              <table className="management-table">
                <thead>
                  <tr>
                    <th scope="col">Tutor</th>
                    <th scope="col">Subject</th>
                    <th scope="col">Hourly fee</th>
                    <th scope="col">Slots left</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tutors.map((tutor) => (
                    <tr key={tutor._id}>
                      <td>
                        <div className="managed-tutor">
                          <img src={tutor.photoUrl} alt="" />
                          <span>{tutor.name}</span>
                        </div>
                      </td>
                      <td>{tutor.subject}</td>
                      <td>${Number(tutor.hourlyRate).toFixed(2)} / hr</td>
                      <td>{tutor.totalSlots}</td>
                      <td>
                        <div className="management-actions">
                          <button className="button button-outline" type="button" onClick={() => setEditingTutor(tutor)}>Edit</button>
                          <button className="button button-danger-outline" type="button" onClick={() => setDeletingTutor(tutor)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {editingTutor && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setEditingTutor(null);
        }}>
          <section className="management-modal" role="dialog" aria-modal="true" aria-labelledby="edit-tutor-title">
            <div className="management-modal-heading">
              <div>
                <p className="section-kicker">Update your listing</p>
                <h2 id="edit-tutor-title">Edit tutor</h2>
              </div>
              <button className="modal-close" type="button" aria-label="Close edit form" onClick={() => setEditingTutor(null)}>×</button>
            </div>
            <TutorEditorForm
              key={editingTutor._id}
              tutor={editingTutor}
              profileName={user.name}
              submitLabel="Save changes"
              onCancel={() => setEditingTutor(null)}
              onSave={updateTutor}
            />
          </section>
        </div>
      )}

      {deletingTutor && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setDeletingTutor(null);
        }}>
          <section className="management-modal delete-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="delete-tutor-title">
            <div className="management-modal-heading">
              <div>
                <p className="section-kicker">Please confirm</p>
                <h2 id="delete-tutor-title">Remove this tutor?</h2>
              </div>
              <button className="modal-close" type="button" aria-label="Close confirmation" disabled={saving} onClick={() => setDeletingTutor(null)}>×</button>
            </div>
            <p><strong>{deletingTutor.name}</strong> will be removed from the public tutor listings. Existing session history will be preserved.</p>
            <div className="form-actions">
              <button className="button button-outline" type="button" disabled={saving} onClick={() => setDeletingTutor(null)}>Keep tutor</button>
              <button className="button button-danger" type="button" disabled={saving} onClick={removeTutor}>{saving ? "Removing..." : "Remove tutor"}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
