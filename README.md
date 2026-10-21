# AttendPro — Smart Student Attendance & Assignment Portal 🎓

A modern, responsive, client-side web application designed for academic institutes to manage student attendance, track section-wise performance, upload assignments, and monitor student submissions with real-time analytics.

Built with **HTML5**, **Vanilla CSS**, and **Modern JavaScript (ES6+)** with **LocalStorage** persistence.

---

## 🌟 Key Features

### 👨‍💼 Admin Portal
- **Interactive Dashboard**:
  - Real-time statistics: Total Students, Present Today, Absent Today, Total Assignments.
  - **Section-wise Attendance Overview**: Live mini-cards for each section (A, B, C, D) displaying student count, presents, absents, and animated attendance progress bars.
  - Quick action shortcuts for instant navigation.
- **Add Students (Single & Bulk)**:
  - Individual registration form (Name, Roll, Email, Class, Section).
  - **⚡ 1-Click Bulk Add 10 Students**: Instantly populates 10 students across Sections A, B, C, D with realistic attendance history.
  - **📁 Bulk CSV / Text Import**: Paste multi-line CSV data or upload `.csv` files with a downloadable template.
- **Attendance Management**:
  - Class, Section & Date filtering.
  - One-click "Mark All Present" & "Mark All Absent".
  - Individual toggle switches with instant feedback.
- **📊 Section-wise Attendance Reports**:
  - Grouped student views separated by Section (Section A, Section B, Section C, etc.).
  - Total Present days, Total Absent days, and overall Attendance Rate % per student.
  - Color-coded badges: **Good (≥75%)**, **Warning (60–74%)**, and **Shortage (<60%)**.
  - **Student Attendance History Modal**: Detailed chronological log of every date marked for any student.
  - **CSV Export & Printable Reports**: Single-click CSV export of the section-wise report.
- **Assignment & Submission Management**:
  - Upload assignments (PDF, Images, Docs) targeted to specific classes and sections or all classes.
  - **Check Submissions Status**:
    - Live tracking of eligible students vs submitted students (`X/Y Submitted`).
    - Filter tabs: All / Submitted / Pending.
    - View submission dates, download student uploaded solutions, and read notes.
    - Admin manual override toggle ("Mark as Submitted" / "Mark as Pending").
    - Export submission records to CSV.
- **Delete Student Records**:
  - Search and filter students by name, roll, class, and section with confirmation protection.

---

### 🎓 Student Portal
- **Personalized Student Dashboard**:
  - Days Present, Days Absent, and Overall Attendance Percentage.
  - Today's attendance status indicator (Present / Absent / Not Marked Yet).
- **Attendance History**:
  - Filter between "Today's Status" and "All Records".
- **My Assignments & Online Submission**:
  - View assignments targeted to the student's class and section.
  - Download assignment problem files directly.
  - **Submit Assignment**: Upload solutions (PDF, DOCX, Images, Zip) with optional submission notes.
  - Status indicator: **✓ Submitted (with Date & File)** or **Pending Submission**.
  - Ability to update existing submissions anytime.

---

## 🔐 Default Credentials

| Role | Username / ID | Password | Notes |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Full access to portal |
| **Student** | Student Roll No (e.g. `101`) | Same as Roll No (`101`) | Password defaults to Roll Number |

*Sample seeded students for quick testing:*
- Section A: Roll `101`, `102`, `103`, `104`
- Section B: Roll `201`, `202`, `203`, `204`
- Section C: Roll `301`, `302`, `303`
- Section D: Roll `401`, `402`

---

## 🚀 Live Demo & Deployment

### Running Locally
No build step or external libraries required. Simply open `index.html` in any modern web browser or run with a local server:

```bash
# Using python
python -m http.server 3000

# Or using npx serve
npx serve . -l 3000
```
Then visit `http://localhost:3000` in your browser.

### Hosting on GitHub Pages (Free)
1. Push this repository to GitHub.
2. In your GitHub repository, go to **Settings** &rarr; **Pages**.
3. Under **Branch**, select `main` and folder `/ (root)`.
4. Click **Save**. Your site will be published at `https://<your-username>.github.io/<repo-name>/`!

---

## 🛠️ Tech Stack
- **HTML5**: Semantic layout and accessible components.
- **CSS3**: Modern custom styling, Glassmorphism, CSS Grid & Flexbox, smooth transitions and animations.
- **JavaScript (ES6+)**: Vanilla JS architecture with modular data handlers.
- **Storage**: Browser `localStorage` for offline persistence.

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
