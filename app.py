"""
app.py — Facial Recognition Authentication Backend
====================================================
Flask REST API for face-based user registration and login.
Uses the `face_recognition` library (dlib under the hood) for
encoding and comparison, and SQLite for persistent storage.
"""

import os
import base64
import io
import json
import sqlite3
import numpy as np
import face_recognition
from PIL import Image
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

# ── App setup ──────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)                             # Allow cross-origin requests from the frontend

DB_PATH  = "users.db"                # SQLite database file
FACE_DIR = "face_data"               # Directory to persist raw face images (optional)
os.makedirs(FACE_DIR, exist_ok=True)

TOLERANCE = 0.50   # Lower = stricter match (0.4–0.6 is a good range)

# ── Database helpers ────────────────────────────────────────────────────────────

def get_db():
    """Open a database connection and return (conn, cursor)."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row   # rows behave like dicts
    return conn, conn.cursor()


def init_db():
    """Create the users table if it doesn't already exist."""
    conn, cur = get_db()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            username  TEXT    UNIQUE NOT NULL,
            encoding  TEXT    NOT NULL,   -- JSON list of 128 floats
            created   DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


# ── Image helpers ───────────────────────────────────────────────────────────────

def decode_base64_image(b64_string: str) -> np.ndarray:
    """
    Convert a base64-encoded image string (from the frontend canvas)
    into an RGB numpy array suitable for face_recognition.
    """
    # Strip the data-URL header if present  e.g. "data:image/png;base64,..."
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]

    img_bytes = base64.b64decode(b64_string)
    pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return np.array(pil_image)


def extract_encoding(image_array: np.ndarray):
    """
    Detect faces in the image and return the 128-d encoding of the
    largest face, or None if no face is found.
    """
    # face_recognition expects RGB; OpenCV uses BGR — PIL.convert("RGB") already handles this
    locations = face_recognition.face_locations(image_array, model="hog")

    if not locations:
        return None, "No face detected in the image."

    if len(locations) > 1:
        # Pick the largest bounding box (most prominent face)
        largest = max(locations, key=lambda loc: (loc[2]-loc[0]) * (loc[1]-loc[3]))
        locations = [largest]

    encodings = face_recognition.face_encodings(image_array, locations)
    if not encodings:
        return None, "Could not encode the detected face."

    return encodings[0], None   # (128-d numpy array, no error)


# ── Routes ──────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/register-page")
def register_page():
    return render_template("register.html")


@app.route("/login-page")
def login_page():
    return render_template("login.html")


@app.route("/result-page")
def result_page():
    return render_template("result.html")


# ── /register (POST) ────────────────────────────────────────────────────────────
@app.route("/register", methods=["POST"])
def register():
    """
    Accepts JSON: { "username": "alice", "image": "<base64 PNG>" }
    Encodes the face and stores the encoding in SQLite.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "message": "Invalid JSON body."}), 400

    username = (data.get("username") or "").strip()
    image_b64 = data.get("image") or ""

    # ── Validate inputs
    if not username:
        return jsonify({"success": False, "message": "Username is required."}), 400
    if len(username) < 2 or len(username) > 32:
        return jsonify({"success": False, "message": "Username must be 2–32 characters."}), 400
    if not image_b64:
        return jsonify({"success": False, "message": "No image received."}), 400

    # ── Check for existing username
    conn, cur = get_db()
    cur.execute("SELECT id FROM users WHERE username = ?", (username,))
    if cur.fetchone():
        conn.close()
        return jsonify({"success": False, "message": f"Username '{username}' is already registered."}), 409

    # ── Decode image & extract face encoding
    try:
        image_array = decode_base64_image(image_b64)
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": f"Image decode error: {e}"}), 400

    encoding, error = extract_encoding(image_array)
    if error:
        conn.close()
        return jsonify({"success": False, "message": error}), 422

    # ── Persist encoding as JSON list
    encoding_json = json.dumps(encoding.tolist())
    cur.execute(
        "INSERT INTO users (username, encoding) VALUES (?, ?)",
        (username, encoding_json)
    )
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": f"User '{username}' registered successfully!",
        "username": username
    })


# ── /login (POST) ───────────────────────────────────────────────────────────────
@app.route("/login", methods=["POST"])
def login():
    """
    Accepts JSON: { "image": "<base64 PNG>" }
    Encodes the incoming face and compares it against all stored encodings.
    Returns the matched username or an error.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "message": "Invalid JSON body."}), 400

    image_b64 = data.get("image") or ""
    if not image_b64:
        return jsonify({"success": False, "message": "No image received."}), 400

    # ── Decode image & extract face encoding
    try:
        image_array = decode_base64_image(image_b64)
    except Exception as e:
        return jsonify({"success": False, "message": f"Image decode error: {e}"}), 400

    encoding, error = extract_encoding(image_array)
    if error:
        return jsonify({"success": False, "message": error}), 422

    # ── Load all stored encodings from DB
    conn, cur = get_db()
    cur.execute("SELECT username, encoding FROM users")
    rows = cur.fetchall()
    conn.close()

    if not rows:
        return jsonify({"success": False, "message": "No registered users found. Please register first."}), 404

    # ── Compare against each stored encoding
    known_encodings = []
    known_usernames = []
    for row in rows:
        stored = np.array(json.loads(row["encoding"]))
        known_encodings.append(stored)
        known_usernames.append(row["username"])

    # compare_faces returns a list of True/False per known encoding
    matches = face_recognition.compare_faces(known_encodings, encoding, tolerance=TOLERANCE)

    # Also compute distance for the best match (lower = more similar)
    distances = face_recognition.face_distance(known_encodings, encoding)
    best_idx  = int(np.argmin(distances))

    if matches[best_idx]:
        matched_user = known_usernames[best_idx]
        confidence   = round((1 - float(distances[best_idx])) * 100, 1)
        return jsonify({
            "success": True,
            "message": f"Welcome back, {matched_user}!",
            "username": matched_user,
            "confidence": confidence
        })

    return jsonify({
        "success": False,
        "message": "Face not recognized. Please try again or register."
    }), 401


# ── /users (GET) — debug / admin only ──────────────────────────────────────────
@app.route("/users", methods=["GET"])
def list_users():
    """Return a list of registered usernames (no encodings)."""
    conn, cur = get_db()
    cur.execute("SELECT id, username, created FROM users ORDER BY created DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return jsonify({"users": rows, "count": len(rows)})


# ── Startup ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    print("\n✅  Face Auth server running at http://127.0.0.1:5000\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
