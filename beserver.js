// beserver.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// Use Render's assigned port, or default to 5000 for local testing
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({ 
  origin: [
    "https://sams-proj.yogeshv1434.workers.dev",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  methods: ["GET", "POST", "DELETE", "PUT"], 
  credentials: true 
}));
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sams";

mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ Database connection error:", err));

// ---------- Schemas ---------- //

// Faculty Schema
const facultySchema = new mongoose.Schema({
  facultyId: { type: Number, unique: true },
  name: String,
  department: String,
  phone: String,
  password: { type: String, default: "faculty@" }
});
const Faculty = mongoose.model("Faculty", facultySchema);

// Student Schema
const studentSchema = new mongoose.Schema({
  studentId: { type: String, unique: true },
  name: String,
  department: String,
  year: String,
  section: Number,
  password: { type: String, default: "webcap" }
});
const Student = mongoose.model("Student", studentSchema);

// ✅ UPDATED Attendance Schema
const attendanceSchema = new mongoose.Schema({
  studentId: String,
  subject: String,
  section: Number,
  periods: [Number],
  date: { type: String }, // formatted date
  status: { type: String, default: "Present" } // NEW
});
const Attendance = mongoose.model("Attendance", attendanceSchema);

// ---------- Routes ---------- //

app.get("/", (req, res) => res.send("Backend is running successfully!"));

// Admin login
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "123" && password === "admin@") {
    res.json({
      success: true,
      message: "Login Successful",
      redirect: "/admin-dashboard"
    });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// Add Faculty
app.post("/add-faculty", async (req, res) => {
  try {
    const { name, department, phone } = req.body;
    if (!name || !department || !phone)
      return res.json({ success: false, message: "Please fill all fields" });

    const lastFaculty = await Faculty.findOne().sort({ facultyId: -1 });
    const facultyId = lastFaculty ? lastFaculty.facultyId + 1 : 1001;

    const newFaculty = new Faculty({ facultyId, name, department, phone });
    await newFaculty.save();

    res.json({ success: true, message: "Faculty added successfully", facultyId });
  } catch (error) {
    res.json({ success: false, message: "Error adding faculty" });
  }
});

// Delete Faculty
app.delete("/delete-faculty/:id", async (req, res) => {
  try {
    await Faculty.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Faculty deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting faculty" });
  }
});

// View Faculty
app.get("/get-faculty", async (req, res) => {
  try {
    const faculty = await Faculty.find();
    res.json({ success: true, faculty });
  } catch (error) {
    res.status(500).json({ message: "Error fetching faculty" });
  }
});

// Faculty login
app.post("/api/faculty/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const faculty = await Faculty.findOne({ facultyId: Number(username), password });
    if (!faculty) return res.status(401).json({ success: false, message: "Invalid login credentials" });

    res.json({
      success: true,
      message: "Faculty login successful",
      faculty: { facultyId: faculty.facultyId, name: faculty.name, department: faculty.department }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Add Student
app.post("/add-student", async (req, res) => {
  try {
    const { name, department, year, section } = req.body;
    if (!name || !department || !year || !section)
      return res.json({ success: false, message: "Please fill all fields" });

    const count = await Student.countDocuments();
    const runningNumber = String(count + 1).padStart(3, "0");
    const studentId = `${year}B11${department}${runningNumber}`;

    const newStudent = new Student({ studentId, name, department, year, section });
    await newStudent.save();

    res.json({ success: true, message: "Student added successfully", studentId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error adding Student" });
  }
});

// Delete Student
app.delete("/delete-student/:id", async (req, res) => {
  try {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);
    if (!deletedStudent) return res.status(404).json({ success: false, message: "Student not found" });

    res.json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting student" });
  }
});

// View Students
app.get("/get-students", async (req, res) => {
  try {
    const students = await Student.find();
    res.json({ success: true, students });
  } catch (error) {
    res.status(500).json({ message: "Error fetching student" });
  }
});

// Student login
app.post("/api/student/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const student = await Student.findOne({ studentId: username, password });
    if (!student) return res.status(401).json({ success: false, message: "Invalid login credentials" });

    res.json({
      success: true,
      message: "Student login successful",
      redirect: "/student-dashboard",
      student: { studentId: student.studentId, name: student.name }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------- QR Attendance Route ---------- //
app.post("/mark-attendance", async (req, res) => {
  try {
    const { qrData, studentId } = req.body;

    // ✅ Check required fields
    if (!qrData || !studentId) {
      return res.status(400).json({
        success: false,
        message: "Missing QR data or studentId"
      });
    }

    // ✅ Parse QR data
    const parsed = JSON.parse(qrData);
    console.log("Parsed QR:", parsed);
    console.log("Student:", studentId);

    // ✅ Check QR expiry (60 seconds)
    const currentTime = Date.now();
    if (currentTime - parsed.createdAt > 60000) {
      return res.status(400).json({
        success: false,
        message: "QR Expired ❌"
      });
    }

    // ✅ Get today's date (STRING format)
    const today = new Date().toISOString().split("T")[0];

    // ✅ Check if already marked today
    const existing = await Attendance.findOne({
      studentId,
      subject: parsed.subject,
      section: parsed.section,
      periods: parsed.periods,
      date: today
    });

    if (existing) {
      return res.json({
        success: false,
        message: "Attendance already marked ⚠️"
      });
    }

    // ✅ Save attendance
    await Attendance.create({
      studentId,
      subject: parsed.subject,
      section: parsed.section,
      periods: parsed.periods,
      date: today,
      status: "Present"
    });

    // ✅ Success response
    res.json({
      success: true,
      message: "Attendance marked successfully ✅"
    });

  } catch (error) {
    console.log("ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Error marking attendance ❌"
    });
  }
});

// ✅ NEW ROUTE: Get Student Attendance
app.get("/api/student-attendance/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const records = await Attendance.find({ studentId }).sort({ date: -1 });

    res.json({
      success: true,
      data: records
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error fetching attendance"
    });
  }
});

// ---------- Start Server ---------- //
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});