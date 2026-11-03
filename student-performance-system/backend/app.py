from __future__ import annotations

import json
import re
import secrets
import sqlite3
import sys
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from flask import Flask, g, jsonify, request, send_file, session
from flask_cors import CORS
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from werkzeug.security import check_password_hash, generate_password_hash


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "dataset"
MODEL_DIR = ROOT / "saved_models"
DB_PATH = Path(__file__).resolve().parent / "database" / "students.db"
SESSION_KEY_PATH = Path(__file__).resolve().parent / "database" / "session.key"
FRONTEND_DIR = Path(__file__).resolve().parent / "static"
CSV_PATH = DATA_DIR / "student_performance.csv"
FEATURES = ["attendance", "previous_marks", "study_hours", "internal_marks"]
INPUT_LIMITS = {
    "attendance": (0.0, 100.0),
    "previous_marks": (0.0, 100.0),
    "study_hours": (0.0, 24.0),
    "internal_marks": (0.0, 20.0),
}
PERFORMANCE_LABELS = ["Poor Performance", "Average Performance", "Good Performance"]
RISK_LABELS = ["High Risk", "Medium Risk", "Low Risk"]

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
if SESSION_KEY_PATH.exists():
    app.secret_key = SESSION_KEY_PATH.read_text(encoding="utf-8").strip()
else:
    SESSION_KEY_PATH.parent.mkdir(parents=True, exist_ok=True)
    app.secret_key = secrets.token_hex(32)
    SESSION_KEY_PATH.write_text(app.secret_key, encoding="utf-8")
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False,
    PERMANENT_SESSION_LIFETIME=8 * 60 * 60,
)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"error": "Please sign in to continue.", "code": "authentication_required"}), 401
        return view(*args, **kwargs)
    return wrapped


def current_user() -> dict:
    return {
        "id": int(session["user_id"]),
        "name": session["user_name"],
        "email": session["user_email"],
        "workspace": session["workspace_name"],
    }


def visible_students_sql() -> tuple[str, tuple[int]]:
    return "(owner_id IS NULL OR owner_id = ?)", (int(session["user_id"]),)


def performance_category(marks: float) -> str:
    if marks >= 75:
        return "Good Performance"
    if marks >= 50:
        return "Average Performance"
    return "Poor Performance"


def academic_risk(marks: float) -> str:
    if marks >= 70:
        return "Low Risk"
    if marks >= 45:
        return "Medium Risk"
    return "High Risk"


def connect_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def generate_synthetic_data(n_samples: int = 600, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    attendance = np.clip(rng.normal(76, 14, n_samples), 10, 100)
    previous = np.clip(30 + 0.62 * attendance + rng.normal(0, 12, n_samples), 0, 100)
    study = np.clip(rng.gamma(2.2, 1.35, n_samples) + attendance * 0.018, 0.25, 12)
    internal = np.clip(0.10 * previous + 0.055 * attendance + rng.normal(0, 2.4, n_samples), 0, 20)
    final = np.clip(
        0.18 * attendance + 0.32 * previous + 0.15 * (study * 8.0)
        + 0.25 * (internal * 5.0) + 0.15 * study**2 + 8.0
        + rng.normal(0, 7.0, n_samples),
        0,
        100,
    )
    frame = pd.DataFrame(
        {
            "student_id": [f"STU2024{i:04d}" for i in range(1, n_samples + 1)],
            "student_name": [f"Student {i}" for i in range(1, n_samples + 1)],
            "attendance": attendance.round(1),
            "previous_marks": previous.round(1),
            "study_hours": study.round(1),
            "internal_marks": internal.round(1),
            "final_marks": final.round(1),
        }
    )
    frame["performance_category"] = frame["final_marks"].map(performance_category)
    frame["academic_risk"] = frame["final_marks"].map(academic_risk)
    return frame


def validate_dataset(frame: pd.DataFrame) -> pd.DataFrame:
    required = set(FEATURES + ["final_marks"])
    missing_columns = sorted(required - set(frame.columns))
    if missing_columns:
        raise ValueError(f"CSV is missing required columns: {', '.join(missing_columns)}")
    result = frame.copy().drop_duplicates()
    for column in FEATURES + ["final_marks"]:
        result[column] = pd.to_numeric(result[column], errors="coerce")
        if column == "final_marks":
            result = result.dropna(subset=["final_marks"])
        low, high = (0, 100) if column in ("attendance", "previous_marks", "final_marks") else (
            (0, 24) if column == "study_hours" else (0, 20)
        )
        invalid = result[column].notna() & ~result[column].between(low, high)
        if invalid.any():
            raise ValueError(f"{column} values must be within {low}–{high}.")
    result = result.dropna(subset=["final_marks"]).reset_index(drop=True)
    if len(result) < 20:
        raise ValueError("At least 20 usable student records with final marks are required.")
    if "student_id" not in result.columns:
        result["student_id"] = [f"CSV{i:05d}" for i in range(1, len(result) + 1)]
    if "student_name" not in result.columns:
        result["student_name"] = result["student_id"].astype(str)
    result["student_id"] = result["student_id"].fillna("").astype(str).str.strip()
    result["student_name"] = result["student_name"].fillna("").astype(str).str.strip()
    if (result["student_id"] == "").any() or (result["student_name"] == "").any():
        raise ValueError("CSV student IDs and names must not be empty.")
    result["performance_category"] = result["final_marks"].map(performance_category)
    result["academic_risk"] = result["final_marks"].map(academic_risk)
    return result


def train_models(frame: pd.DataFrame, artifact_dir: Path = MODEL_DIR) -> dict:
    cleaned = validate_dataset(frame)
    stratify = cleaned["performance_category"] if cleaned["performance_category"].value_counts().min() >= 2 else None
    train_idx, test_idx = train_test_split(
        cleaned.index,
        test_size=0.2,
        random_state=42,
        stratify=stratify,
    )
    train = cleaned.loc[train_idx]
    test = cleaned.loc[test_idx]

    def regression_pipeline(polynomial: bool = False) -> Pipeline:
        steps = [("imputer", SimpleImputer(strategy="median"))]
        if polynomial:
            steps.append(("polynomial_features", PolynomialFeatures(degree=2, include_bias=False)))
        steps.extend([("scaler", StandardScaler()), ("model", LinearRegression())])
        return Pipeline(steps)

    simple = regression_pipeline()
    multiple = regression_pipeline()
    polynomial = regression_pipeline(polynomial=True)
    knn = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("model", KNeighborsClassifier(n_neighbors=7)),
        ]
    )
    logistic = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("model", LogisticRegression(max_iter=2000, random_state=42)),
        ]
    )

    simple.fit(train[["previous_marks"]], train["final_marks"])
    multiple.fit(train[FEATURES], train["final_marks"])
    polynomial.fit(train[FEATURES], train["final_marks"])
    knn.fit(train[FEATURES], train["performance_category"])
    logistic.fit(train[FEATURES], train["academic_risk"])

    regression_metrics = {}
    for name, model, columns in (
        ("Linear Regression (single feature)", simple, ["previous_marks"]),
        ("Multiple Linear Regression", multiple, FEATURES),
        ("Polynomial Regression (degree 2)", polynomial, FEATURES),
    ):
        actual = test["final_marks"].to_numpy()
        predicted = model.predict(test[columns])
        regression_metrics[name] = {
            "MAE": round(float(mean_absolute_error(actual, predicted)), 4),
            "MSE": round(float(mean_squared_error(actual, predicted)), 4),
            "RMSE": round(float(np.sqrt(mean_squared_error(actual, predicted))), 4),
            "R2": round(float(r2_score(actual, predicted)), 4),
            "actual": actual.round(2).tolist(),
            "predicted": predicted.round(2).tolist(),
        }

    classification_metrics = {}
    for name, model, target, labels in (
        ("K-Nearest Neighbors", knn, "performance_category", PERFORMANCE_LABELS),
        ("Logistic Regression", logistic, "academic_risk", RISK_LABELS),
    ):
        actual = test[target].to_numpy()
        predicted = model.predict(test[FEATURES])
        classification_metrics[name] = {
            "Accuracy": round(float(accuracy_score(actual, predicted)), 4),
            "Precision": round(float(precision_score(actual, predicted, labels=labels, average="weighted", zero_division=0)), 4),
            "Recall": round(float(recall_score(actual, predicted, labels=labels, average="weighted", zero_division=0)), 4),
            "F1": round(float(f1_score(actual, predicted, labels=labels, average="weighted", zero_division=0)), 4),
            "labels": labels,
            "confusion_matrix": confusion_matrix(actual, predicted, labels=labels).tolist(),
        }

    artifact_dir.mkdir(parents=True, exist_ok=True)
    models = {
        "linear_regression_single_feature": simple,
        "multiple_linear_regression": multiple,
        "polynomial_regression": polynomial,
        "knn_classifier": knn,
        "logistic_regression": logistic,
    }
    for key, model in models.items():
        joblib.dump(model, artifact_dir / f"{key}.joblib")
    evaluation = {
        "regression": regression_metrics,
        "classification": classification_metrics,
        "training_rows": len(train),
        "test_rows": len(test),
    }
    (artifact_dir / "model_metrics.json").write_text(json.dumps(evaluation, indent=2), encoding="utf-8")
    return {"models": models, "evaluation": evaluation}


def initialize_database() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not CSV_PATH.exists():
        generate_synthetic_data().to_csv(CSV_PATH, index=False)
    frame = validate_dataset(pd.read_csv(CSV_PATH))
    with connect_db() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL COLLATE NOCASE UNIQUE,
                workspace_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        student_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(students)").fetchall()
        }
        if not student_columns:
            connection.execute(
                """
                CREATE TABLE students (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    student_id TEXT NOT NULL,
                    student_name TEXT NOT NULL,
                    attendance REAL NOT NULL,
                    previous_marks REAL NOT NULL,
                    study_hours REAL NOT NULL,
                    internal_marks REAL NOT NULL,
                    final_marks REAL,
                    performance_category TEXT,
                    academic_risk TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(owner_id, student_id)
                )
                """
            )
        elif "owner_id" not in student_columns:
            connection.execute("ALTER TABLE students RENAME TO students_before_accounts")
            connection.execute(
                """
                CREATE TABLE students (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    student_id TEXT NOT NULL,
                    student_name TEXT NOT NULL,
                    attendance REAL NOT NULL,
                    previous_marks REAL NOT NULL,
                    study_hours REAL NOT NULL,
                    internal_marks REAL NOT NULL,
                    final_marks REAL,
                    performance_category TEXT,
                    academic_risk TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(owner_id, student_id)
                )
                """
            )
            connection.execute(
                """
                INSERT INTO students
                (id, owner_id, student_id, student_name, attendance, previous_marks, study_hours,
                 internal_marks, final_marks, performance_category, academic_risk, created_at, updated_at)
                SELECT id, NULL, student_id, student_name, attendance, previous_marks, study_hours,
                       internal_marks, final_marks, performance_category, academic_risk, created_at, updated_at
                FROM students_before_accounts
                """
            )
            connection.execute("DROP TABLE students_before_accounts")
        connection.execute("CREATE INDEX IF NOT EXISTS idx_students_owner ON students(owner_id, id DESC)")
        # Remove the one prediction-form example created while verifying the prior UI.
        connection.execute("DELETE FROM students WHERE owner_id IS NULL AND student_id = 'DEMO001'")
        existing = connection.execute("SELECT COUNT(*) FROM students").fetchone()[0]
        if existing == 0:
            now = datetime.now(timezone.utc).isoformat()
            connection.executemany(
                """
                INSERT OR IGNORE INTO students
                (owner_id, student_id, student_name, attendance, previous_marks, study_hours,
                 internal_marks, final_marks, performance_category, academic_risk, created_at, updated_at)
                VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        str(row.student_id), str(row.student_name), float(row.attendance),
                        float(row.previous_marks), float(row.study_hours), float(row.internal_marks),
                        float(row.final_marks), row.performance_category, row.academic_risk, now, now,
                    )
                    for row in frame.itertuples(index=False)
                ],
            )
    model_files = list(MODEL_DIR.glob("*.joblib"))
    if len(model_files) < 5 or not (MODEL_DIR / "model_metrics.json").exists():
        trained = train_models(frame)
        app.config["models"] = trained["models"]
        app.config["evaluation"] = trained["evaluation"]
    else:
        app.config["models"] = {
            "linear_regression_single_feature": joblib.load(MODEL_DIR / "linear_regression_single_feature.joblib"),
            "multiple_linear_regression": joblib.load(MODEL_DIR / "multiple_linear_regression.joblib"),
            "polynomial_regression": joblib.load(MODEL_DIR / "polynomial_regression.joblib"),
            "knn_classifier": joblib.load(MODEL_DIR / "knn_classifier.joblib"),
            "logistic_regression": joblib.load(MODEL_DIR / "logistic_regression.joblib"),
        }
        app.config["evaluation"] = json.loads((MODEL_DIR / "model_metrics.json").read_text(encoding="utf-8"))


def row_to_dict(row: sqlite3.Row) -> dict:
    result = dict(row)
    result["is_demo"] = result.get("owner_id") is None
    result.pop("owner_id", None)
    for key in ("attendance", "previous_marks", "study_hours", "internal_marks", "final_marks"):
        if result.get(key) is not None:
            result[key] = round(float(result[key]), 1)
    return result


def user_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": int(row["id"]),
        "name": row["name"],
        "email": row["email"],
        "workspace": row["workspace_name"],
    }


def user_models(user_id: int) -> dict:
    cached = app.config.setdefault("user_models", {}).get(user_id)
    if cached:
        return cached
    account_dir = MODEL_DIR / "accounts" / str(user_id)
    metrics_path = account_dir / "model_metrics.json"
    if metrics_path.exists():
        models = {
            "linear_regression_single_feature": joblib.load(account_dir / "linear_regression_single_feature.joblib"),
            "multiple_linear_regression": joblib.load(account_dir / "multiple_linear_regression.joblib"),
            "polynomial_regression": joblib.load(account_dir / "polynomial_regression.joblib"),
            "knn_classifier": joblib.load(account_dir / "knn_classifier.joblib"),
            "logistic_regression": joblib.load(account_dir / "logistic_regression.joblib"),
        }
        account = {"models": models, "evaluation": json.loads(metrics_path.read_text(encoding="utf-8"))}
        app.config["user_models"][user_id] = account
        return account
    return {"models": app.config["models"], "evaluation": app.config["evaluation"]}


@app.before_request
def ensure_initialized() -> None:
    if not app.config.get("initialized"):
        initialize_database()
        app.config["initialized"] = True


@app.get("/api/auth/me")
def auth_me():
        if not session.get("user_id"):
            return jsonify({"authenticated": False, "user": None})
        return jsonify({"authenticated": True, "user": current_user()})


@app.post("/api/auth/register")
def register():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"error": "Please complete the sign-up form."}), 400
        name = str(payload.get("name", "")).strip()
        email = str(payload.get("email", "")).strip().lower()
        password = payload.get("password", "")
        workspace = str(payload.get("workspace_name", "")).strip()
        if len(name) < 2 or len(name) > 80:
            return jsonify({"error": "Enter your name (2–80 characters)."}), 400
        if len(email) > 254 or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            return jsonify({"error": "Enter a valid email address."}), 400
        if not isinstance(password, str) or len(password) < 8 or len(password) > 128:
            return jsonify({"error": "Password must be 8–128 characters."}), 400
        if not workspace:
            workspace = f"{name}'s classroom"
        if len(workspace) > 100:
            return jsonify({"error": "Workspace name must be 100 characters or fewer."}), 400
        created_at = datetime.now(timezone.utc).isoformat()
        try:
            with connect_db() as connection:
                cursor = connection.execute(
                    "INSERT INTO users (name, email, workspace_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
                    (name, email, workspace, generate_password_hash(password), created_at),
                )
                user_id = cursor.lastrowid
                row = connection.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        except sqlite3.IntegrityError:
            return jsonify({"error": "An account with this email already exists. Sign in instead."}), 409
        session.clear()
        session.permanent = True
        session["user_id"] = int(user_id)
        session["user_name"] = row["name"]
        session["user_email"] = row["email"]
        session["workspace_name"] = row["workspace_name"]
        app.config.setdefault("user_models", {})[int(user_id)] = {
            "models": app.config["models"],
            "evaluation": app.config["evaluation"],
        }
        return jsonify({"authenticated": True, "user": user_from_row(row)}), 201


@app.post("/api/auth/login")
def login():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"error": "Enter your email and password."}), 400
        email = str(payload.get("email", "")).strip().lower()
        password = payload.get("password", "")
        if not email or not isinstance(password, str):
            return jsonify({"error": "Enter your email and password."}), 400
        with connect_db() as connection:
            row = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if row is None or not check_password_hash(row["password_hash"], password):
            return jsonify({"error": "Email or password is incorrect."}), 401
        session.clear()
        session.permanent = True
        session["user_id"] = int(row["id"])
        session["user_name"] = row["name"]
        session["user_email"] = row["email"]
        session["workspace_name"] = row["workspace_name"]
        user_models(int(row["id"]))
        return jsonify({"authenticated": True, "user": user_from_row(row)})


@app.post("/api/auth/logout")
def logout():
        session.clear()
        return jsonify({"authenticated": False, "message": "You have signed out."})


def validate_student_payload(payload: dict, require_identity: bool = True) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object.")
    values = {}
    for key, (low, high) in INPUT_LIMITS.items():
        value = payload.get(key)
        if isinstance(value, bool):
            raise ValueError(f"{key} must be a number from {low:g} to {high:g}.")
        try:
            number = float(value)
        except (TypeError, ValueError):
            raise ValueError(f"{key} must be a number from {low:g} to {high:g}.") from None
        if not np.isfinite(number) or not low <= number <= high:
            raise ValueError(f"{key} must be between {low:g} and {high:g}.")
        values[key] = number
    student_id = str(payload.get("student_id", "")).strip()
    student_name = str(payload.get("student_name", "")).strip()
    if require_identity and (not student_id or not student_name):
        raise ValueError("Student ID and student name are required.")
    values["student_id"] = student_id
    values["student_name"] = student_name
    return values


def predict_record(student: dict, user_id: int) -> dict:
    features = pd.DataFrame([{key: student[key] for key in FEATURES}])
    models = user_models(user_id)["models"]
    return {
        "final_marks": round(float(np.clip(models["multiple_linear_regression"].predict(features)[0], 0, 100)), 1),
        "performance_category": str(models["knn_classifier"].predict(features)[0]),
        "academic_risk": str(models["logistic_regression"].predict(features)[0]),
    }


@app.get("/")
def home():
    index = FRONTEND_DIR / "index.html"
    if not index.exists():
        return (
            "<h1>Frontend is not built yet</h1><p>Run npm install and npm run build in the frontend folder.</p>",
            503,
        )
    return send_file(index)


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "database": DB_PATH.exists(), "models_loaded": len(app.config.get("models", {})) == 5})


@app.get("/api/dashboard")
@login_required
def dashboard():
    with connect_db() as connection:
        rows = connection.execute(
            "SELECT * FROM students WHERE owner_id IS NULL OR owner_id = ?",
            (session["user_id"],),
        ).fetchall()
    students = [row_to_dict(row) for row in rows]
    if not students:
        return jsonify({"total_students": 0, "average_marks": 0, "high_risk_students": 0, "average_attendance": 0, "performance_distribution": [], "risk_distribution": []})
    frame = pd.DataFrame(students)
    return jsonify(
        {
            "total_students": len(frame),
            "average_marks": round(float(frame["final_marks"].mean()), 1),
            "high_risk_students": int((frame["academic_risk"] == "High Risk").sum()),
            "average_attendance": round(float(frame["attendance"].mean()), 1),
            "performance_distribution": frame["performance_category"].value_counts().rename_axis("name").reset_index(name="value").to_dict("records"),
            "risk_distribution": frame["academic_risk"].value_counts().rename_axis("name").reset_index(name="value").to_dict("records"),
            "recent_students": sorted(students, key=lambda row: row["id"], reverse=True)[:6],
        }
    )


@app.get("/api/students")
@login_required
def list_students():
    query = request.args.get("search", "").strip()
    with connect_db() as connection:
        if query:
            rows = connection.execute(
                "SELECT * FROM students WHERE (owner_id IS NULL OR owner_id = ?) AND (student_id LIKE ? OR student_name LIKE ?) ORDER BY id DESC",
                (session["user_id"], f"%{query}%", f"%{query}%"),
            ).fetchall()
        else:
            rows = connection.execute(
                "SELECT * FROM students WHERE owner_id IS NULL OR owner_id = ? ORDER BY id DESC",
                (session["user_id"],),
            ).fetchall()
    return jsonify([row_to_dict(row) for row in rows])


@app.post("/api/students")
@login_required
def add_student():
    try:
        payload = request.get_json(silent=True)
        student = validate_student_payload(payload)
        prediction = predict_record(student, int(session["user_id"]))
        now = datetime.now(timezone.utc).isoformat()
        with connect_db() as connection:
            connection.execute(
                """
                INSERT INTO students
                (owner_id, student_id, student_name, attendance, previous_marks, study_hours, internal_marks,
                 final_marks, performance_category, academic_risk, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session["user_id"], student["student_id"], student["student_name"], student["attendance"],
                    student["previous_marks"], student["study_hours"], student["internal_marks"],
                    prediction.get("final_marks"), prediction.get("performance_category"),
                    prediction.get("academic_risk"), now, now,
                ),
            )
        return jsonify({"message": "Student added.", "student": {**student, **prediction}}), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except sqlite3.IntegrityError:
        return jsonify({"error": "That student ID already exists."}), 409


@app.put("/api/students/<int:student_pk>")
@login_required
def update_student(student_pk: int):
    try:
        student = validate_student_payload(request.get_json(silent=True))
        prediction = predict_record(student, int(session["user_id"]))
        with connect_db() as connection:
            cursor = connection.execute(
                """
                UPDATE students SET student_id=?, student_name=?, attendance=?, previous_marks=?,
                study_hours=?, internal_marks=?, final_marks=?, performance_category=?, academic_risk=?,
                updated_at=? WHERE id=? AND owner_id=?
                """,
                (
                    student["student_id"], student["student_name"], student["attendance"],
                    student["previous_marks"], student["study_hours"], student["internal_marks"],
                    prediction["final_marks"], prediction["performance_category"], prediction["academic_risk"],
                    datetime.now(timezone.utc).isoformat(), student_pk, session["user_id"],
                ),
            )
            if cursor.rowcount == 0:
                shared = connection.execute(
                    "SELECT 1 FROM students WHERE id=? AND owner_id IS NULL", (student_pk,)
                ).fetchone()
                if shared:
                    return jsonify({"error": "Synthetic sample records are read-only. Add a copy to edit it."}), 403
                return jsonify({"error": "Student not found."}), 404
        return jsonify({"message": "Student updated."})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except sqlite3.IntegrityError:
        return jsonify({"error": "That student ID already exists."}), 409


@app.delete("/api/students/<int:student_pk>")
@login_required
def delete_student(student_pk: int):
    with connect_db() as connection:
        cursor = connection.execute(
            "DELETE FROM students WHERE id=? AND owner_id=?", (student_pk, session["user_id"])
        )
    if cursor.rowcount == 0:
        with connect_db() as connection:
            shared = connection.execute(
                "SELECT 1 FROM students WHERE id=? AND owner_id IS NULL", (student_pk,)
            ).fetchone()
        if shared:
            return jsonify({"error": "Synthetic sample records cannot be deleted."}), 403
        return jsonify({"error": "Student not found."}), 404
    return jsonify({"message": "Student deleted."})


@app.post("/api/students/import")
@login_required
def import_students():
    uploaded = request.files.get("file")
    if not uploaded or not uploaded.filename.lower().endswith(".csv"):
        return jsonify({"error": "Choose a CSV file to import."}), 400
    try:
        frame = validate_dataset(pd.read_csv(uploaded))
        account_id = int(session["user_id"])
        trained = train_models(frame, MODEL_DIR / "accounts" / str(account_id))
        database_frame = frame.copy()
        fallback_medians = pd.Series(
            {"attendance": 50.0, "previous_marks": 50.0, "study_hours": 12.0, "internal_marks": 10.0}
        )
        database_frame[FEATURES] = database_frame[FEATURES].fillna(
            database_frame[FEATURES].median().fillna(fallback_medians)
        )
        now = datetime.now(timezone.utc).isoformat()
        with connect_db() as connection:
            cursor = connection.executemany(
                """
                INSERT OR IGNORE INTO students
                (owner_id, student_id, student_name, attendance, previous_marks, study_hours, internal_marks,
                 final_marks, performance_category, academic_risk, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        session["user_id"], row.student_id, row.student_name, row.attendance, row.previous_marks,
                        row.study_hours, row.internal_marks, row.final_marks,
                        row.performance_category, row.academic_risk, now, now,
                    )
                    for row in database_frame.itertuples(index=False)
                ],
            )
        app.config.setdefault("user_models", {})[account_id] = trained
        return jsonify({"message": f"Imported {cursor.rowcount} new records and retrained the five models.", "imported": cursor.rowcount})
    except (ValueError, pd.errors.ParserError, UnicodeDecodeError) as exc:
        return jsonify({"error": f"CSV import failed: {exc}"}), 400


@app.get("/api/students/sample.csv")
@login_required
def sample_csv():
    if not CSV_PATH.exists():
        generate_synthetic_data().to_csv(CSV_PATH, index=False)
    return send_file(CSV_PATH, as_attachment=True, download_name="student_performance_sample.csv", mimetype="text/csv")


@app.post("/api/predict")
@login_required
def predict():
    try:
        student = validate_student_payload(request.get_json(silent=True))
        features = pd.DataFrame([{key: student[key] for key in FEATURES}])
        models = user_models(int(session["user_id"]))["models"]
        marks = float(np.clip(models["multiple_linear_regression"].predict(features)[0], 0, 100))
        predicted_performance = str(models["knn_classifier"].predict(features)[0])
        predicted_risk = str(models["logistic_regression"].predict(features)[0])
        attendance_note = (
            "Attendance is low; regular class participation may help."
            if student["attendance"] < 60
            else "Attendance is moderate; improving consistency is recommended."
            if student["attendance"] < 75
            else "Attendance is good; maintain this consistency."
        )
        study_note = (
            "Reported study time is very low; establish a daily routine."
            if student["study_hours"] < 1
            else "A consistent study schedule with focused practice may help."
            if student["study_hours"] < 3
            else "Reported study time is positive; continue focused revision."
        )
        recommendations = []
        if student["attendance"] < 75:
            recommendations.append("Set an attendance improvement goal and discuss barriers with a teacher.")
        if student["previous_marks"] < 50:
            recommendations.append("Review foundational topics and schedule weekly practice with feedback.")
        if student["study_hours"] < 2:
            recommendations.append("Start with a realistic daily study plan and short, distraction-free sessions.")
        if student["internal_marks"] < 10:
            recommendations.append("Seek support on internal-assessment topics and clarify upcoming deadlines.")
        if not recommendations:
            recommendations.append("Maintain current habits and use regular formative assessments to monitor progress.")
        return jsonify(
            {
                "student_id": student["student_id"],
                "student_name": student["student_name"],
                "predicted_final_marks": round(marks, 1),
                "performance_category": predicted_performance,
                "academic_risk": predicted_risk,
                "attendance_analysis": attendance_note,
                "study_habit_analysis": study_note,
                "recommendations": recommendations,
                "disclaimer": "This is an estimate based on synthetic demonstration data, not a guaranteed result. Use teacher judgment.",
            }
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.get("/api/models")
@login_required
def model_metrics():
    return jsonify(user_models(int(session["user_id"]))["evaluation"])


@app.get("/api/analytics")
@login_required
def analytics():
    with connect_db() as connection:
        rows = connection.execute(
            "SELECT student_id, student_name, attendance, previous_marks, study_hours, internal_marks, final_marks, performance_category, academic_risk FROM students WHERE owner_id IS NULL OR owner_id = ?",
            (session["user_id"],),
        ).fetchall()
    return jsonify([row_to_dict(row) for row in rows])


@app.errorhandler(404)
def not_found(error):
    if request.path.startswith("/api/"):
        return jsonify({"error": "API endpoint not found."}), 404
    return error


@app.errorhandler(500)
def server_error(_error):
    app.logger.exception("Unhandled server error")
    return jsonify({"error": "Unexpected server error. Check the backend terminal for details."}), 500


if __name__ == "__main__":
    try:
        initialize_database()
        app.config["initialized"] = True
    except Exception as exc:
        print(f"Startup failed: {exc}", file=sys.stderr)
        raise
    app.run(host="127.0.0.1", port=5000, debug=False)
