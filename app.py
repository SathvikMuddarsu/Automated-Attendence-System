"""
app.py — Facial Recognition Attendance System
===============================================
Routes:
  POST /register       — Register new user with face
  POST /login          — Mark attendance via face
  GET  /attendance     — Get today's attendance (present/absent)
  GET  /attendance/all — Full attendance history
"""

import os, base64, io, json, sqlite3
from datetime import date, datetime
import numpy as np
import face_recognition
from PIL import Image
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

app     = Flask(__name__)
CORS(app)

DB_PATH   = "users.db"
FACE_DIR  = "face_data"
TOLERANCE = 0.50
os.makedirs(FACE_DIR, exist_ok=True)

# ── Database ────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn, conn.cursor()

def init_db():
    conn, cur = get_db()
    # Users table — stores face encodings
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            username  TEXT UNIQUE NOT NULL,
            encoding  TEXT NOT NULL,
            created   DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Attendance table — one record per user per day
    cur.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id   INTEGER NOT NULL,
            username  TEXT NOT NULL,
            date      TEXT NOT NULL,
            time      TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, date)
        )
    """)
    conn.commit()
    conn.close()

# ── Image helpers ───────────────────────────────────────────────

def decode_image(b64):
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    return np.array(Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB"))

def get_encoding(img_array):
    locs = face_recognition.face_locations(img_array, model="hog")
    if not locs:
        return None, "No face detected."
    if len(locs) > 1:
        locs = [max(locs, key=lambda l: (l[2]-l[0])*(l[1]-l[3]))]
    encs = face_recognition.face_encodings(img_array, locs)
    if not encs:
        return None, "Could not encode face."
    return encs[0], None

# ── HTML Pages ──────────────────────────────────────────────────

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

@app.route("/attendance-page")
def attendance_page():
    return render_template("attendance.html")

# ── API: Register ───────────────────────────────────────────────

@app.route("/register", methods=["POST"])
def register():
    data      = request.get_json(silent=True) or {}
    username  = (data.get("username") or "").strip()
    image_b64 = data.get("image") or ""

    if not username:
        return jsonify({"success": False, "message": "Username required."}), 400
    if not image_b64:
        return jsonify({"success": False, "message": "No image received."}), 400

    conn, cur = get_db()
    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    if cur.fetchone():
        conn.close()
        return jsonify({"success": False, "message": f"'{username}' is already registered."}), 409

    try:
        img = decode_image(image_b64)
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": f"Image error: {e}"}), 400

    enc, err = get_encoding(img)
    if err:
        conn.close()
        return jsonify({"success": False, "message": err}), 422

    cur.execute("INSERT INTO users (username, encoding) VALUES (?,?)",
                (username, json.dumps(enc.tolist())))
    conn.commit()
    conn.close()
    return jsonify({
        "success": True,
        "message": f"'{username}' registered successfully!",
        "username": username
    })

# ── API: Login / Mark Attendance ────────────────────────────────

@app.route("/login", methods=["POST"])
def login():
    data      = request.get_json(silent=True) or {}
    image_b64 = data.get("image") or ""

    if not image_b64:
        return jsonify({"success": False, "message": "No image received."}), 400

    try:
        img = decode_image(image_b64)
    except Exception as e:
        return jsonify({"success": False, "message": f"Image error: {e}"}), 400

    enc, err = get_encoding(img)
    if err:
        return jsonify({"success": False, "message": err}), 422

    conn, cur = get_db()
    cur.execute("SELECT id, username, encoding FROM users")
    rows = cur.fetchall()

    if not rows:
        conn.close()
        return jsonify({"success": False, "message": "No users registered yet."}), 404

    known_encs  = [np.array(json.loads(r["encoding"])) for r in rows]
    known_ids   = [r["id"]       for r in rows]
    known_names = [r["username"] for r in rows]

    matches   = face_recognition.compare_faces(known_encs, enc, tolerance=TOLERANCE)
    distances = face_recognition.face_distance(known_encs, enc)
    best      = int(np.argmin(distances))

    if not matches[best]:
        conn.close()
        return jsonify({"success": False, "message": "Face not recognized. Please try again."}), 401

    uid        = known_ids[best]
    username   = known_names[best]
    confidence = round((1 - float(distances[best])) * 100, 1)
    today      = date.today().isoformat()
    now        = datetime.now().strftime("%H:%M:%S")

    # Check if already marked today
    cur.execute("SELECT id FROM attendance WHERE user_id=? AND date=?", (uid, today))
    already = cur.fetchone()

    if already:
        conn.close()
        return jsonify({
            "success":       True,
            "message":       f"Attendance already marked for {username} today!",
            "username":      username,
            "confidence":    confidence,
            "already_marked": True,
            "time":          now
        })

    # Mark attendance
    cur.execute(
        "INSERT INTO attendance (user_id, username, date, time) VALUES (?,?,?,?)",
        (uid, username, today, now)
    )
    conn.commit()
    conn.close()

    return jsonify({
        "success":       True,
        "message":       f"Attendance marked for {username}!",
        "username":      username,
        "confidence":    confidence,
        "already_marked": False,
        "time":          now
    })

# ── API: Get Attendance (present + absent) ──────────────────────

@app.route("/attendance", methods=["GET"])
def get_attendance():
    today = request.args.get("date", date.today().isoformat())
    conn, cur = get_db()

    # All registered users
    cur.execute("SELECT username FROM users ORDER BY username")
    all_users = [r["username"] for r in cur.fetchall()]

    # Who attended today
    cur.execute(
        "SELECT username, time FROM attendance WHERE date=? ORDER BY time",
        (today,)
    )
    present_rows  = cur.fetchall()
    present       = [{"username": r["username"], "time": r["time"]} for r in present_rows]
    present_names = [p["username"] for p in present]
    absent        = [u for u in all_users if u not in present_names]

    conn.close()
    return jsonify({
        "date":          today,
        "present":       present,
        "absent":        absent,
        "total":         len(all_users),
        "present_count": len(present),
        "absent_count":  len(absent)
    })

# ── API: Full Attendance History ────────────────────────────────

@app.route("/attendance/all", methods=["GET"])
def get_all_attendance():
    conn, cur = get_db()
    cur.execute(
        "SELECT username, date, time FROM attendance ORDER BY date DESC, time DESC"
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return jsonify({"records": rows, "count": len(rows)})

# ── API: List Users ─────────────────────────────────────────────

@app.route("/users", methods=["GET"])
def list_users():
    conn, cur = get_db()
    cur.execute("SELECT id, username, created FROM users ORDER BY username")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return jsonify({"users": rows, "count": len(rows)})

# ── Start ───────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    print("\n✅  Attendance System running at http://127.0.0.1:5000\n")
    app.run(debug=True, host="0.0.0.0", port=5000)