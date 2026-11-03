# Project Guide — Aasan Hinglish Mein

Yeh document project ko zero se samjhata hai: website aur Jupyter notebook mein kya hota hai, backend kaise kaam karta hai, algorithms kahan use hote hain, aur data prediction tak kaise pahunchta hai.

## 1. Ek line mein project kya karta hai?

Teacher student ki attendance, previous marks, daily study hours aur internal marks enter karta hai. Machine-learning models **final marks ka estimate**, performance group aur academic-risk group predict karte hain. Dashboard students aur class ke patterns ko charts/tables mein dikhata hai.

**Important:** Prediction estimate hai, guarantee nahi. Project ka included dataset synthetic/fake demonstration data hai—yeh real students ko represent nahi karta. Is model ko kisi student ko grade, punish ya label karne ke liye akela use nahi karna chahiye.

## 2. Project ke do versions

### A. Website (`student-performance-system/`)

- **React + Vite frontend:** forms, navigation, student tables, charts, filters aur dashboard.
- **Flask/Python backend:** input validation, authentication, CSV processing, ML models aur REST API.
- **SQLite:** local educator accounts aur student records.
- **scikit-learn:** exactly paanch syllabus models aur unke preprocessing pipelines.

Website Windows par chalane ke liye repository root se `RUN_STUDENT_SYSTEM.bat` double-click karo. Script dependencies check/install karti hai, React UI build karti hai aur local server start karti hai. Browser mein `http://localhost:5000` kholo. Terminal open rehna chahiye; band karne ke liye terminal mein `Ctrl+C`.

### B. Jupyter notebook (`Student_Performance_Prediction_System.ipynb`)

Notebook data aur ML steps ko cell-by-cell samjhata hai: dataset banana/load karna, clean/preprocess karna, models train/evaluate karna, graphs dekhna aur sample student ka prediction karna. Beginner ko pehle notebook se ML steps samajhna aasaan hoga; website complete interactive application hai.

Notebook chalane ke liye `RUN_NOTEBOOK.bat` use karo. Yeh `requirements-notebook.txt` se packages current Windows user ke liye install karta hai aur `py -m jupyterlab` se JupyterLab kholta hai. Isliye `jupyter-lab` command PATH mein na hone par bhi launcher kaam karta hai. Notebook select karke **Run All** dabao. Notebook packages app ke backend venv se alag hain.

## 3. Folder/file guide

| Path | Iska kaam |
|---|---|
| `README.md` | GitHub par pehla overview aur dono apps ke quick-start steps |
| `PROJECT_GUIDE_HINGLISH.md` | Ye detail guide—data flow, algorithm, files aur limitations |
| `Student_Performance_Prediction_System.ipynb` | Jupyter/VS Code notebook edition |
| `requirements-notebook.txt` | Notebook ke Python/Jupyter/visualization packages |
| `RUN_NOTEBOOK.bat` | Notebook environment setup karke JupyterLab kholta hai |
| `RUN_STUDENT_SYSTEM.bat` | Web app ke startup script ko call karta hai |
| `dataset/student_performance_sample.csv` | Share karne layak, synthetic 600-row sample |
| `student-performance-system/backend/app.py` | Flask routes, database access, validation, training/prediction |
| `student-performance-system/backend/requirements.txt` | Flask aur website backend ke Python packages |
| `student-performance-system/frontend/src/App.jsx` | React screens, components, forms, charts aur API calls |
| `student-performance-system/frontend/src/styles.css` | Website theme, responsive layout, charts/cards styling |
| `student-performance-system/frontend/package.json` | Frontend dependencies aur `npm run build` command |
| `student-performance-system/start.bat` | Web dependencies install/build aur Flask start |
| `student-performance-system/README.md` | Website ke manual setup aur development notes |

Local `students.db`, session-signing key, account-specific records, generated trained models, Node/Python virtual environments aur compiled frontend files GitHub par nahi jaate; `.gitignore` unhein exclude karta hai.

## 4. Data ka flow — simple diagram

```text
Teacher/student CSV
        ↓
React form / CSV upload
        ↓  HTTP request
Flask API (app.py)
        ↓
input validation → missing-value preprocessing → trained scikit-learn model
        ↓
marks estimate + performance group + risk group
        ↓
SQLite record / API response
        ↓
React dashboard, table aur charts
```

Notebook mein isi ML workflow ko web API ke bina seedhe Python cells mein chalaya jaata hai.

## 5. Paanch algorithms — kaun kya karta hai?

| Algorithm | Input aur output | Project mein kahan? |
|---|---|---|
| **Linear Regression (single feature)** | Sirf `previous_marks` lekar numeric `final_marks` estimate karta hai; line data ka linear trend dikhati hai. | Notebook ka single-feature regression pipeline; backend mein `train_models()` ke andar `simple` model. |
| **Multiple Linear Regression** | `attendance`, `previous_marks`, `study_hours`, `internal_marks` se numeric final-mark estimate banata hai. | Website ka main marks predictor; backend ka `multiple` pipeline. Notebook ka `multiple_model`. |
| **Polynomial Regression (degree 2)** | Wahi academic inputs ke squared/pairwise polynomial features banata hai, phir Linear Regression fit karta hai. Curve non-linear trend demonstrate karti hai. | Backend ka `polynomial` pipeline; notebook ka `polynomial_model` aur previous-marks curve. PolynomialFeatures feature transformation hai—alag predictive algorithm nahi. |
| **K-Nearest Neighbors (KNN)** | Naye student ke scaled inputs ko paas ke training examples se compare karke `Good Performance`, `Average Performance`, `Poor Performance` class deta hai. | Backend `KNeighborsClassifier(n_neighbors=7)`; notebook `knn_model`. |
| **Logistic Regression** | Academic inputs se categorical `Low Risk`, `Medium Risk`, `High Risk` class predict karta hai. | Backend `LogisticRegression`; notebook `logistic_model`. |

**Koi chhatha algorithm nahi:** Random Forest, Decision Tree, XGBoost, Neural Network ya Deep Learning yahan nahi hai. Median imputer aur StandardScaler sirf data-preprocessing tools hain, predictors nahi.

### Categories/risk labels kaise bante hain?

Training examples mein labels existing/final marks se fixed thresholds par derive hote hain:

- Performance: `final_marks >= 75` → Good; `50–74.9` → Average; `< 50` → Poor.
- Risk: `final_marks >= 70` → Low; `45–69.9` → Medium; `< 45` → High.

Prediction waqt category/risk models inputs se directly class predict karte hain. Yeh rules demonstration labels define karte hain; real educational risk ka clinical/validated standard nahi hain.

## 6. Training, preprocessing aur leakage se bachav

1. Labeled dataset ko **80% training / 20% test** mein baanta jaata hai. Website rare class ho to performance groups ko stratify karne ki koshish karti hai; notebook seed set karke reproducible split banata hai.
2. Duplicate rows hataaye jaate hain; numeric values aur valid ranges check hote hain.
3. Feature missing ho to median imputation model pipeline mein hoti hai. Median/scaler training subset par fit hote hain, test data par nahi.
4. `final_marks` regression target hai. Isliye woh final-mark predictors ki feature list mein **nahi** aata. Student ID/name bhi prediction inputs nahi hain.
5. Usi held-out test set par output compare hota hai—training data par achha score hi generalization ka proof nahi hai.

Training CSV ke liye numerical columns: `attendance`, `previous_marks`, `study_hours`, `internal_marks`, `final_marks`. `student_id` aur `student_name` optional identity columns hain; absent hon to identifiers create kiye ja sakte hain. Invalid range, missing target, duplicates aur minimum usable records ke checks source mein hain. UI prediction ke liye student ID aur name bhi poochti hai.

| Column | Allowed value |
|---|---:|
| `attendance` | 0–100 percent |
| `previous_marks` | 0–100 |
| `study_hours` | 0–24 hours/day |
| `internal_marks` | 0–20 |
| `final_marks` | 0–100 |

`dataset/student_performance_sample.csv` synthetic example hai. Apni private real-student CSV is public repository mein commit/push mat karo.

## 7. Kaunsa score kis cheez ko naapta hai?

**Regression** numeric marks estimate karti hai. `student-performance-system/backend/app.py` aur notebook mein:

- **MAE**: average absolute marks error; kam achha.
- **MSE**: squared error ka average; badi galti ko zyada penalty.
- **RMSE**: MSE ka square root; marks ke same unit mein, kam achha.
- **R²**: target variation kitni explain hui; generally 1 ke kareeb achha, lekin test data par negative bhi ho sakta hai.

**Classification** categories/risk group predict karti hai:

- **Accuracy**: kul predictions mein sahi fraction.
- **Precision**: predicted class mein se kitne waqai us class ke hain.
- **Recall**: us asli class ke kitne cases model ne pakde.
- **F1**: precision aur recall ka balance.
- **Confusion matrix**: har actual class ke against predicted class counts.

Imbalanced classes mein accuracy akela misleading ho sakta hai; precision/recall/F1 aur confusion matrix bhi dekho.

## 8. Website ke main backend routes

Flask endpoints `student-performance-system/backend/app.py` mein hain. Login waale endpoints session use karte hain:

- `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`: educator account/session.
- `/api/dashboard`: class totals aur summaries.
- `/api/students`: student list/search, new student, CSV import/export; individual student endpoint edits/deletes karta hai.
- `/api/predict`: validated inputs par marks, performance, risk aur recommendation response.
- `/api/models`: held-out regression/classification evaluation.
- `/api/analytics`: student chart ke liye feature/mark/label rows.
- `/api/health`: local backend/database status.

Web UI mein **Overview**, **Students**, **Prediction**, **Model evaluation**, **Student analytics**, aur **About project** screens hain. Analytics chart filter/tooltip ke liye student identity aur marks dikhata hai; point par click karne se performance group ki list khulti hai.

### Login aur data privacy ka note

Passwords Werkzeug ke password hashing function se hash hote hain; plain text mein save nahi hote. HTTP-only session cookie aur owner ID ke zariye account-specific student records/models alag rehte hain; synthetic shared demo rows read-only hain. Database/session key is local machine par generate hote hain aur Git se ignored hain. Yeh classroom/local demo hai, public internet deployment ke liye hardened login system nahi.

## 9. Aam problems aur fix

### Website browser nahi khul raha

- `RUN_STUDENT_SYSTEM.bat` ki window khuli rehni chahiye; error ke liye us terminal ka output dekho.
- `http://localhost:5000` manually khol kar dekho.
- Python aur Node.js installed hon, phir launcher dobara chalao.

### Jupyter: `jupyter-lab` ya `jupyter lab` command nahi mila

Root se `RUN_NOTEBOOK.bat` use karo. Yeh JupyterLab install karke `py -m jupyterlab` chalata hai; global `jupyter-lab` command/PATH setup ki zaroorat nahi.

### Notebook mein missing package/kernel error

- `RUN_NOTEBOOK.bat` use karke Jupyter ko notebook ke `.venv-notebook` interpreter se launch karo.
- VS Code mein kernel selector se `.venv-notebook` Python interpreter choose karo.
- `requirements-notebook.txt` install hone ke baad **Restart Kernel → Run All** karo.

### Port already in use

Pehle se chal rahe app ka terminal band karne ke liye `Ctrl+C` use karo, phir launcher dobara chalao. Apne database/model folders manually delete mat karo—unmein tumhara local data ho sakta hai.

## 10. Responsible-use aur project ki limits

- Demonstration records synthetic hain; real data se trained ya validated hone ka daawa nahi.
- Synthetic data par achhe metrics real students par accuracy guarantee nahi karte.
- Attendance/study recommendations transparent threshold rules hain, extra ML models nahi.
- Model prediction galat ya biased ho sakti hai. Teacher ka human review zaroori hai.
- Real student data sirf proper consent/permission, privacy aur institutional rules ke saath use karo. Public repo mein private dataset, account database, screenshots containing personal information, ya keys kabhi upload na karo.
