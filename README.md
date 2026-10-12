# MediQueue

MediQueue is a MERN tutor-booking application with a React/Vite client and an Express/Mongoose API.

## Visual direction

The interface uses an editorial learning-studio style: warm paper backgrounds, deep ink typography, teal and coral accents, consistent rounded buttons, and uniform image-led tutor cards. The shared layout and card grid adapt across desktop, tablet, and mobile widths.
Subtle reveal, carousel, card, and modal animations support the visual system; users who prefer reduced motion receive static transitions.

## Requirements

- Node.js 20 or newer
- MongoDB running locally or an accessible MongoDB connection string

## Setup

1. Copy `server/.env.example` to `server/.env`.
2. Set `MONGODB_URI` and replace `JWT_SECRET` with a long, random secret.
3. To enable Google sign-in, configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` from a Google OAuth web client. Register the callback URL in the Google Cloud OAuth client settings.
4. Install packages from the project root with `npm install`, then install the client and server packages with `npm install --prefix client` and `npm install --prefix server`.
5. Start the client and API with `npm run dev`.
6. Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

The API allows the client origin in `CLIENT_ORIGIN` (default `http://localhost:5173`). The frontend proxies `/api` requests to `http://localhost:5000` during development.
For local Google OAuth, register `http://localhost:5000/api/auth/google/callback` as an authorized redirect URI in your Google Cloud OAuth web client. Add the OAuth values to your existing `server/.env`; do not replace its MongoDB connection or JWT secret.

## Implemented flows

- Student registration, login, session restoration, and logout
- Accounts choose a student or tutor role at registration; tutor-management and student-booking sections are restricted by role
- JWT sessions for password and Google login; bearer tokens are persisted on the client and verified by middleware on protected API routes
- Registration requires a name, email, photo URL, and password; successful registration returns to Login
- Google OAuth login (requires Google OAuth credentials)
- Registration validates passwords for at least six characters, one uppercase letter, and one lowercase letter
- Public tutor search by subject
- Tutor directory filtering by subject, location, teaching mode, and minimum/maximum hourly fee
- Persistent light/dark theme toggle available from the navbar across all routes
- A home-page featured tutor section that retrieves up to six recent tutors using a MongoDB aggregation `$limit` stage
- Tutor detail pages with weekly availability and one-hour booking
- Homepage subject links that open the tutor directory with the subject filter applied
- Tutor-only listing creation with photo URL, subject, institution, experience, location, teaching mode, hourly fee, session start date, total booking capacity, and weekly availability
- A private My Tutors table for the signed-in user's own tutor listings, with full-field editing and confirmed removal
- Tutor ownership checks on listing updates/removal; removal hides the profile while retaining booking history and is blocked while confirmed sessions exist
- Student booking requests remain pending until the tutor confirms or declines; requests are checked against recurring availability and existing bookings on the API
- Private tutor-detail booking form with student and tutor details, validated phone number, generated session token, and a remaining-capacity counter reserved while approval is pending
- A private booked-sessions table scoped to the signed-in student, with pending/confirmed/rejected/cancelled statuses and confirmation before cancellation
- Persistent in-app tutor notifications for student booking requests and cancellations, including the student's profile, an unread badge, periodic updates, mark-as-read controls, and confirm/decline actions
- Dynamic page titles, a not-found/error view, loading spinner, and operation toasts
- A unique session token for every booking
- Authenticated profile and booked-session pages
- Student and tutor account profile editing for name, email, and profile photo URL; account role cannot be changed from the profile form

Tutor availability is saved in the timezone of the tutor's browser when the tutor is added. Available booking times are displayed in the student's browser timezone. Students can book in advance; the selected session must start on the hour, fall within the tutor's weekly availability, be on or after the tutor's session start date, not overlap another booking, and have remaining total booking capacity. Capacity is decremented atomically after checks, and each available weekday's schedule repeats weekly from the session start date.

Tutor session start dates are stored and returned as date-only values. Legacy MongoDB date values are normalized to their UTC calendar date when tutor profiles are returned or bookings are checked.

Booking requests reserve one tutor slot while pending. Tutor confirmation keeps the reservation; tutor decline or student cancellation restores the slot. Pending and confirmed sessions prevent overlapping bookings, while rejected and cancelled bookings do not block the time.

The homepage also includes subject exploration and session-preparation sections. Tutor cards link to their detail pages, where students can choose an available session and book it.

No live deployment URL is configured for this project yet.

## Validation

- `npm run build` builds the client for production.
- `npm test --prefix server` runs booking availability/conflict, tutor input-validation, and notification model tests.
