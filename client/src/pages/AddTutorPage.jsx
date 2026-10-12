import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import TutorEditorForm from "../components/TutorEditorForm.jsx";
import { useToast } from "../components/ToastContext.jsx";

export default function AddTutorPage() {
  const { user } = useAuth();
  const { notify } = useToast();

  async function createTutor(details) {
    const result = await api("/tutors", {
      method: "POST",
      body: JSON.stringify(details)
    });
    notify(result.message || "Your tutor profile was created successfully.");
  }

  return (
    <section className="form-page shell">
      <div className="form-page-intro" data-reveal>
        <p className="section-kicker">Share what you know</p>
        <h1>Create your tutor profile</h1>
        <p>This creates your own public tutor profile—not an account or listing for another teacher. Add your teaching details and weekly schedule. Times are saved in your current timezone.</p>
      </div>
      <div data-reveal>
        <TutorEditorForm profileName={user.name} submitLabel="Publish my profile" onSave={createTutor} />
      </div>
    </section>
  );
}
