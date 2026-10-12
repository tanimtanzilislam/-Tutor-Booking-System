import { useState } from "react";
import { ErrorMessage } from "../components/PageState.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useToast } from "../components/ToastContext.jsx";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [imageFailed, setImageFailed] = useState(false);
  const [values, setValues] = useState({
    name: user.name,
    email: user.email,
    profileImage: user.profileImage || ""
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { notify } = useToast();

  function update(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (name === "profileImage") setImageFailed(false);
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!event.currentTarget.reportValidity()) return;

    setSaving(true);
    try {
      const result = await updateProfile(values);
      setValues({
        name: result.user.name,
        email: result.user.email,
        profileImage: result.user.profileImage || ""
      });
      setImageFailed(false);
      notify(result.message);
    } catch (requestError) {
      setError(requestError.message);
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="content-page shell">
      <div className="page-heading compact-heading" data-reveal>
        <p className="section-kicker">Your account</p>
        <h1>Edit profile</h1>
        <p>Update the personal details used across your MediQueue account.</p>
      </div>
      <form className="editor-card account-profile-form" onSubmit={submit} data-reveal>
        <div className="account-profile-preview">
          {values.profileImage && !imageFailed
            ? <img className="profile-large-avatar" src={values.profileImage} alt="" onError={() => setImageFailed(true)} />
            : <div className="profile-large-avatar profile-avatar-fallback" aria-hidden="true">{(values.name || user.name).slice(0, 1).toUpperCase()}</div>}
          <div>
            <span className="section-kicker">{user.role === "tutor" ? "Tutor account" : "Student account"}</span>
            <h2>{values.name || user.name}</h2>
            <p>Your account type cannot be changed.</p>
          </div>
        </div>
        <label>
          Full name
          <input name="name" value={values.name} onChange={update} autoComplete="name" required maxLength={80} />
        </label>
        <label>
          Email address
          <input name="email" type="email" value={values.email} onChange={update} autoComplete="email" required maxLength={254} />
        </label>
        <label>
          Profile photo URL
          <input
            name="profileImage"
            type="url"
            value={values.profileImage}
            onChange={update}
            autoComplete="url"
            placeholder="https://"
          />
          <span className="profile-field-hint">Leave blank to use your initials instead.</span>
        </label>
        <ErrorMessage>{error}</ErrorMessage>
        <div className="form-actions">
          <button className="button button-dark" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
      {user.role === "tutor" && (
        <p className="profile-listing-note">
          These are your account details. To edit your public teaching details or availability, use My Tutor Profile.
        </p>
      )}
    </section>
  );
}
