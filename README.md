# MediQueue

MediQueue is a MERN tutor-booking application with a React/Vite client and an Express/Mongoose API.

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
- Registration requires a name, email, photo URL, and password; successful registration returns to Login
- Google OAuth login (requires Google OAuth credentials)
- Registration validates passwords for at least six characters, one uppercase letter, and one lowercase letter
- Public tutor search by subject
- A home-page featured tutor section that retrieves up to six recent tutors using a MongoDB aggregation `$limit` stage
- Tutor detail pages with weekly availability and one-hour booking
- Homepage subject links that open the tutor directory with the subject filter applied
- Authenticated tutor creation with photo URL, subject, institution, experience, location, teaching mode, hourly fee, session start date, total booking capacity, and weekly availability
- One-hour bookings, checked against the tutor's recurring availability and existing bookings on the API
- Private tutor-detail booking form with student and tutor details, validated phone number, generated booking status, and a remaining-capacity counter decremented on successful booking
- A unique session token for every booking
- Authenticated profile and booked-session pages

Tutor availability is saved in the timezone of the tutor's browser when the tutor is added. Available booking times are displayed in the student's browser timezone. A booking is accepted only if it starts on the hour, falls within the tutor's weekly availability, is on or after the tutor's session start date, does not overlap another booking, and remaining total booking capacity is available. Capacity is decremented atomically after checks, and each available weekday's schedule repeats weekly from the session start date.

`My Tutors` is an authenticated placeholder because no additional behavior for that page was specified.

The homepage also includes subject exploration and session-preparation sections. Tutor cards link to their detail pages, where students can choose an available session and book it.

## Validation

- `npm run build` builds the client for production.
- `npm test --prefix server` runs the booking availability and conflict-rule tests.
