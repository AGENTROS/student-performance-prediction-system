# Website Edition — Student Performance Prediction System

A local academic analytics web application with a React dashboard, Flask API, SQLite storage, and the five requested scikit-learn models. The included 600-row dataset is synthetic demonstration data, not real student data.

For the full project overview, Jupyter setup, algorithm explanations, data flow, and common fixes, see the repository [README](../README.md) and [easy Hinglish project guide](../PROJECT_GUIDE_HINGLISH.md).

## Run on Windows

1. Install Python 3.10+ and Node.js 18+.
2. Double-click `RUN_STUDENT_SYSTEM.bat` in the repository root, or double-click `start.bat` inside this project folder. From PowerShell:

   ```powershell
   cd student-performance-system
   .\start.bat
   ```

3. Wait for the setup and build to finish. Open <http://localhost:5000>.
4. Keep the terminal open while using the site. Press `Ctrl+C` in that terminal to stop it.

The first run installs dependencies, creates the synthetic CSV/SQLite database, trains the models, and builds the React site. Later runs reuse the saved database and models.

## Development

Backend: `py -m venv .venv`, `.venv\Scripts\python.exe -m pip install -r backend\requirements.txt`, then `.venv\Scripts\python.exe backend\app.py`.

Frontend: from `frontend`, run `npm install` and `npm run dev`. The Vite server runs on port 5173 and proxies `/api` requests to Flask on port 5000.

## Models and evaluation

- Linear Regression using only previous semester marks.
- Multiple Linear Regression using attendance, previous marks, study hours, and internal marks.
- Polynomial Regression (degree 2) with the same four inputs.
- K-Nearest Neighbors for performance classification.
- Logistic Regression for academic-risk classification.

The training/test split is separate from preprocessing pipelines; imputers and scalers fit only on training data. Final marks are never passed as a predictor. Regression metrics are MAE, MSE, RMSE, and R². Classifier metrics are accuracy, weighted precision/recall/F1, and confusion matrices. Performance labels use 75/50 mark thresholds; risk labels use 70/45.

## Features

Dashboard and charts, student search/CRUD, CSV import and sample download, prediction with recommendations, model comparisons and confusion matrices, student analytics, dark mode, and project information. Student records are stored in `backend/database/students.db`; the initial dataset is `dataset/student_performance.csv`; trained pipelines and metrics are under `saved_models/`.

Predictions are estimates, not guaranteed results. Synthetic data is for demonstration only. Use appropriate consent and safeguards for real student information.

## Accounts

Create an educator account with your name, email, optional school/workspace name, and a password of at least 8 characters. Passwords are stored as salted password hashes, not plaintext. Login uses an HTTP-only local session cookie. Each account sees the read-only synthetic demo cohort plus its own student records; students imported or created in one account are not visible in another. Imported CSV models and metrics are also stored separately per account. This is a local academic prototype, not a hardened public internet identity service.
