const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 5000;
const mongoose = require("mongoose");
//Middlewares
app.use(cors());
app.use(express.json());
//MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/sams")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));
// Test route
app.get("/", (req, res) => {
  res.send("Backend is running successfully.!!");
});
//Faculty Schema
const facultySchema = new mongoose.Schema({
  facultyId: {
    type: Number,
    unique: true
  },
  name: String,
  department: String,
  phone: String,
  password: {
    type: String,
    default: "faculty@"
  }
});

const Faculty = mongoose.model("Faculty", facultySchema);

//Student schema
const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    unique: true
  },
  name: String,
  department: String,
  phone: String,
  year: String,
  section: Number,
  password: {
    type: String,
    default: "webcap"
  }
});
const Student = mongoose.model("Student", studentSchema);

//Admin login
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "123" && password === "admin@") {
    res.json({
      success: true,
      message : "Login Successful",
      redirect: "/admin-dashboard",
    });
  } else {
    res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }
});
//Add Faculty
app.post("/add-faculty", async (req, res) => {
  try {
    const { name, department, phone } = req.body;

    if (!name || !department || !phone) {
      return res.json({
        success: false,
        message: "Please fill all fields",
      });
    }

    const lastFaculty = await Faculty.findOne().sort({ facultyId: -1 });
    const facultyId = lastFaculty
  ? lastFaculty.facultyId + 1
  : 1001;

    const newFaculty = new Faculty({
      facultyId,
      name,
      department,
      phone,
      password: "faculty@"
    });

    await newFaculty.save();

    res.json({
      success: true,
      message: "Faculty added successfully",
      facultyId
    });

  } catch (error) {
    console.log("ERROR:", error);
    res.json({
      success: false,
      message: "Error adding faculty",
    });
  }
});
//Delete faculty
app.delete("/delete-faculty/:id", async (req, res) => {
  try {
    await Faculty.findByIdAndDelete(req.params.id);
    res.json({ success: true,
      message: "Faculty deleted successfully"
     });
  } catch (error) {
    res.status(500).json({ success: false,
      message: "Error deleting faculty"
     });
  }
});
//View Faculty
app.get("/get-faculty", async (req, res) => {
  try {
    const faculty = await Faculty.find();
    res.json({
      success: true,
      faculty
    });   // ✅ return ARRAY directly
  } catch (error) {
    res.status(500).json({ message: "Error fetching faculty" });
  }
});
//Faculty login (DATABASE BASED)
app.post("/api/faculty/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // username will be facultyId
    const faculty = await Faculty.findOne({
      facultyId: Number(username),
      password: password
    });

    if (!faculty) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials"
      });
    }

    res.json({
      success: true,
      message: "Faculty login successful",
      faculty: {
        facultyId: faculty.facultyId,
        name: faculty.name,
        department: faculty.department
      }
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});
//Add Student
app.post("/add-student", async (req, res) => {
  try {
    const { name, department, year, section } = req.body;

    if (!name || !department || !year || !section) {
      return res.json({
        success: false,
        message: "Please fill all fields"
      });
    }

    const currentYear = new Date().getFullYear().toString().slice(-2);

    let studyYear = Number(currentYear) - Number(year);

    if (studyYear < 1) studyYear = 1;
    if (studyYear > 4) studyYear = 4;

    const count = await Student.countDocuments();
    const runningNumber = String(count + 1).padStart(3, "0");

    const studentId = `${year}B11${department}${runningNumber}`;

    const newStudent = new Student({
      studentId,
      name,
      department,
      year: `${studyYear}-Year`,
      section,
      password: "webcap"
    });

    await newStudent.save();

    res.json({
      success: true,
      message: "Student added successfully",
      studentId
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error adding Student"
    });
  }
});
//Delete student
app.delete("/delete-student/:id", async (req, res) => {
  try {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);

    if (!deletedStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.json({
      success: true,
      message: "Student deleted successfully"
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error deleting student"
    });
  }
});
//View Student
app.get("/get-students", async (req, res) => {
  try {
    const students = await Student.find();
    res.json({
      success: true,
      students
    });   // ✅ return ARRAY directly
  } catch (error) {
    res.status(500).json({ message: "Error fetching student" });
  }
});
//Mark Attendance
app.post("/mark-attendance", async (req, res) => {
  const { qrData, studentId } = req.body;

  const parsed = JSON.parse(qrData);

  const currentTime = Date.now();

  // Check expiry (30 sec)
  if (currentTime - parsed.createdAt > 30000) {
    return res.status(400).json({ message: "QR Expired" });
  }

  // Save attendance (you can extend this)
  await Attendance.create({
    studentId,
    subject: parsed.subject,
    section: parsed.section,
    periods: parsed.periods,
    date: new Date()
  });

  res.json({ message: "Attendance marked" });
});
//Student login(DATABASE)
app.post("/api/student/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const student = await Student.findOne({
      studentId: username,
      password: password
    });

    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials"
      });
    }

    res.json({
  success: true,
  message: "Student login successful",
  redirect: "/student-dashboard",
  student: {
    studentId: student.studentId,
    name: student.name   // ✅ ADD THIS
  }
});

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});
// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});