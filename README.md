# Lucy Sounds Backend API

This is the backend API for Lucy Sounds, a platform for musicians and music creators.

## Technologies Used

- Node.js
- Express.js
- Supabase for database and authentication
- JSON Web Tokens (JWT) for authentication
- Various APIs integration (Spotify, YouTube, etc.)

## Getting Started

### Prerequisites

- Node.js (v20.x or later)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mosheb2/lucy-backend.git
cd lucy-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
NODE_ENV=development
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
```

4. Start the development server:
```bash
npm run dev
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login a user
- `GET /api/auth/me`: Get current user information
- `POST /api/auth/refresh`: Refresh access token

### User Endpoints

- `GET /api/users`: Get all users
- `GET /api/users/:id`: Get a specific user
- `PUT /api/users/:id`: Update a user
- `DELETE /api/users/:id`: Delete a user

### Tracks Endpoints

- `GET /api/tracks`: Get all tracks
- `POST /api/tracks`: Create a new track
- `GET /api/tracks/:id`: Get a specific track
- `PUT /api/tracks/:id`: Update a track
- `DELETE /api/tracks/:id`: Delete a track

### Releases Endpoints

- `GET /api/releases`: Get all releases
- `POST /api/releases`: Create a new release
- `GET /api/releases/:id`: Get a specific release
- `PUT /api/releases/:id`: Update a release
- `DELETE /api/releases/:id`: Delete a release

## Deployment

The API is deployed on Heroku at: https://lucy-backend-c06206d06bbd.herokuapp.com/

### Heroku Deployment

To deploy to Heroku:

1. Ensure you have the Heroku CLI installed and are logged in
2. Add the Heroku remote:
```bash
heroku git:remote -a lucy-backend
```
3. Push to Heroku:
```bash
git push heroku main
```

## License

This project is proprietary and confidential. 