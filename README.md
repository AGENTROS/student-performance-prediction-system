# Student Academic Performance Prediction & Risk Analysis

A B.Tech CSE mini project available in **two forms**:

1. **Web app** — a React dashboard with a Flask/Python API, educator sign-in, student records, charts, predictions, and model evaluation.
2. **Jupyter notebook** — a step-by-step, interactive walkthrough of the same academic prediction problem, the five syllabus models, evaluation, and an example prediction.

The starter cohort and downloadable sample CSV contain **synthetic demonstration data only**. They do not describe real students. Model results are estimates, not guaranteed outcomes.

> **New to the project?** Start with the [easy Hinglish project guide](PROJECT_GUIDE_HINGLISH.md). It explains what each folder does, how the five algorithms work, and how the data travels through the website.

## Run the website on Windows

1. Install **Python 3.10+** and **Node.js 18+**.
2. Double-click [`RUN_STUDENT_SYSTEM.bat`](RUN_STUDENT_SYSTEM.bat) in this repository.
3. On the first run, wait while dependencies are installed and the website is built.
4. Open <http://localhost:5000> if it did not open automatically.
5. Keep the terminal open while using the app. Press **Ctrl+C** in that terminal to stop it.

The web project lives in [`student-performance-system/`](student-performance-system/). Its own [README](student-performance-system/README.md) includes manual setup and development-server instructions.

## Run the Jupyter notebook on Windows

1. Install **Python 3.10+**.
2. Double-click [`RUN_NOTEBOOK.bat`](RUN_NOTEBOOK.bat), or run it from PowerShell:

   ```powershell
   .\RUN_NOTEBOOK.bat
   ```

3. Open `Student_Performance_Prediction_System.ipynb` in the Jupyter page that appears.
4. Choose **Run → Run All** (or **Run All Cells**) and wait for the results and charts.

The launcher installs [`requirements-notebook.txt`](requirements-notebook.txt) for the current Windows user and runs JupyterLab as a Python module, so a missing global `jupyter-lab` command or PATH entry does not block startup. The notebook can also be opened directly in VS Code with the Jupyter extension.

## The five allowed ML algorithms

| Algorithm | Project task |
|---|---|
| Linear Regression | Estimate final marks from previous-semester marks alone |
| Multiple Linear Regression | Estimate final marks from attendance, previous marks, study hours, and internal marks |
| Polynomial Regression | Demonstrate a degree-2 non-linear relationship with polynomial features and Linear Regression |
| K-Nearest Neighbors (KNN) | Classify Good, Average, or Poor performance |
| Logistic Regression | Classify Low, Medium, or High academic risk |

No Random Forest, Decision Tree, XGBoost, neural-network, or other predictive algorithm is used. Imputation and scaling are preprocessing, not extra prediction algorithms.

## Data, labels, and evaluation

- The included sample has 600 synthetic records and is generated reproducibly for demonstration.
- Performance categories use final-mark thresholds: **Good ≥ 75**, **Average ≥ 50 and < 75**, **Poor < 50**.
- Academic risk uses final-mark thresholds: **Low ≥ 70**, **Medium ≥ 45 and < 70**, **High < 45**.
- Final marks are the prediction target and are never included among final-mark prediction inputs.
- Preprocessing is fitted on training data; evaluation uses held-out test data.
- Regression and classification have separate metrics; see the guide for details and limitations.

To supply an external dataset, use the column names described in the [Hinglish guide](PROJECT_GUIDE_HINGLISH.md). Do not upload real student data to this public repository.

## Repository map

```text
.
├── Student_Performance_Prediction_System.ipynb  # Notebook edition
├── dataset/
│   └── student_performance_sample.csv            # Synthetic sample, safe to share
├── student-performance-system/
│   ├── backend/                                  # Flask API, ML pipelines, SQLite logic
│   ├── frontend/                                 # React/Vite dashboard
│   ├── dataset/                                  # Web app's generated sample (ignored)
│   └── start.bat                                 # Web app setup/build/start script
├── RUN_NOTEBOOK.bat
├── RUN_STUDENT_SYSTEM.bat
├── requirements-notebook.txt
└── PROJECT_GUIDE_HINGLISH.md
```

Database files, session signing keys, trained model binaries, per-account student imports, virtual environments, and frontend build outputs are generated locally and excluded from Git.

## Responsible-use note

This is an educational prototype using synthetic data, not a validated student-assessment or intervention system. Predictions can be wrong and must not be used by themselves to grade, label, punish, or make decisions about students. Only use real student information with appropriate authorization and safeguards.
