# MediQueue

MediQueue is a MERN tutor-booking application with a React/Vite client and an Express/Mongoose API.

## Requirements

- Node.js 20 or newer
- MongoDB running locally or an accessible MongoDB connection string

## Setup

1. Copy `server/.env.example` to `server/.env`.
2. Set `MONGODB_URI` and replace `JWT_SECRET` with a long, random secret.
3. Install packages from the project root with `npm install`, then install the client and server packages with `npm install --prefix client` and `npm install --prefix server`.
4. Start the client and API with `npm run dev`.
5. Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

The API allows the client origin in `CLIENT_ORIGIN` (default `http://localhost:5173`). The frontend proxies `/api` requests to `http://localhost:5000` during development.

## Implemented flows

- Student registration, login, session restoration, and logout
- Public tutor search by subject
- Authenticated tutor creation with a weekly availability window for each selected weekday
- One-hour bookings, checked against the tutor's recurring availability and existing bookings on the API
- A unique session token for every booking
- Authenticated profile and booked-session pages

Tutor availability is saved in the timezone of the tutor's browser when the tutor is added. Available booking times are displayed in the student's browser timezone. A booking is accepted only if it starts on the hour, falls within the tutor's weekly availability, and does not overlap another booking.

`My Tutors` is an authenticated placeholder because no additional behavior for that page was specified.

## Validation

- `npm run build` builds the client for production.
- `npm test --prefix server` runs the booking availability and conflict-rule tests.
