# FaceAuth — Facial Recognition Authentication System

A production-ready web application that uses biometric facial recognition for user registration and login. Built with **Flask** + **face_recognition** on the backend and vanilla HTML/CSS/JS on the frontend.

---

## Tech Stack

| Layer      | Technology                           |
|------------|--------------------------------------|
| Backend    | Python 3, Flask, flask-cors          |
| Face AI    | face_recognition (dlib), OpenCV      |
| Database   | SQLite (via Python's built-in sqlite3)|
| Frontend   | HTML5, CSS3 (custom), Vanilla JS     |
| Camera API | `navigator.mediaDevices.getUserMedia`|

---

## Project Structure

```
face_auth/
├── app.py                   # Flask server + API routes
├── requirements.txt         # Python dependencies
├── setup.sh                 # Automated setup script
├── users.db                 # SQLite DB (auto-created on first run)
├── face_data/               # (Optional) raw face image storage
├── static/
│   ├── css/
│   │   └── style.css        # All styles
│   └── js/
│       ├── camera.js        # Shared webcam + capture utility
│       ├── register.js      # Registration logic
│       ├── login.js         # Login logic
│       ├── result.js        # Result page renderer
│       └── main.js          # Home page animations
└── templates/
    ├── index.html           # Home / landing page
    ├── register.html        # Face registration page
    ├── login.html           # Face login page
    └── result.html          # Auth result page
```

---

## Step-by-step Setup

### Prerequisites

- Python 3.8+
- A webcam
- A modern browser (Chrome/Firefox/Edge)
- Linux/macOS recommended; Windows users may need Visual Studio Build Tools for dlib

### Option A — Automated (Linux/macOS)

```bash
cd face_auth
chmod +x setup.sh
bash setup.sh
source venv/bin/activate
python app.py
```

### Option B — Manual

```bash
# 1. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 2. Install system deps (Ubuntu/Debian)
sudo apt-get install -y build-essential cmake libopenblas-dev liblapack-dev python3-dev

# 3. Install Python packages
pip install --upgrade pip
pip install -r requirements.txt

# 4. Run the server
python app.py
```

### Open the app

Navigate to **http://127.0.0.1:5000** in your browser.

---

## API Reference

### `POST /register`

Register a new user with their face.

**Request body (JSON):**
```json
{
  "username": "alice",
  "image":    "data:image/png;base64,iVBOR..."
}
```

**Success response:**
```json
{ "success": true, "message": "User 'alice' registered successfully!", "username": "alice" }
```

**Error responses:**
- `400` — Missing username or image
- `409` — Username already registered
- `422` — No face detected / encoding failed

---

### `POST /login`

Authenticate a user via facial recognition.

**Request body (JSON):**
```json
{ "image": "data:image/png;base64,iVBOR..." }
```

**Success response:**
```json
{ "success": true, "message": "Welcome back, alice!", "username": "alice", "confidence": 87.3 }
```

**Error responses:**
- `400` — No image provided
- `401` — Face not recognized
- `404` — No users registered
- `422` — No face detected

---

### `GET /users`

List all registered users (admin/debug).

---

## How It Works

1. **Registration:** The browser captures a webcam frame → draws it to a `<canvas>` → encodes as base64 PNG → POSTs to `/register`. Flask decodes the image, detects the face, and generates a 128-dimensional vector (embedding) using dlib's ResNet model. The embedding is stored as JSON in SQLite.

2. **Login:** Same capture flow, POSTs to `/login`. Flask loads all stored embeddings, computes the Euclidean distance between the incoming encoding and each stored one using `face_recognition.face_distance()`, and returns a match if the closest distance is within the configured tolerance (default: **0.50**).

---

## Configuration

Edit these constants near the top of `app.py`:

| Variable    | Default   | Description                                    |
|-------------|-----------|------------------------------------------------|
| `TOLERANCE` | `0.50`    | Match threshold (lower = stricter, 0.4–0.6)   |
| `DB_PATH`   | `users.db`| SQLite file path                               |
| `FACE_DIR`  | `face_data`| Directory for optional image persistence      |

---

## Security Notes

- Face encodings (not raw photos) are stored — more privacy-preserving.
- Input validation on both client and server.
- No face detected → explicit error, no crash.
- Multiple faces → largest face is selected automatically.

## Liveness Detection (Optional Enhancement)

To prevent photo-spoofing attacks, consider adding:
- **Blink detection** using Eye Aspect Ratio (EAR) with MediaPipe
- **Head movement challenge** (look left/right) before capture
- **Depth estimation** (requires RGB-D camera or dual-lens)
- **3D face mesh** via MediaPipe Face Mesh for liveness signals

---

## Troubleshooting

| Problem                         | Solution                                              |
|---------------------------------|-------------------------------------------------------|
| `dlib` install fails            | Install cmake + build-essential first                |
| Camera permission denied        | Allow camera in browser settings                     |
| `No face detected`              | Improve lighting; face the camera directly           |
| `Face not recognized`           | Lower `TOLERANCE` slightly (try 0.55); re-register  |
| Port 5000 in use                | Change port in `app.py` → `app.run(port=5001)`      |
| Windows dlib build error        | Install Visual Studio Build Tools 2022               |
