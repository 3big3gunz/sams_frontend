import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, BookOpen, Users, Camera, Play, CheckCircle2, 
  XCircle, LogOut, ShieldAlert, Award, FileSpreadsheet, Plus, Trash2, Calendar
} from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [role, setRole] = useState(localStorage.getItem('role') || '');
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
  const [activeTab, setActiveTab] = useState('');
  
  // Login Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // App API State
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [records, setRecords] = useState([]);

  // Modal / Selection State
  const [showModal, setShowModal] = useState(null); // 'dept', 'course', 'user', 'face'
  const [selectedUserForFace, setSelectedUserForFace] = useState(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDept, setNewCourseDept] = useState('');
  const [newCourseLecturer, setNewCourseLecturer] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('student');
  const [newUserDept, setNewUserDept] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Active student/lecturer states
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedCourseForSession, setSelectedCourseForSession] = useState('');
  const [attendanceResult, setAttendanceResult] = useState(null); // { success: bool, msg: string, score: float }

  // Webcam stream reference
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Sync token to storage
  const handleLoginSuccess = (data) => {
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('userName', data.name);
    setToken(data.access_token);
    setRole(data.role);
    setUserName(data.name);
  };

  const handleLogout = () => {
    stopCamera();
    localStorage.clear();
    setToken('');
    setRole('');
    setUserName('');
    setActiveTab('');
  };

  // Helper fetch header
  const getHeaders = () => ({
    'Authorization': `Bearer ${token}`
  });

  // Load backend data
  const fetchData = async () => {
    if (!token) return;
    try {
      // Load departments
      const deptRes = await fetch('/api/departments', { headers: getHeaders() });
      if (deptRes.ok) setDepartments(await deptRes.json());

      // Load courses
      const courseRes = await fetch('/api/courses', { headers: getHeaders() });
      if (courseRes.ok) setCourses(await courseRes.json());

      // Load sessions
      const sessionRes = await fetch('/api/sessions', { headers: getHeaders() });
      if (sessionRes.ok) {
        const sessList = await sessionRes.json();
        setSessions(sessList);
        setActiveSessions(sessList.filter(s => s.status === 'active'));
      }

      // Load users if privileged
      if (role === 'admin' || role === 'lecturer') {
        const userRes = await fetch('/api/users', { headers: getHeaders() });
        if (userRes.ok) setUsers(await userRes.json());
        
        const recordRes = await fetch('/api/attendance/records', { headers: getHeaders() });
        if (recordRes.ok) setRecords(await recordRes.json());
      } else if (role === 'student') {
        const recordRes = await fetch('/api/attendance/records', { headers: getHeaders() });
        if (recordRes.ok) setRecords(await recordRes.json());
      }
    } catch (e) {
      console.error("Error loading data", e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
      if (role === 'admin') setActiveTab('departments');
      else if (role === 'lecturer') setActiveTab('sessions');
      else if (role === 'student') setActiveTab('attendance');
    }
  }, [token, role]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        handleLoginSuccess(data);
      } else {
        const err = await res.json();
        setLoginError(err.detail || "Authentication failed");
      }
    } catch (err) {
      setLoginError("Could not connect to backend server");
    }
  };

  // --- CRUD ACTIONS ---
  
  const handleAddDept = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/departments', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newDeptName })
    });
    if (res.ok) {
      setNewDeptName('');
      setShowModal(null);
      fetchData();
    }
  };

  const handleDeleteDept = async (id) => {
    if (confirm("Delete this department?")) {
      await fetch(`/api/departments/${id}`, { method: 'DELETE', headers: getHeaders() });
      fetchData();
    }
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newCourseName,
        department_id: parseInt(newCourseDept),
        lecturer_id: newCourseLecturer ? parseInt(newCourseLecturer) : null
      })
    });
    if (res.ok) {
      setNewCourseName('');
      setNewCourseDept('');
      setNewCourseLecturer('');
      setShowModal(null);
      fetchData();
    }
  };

  const handleDeleteCourse = async (id) => {
    if (confirm("Delete this course?")) {
      await fetch(`/api/courses/${id}`, { method: 'DELETE', headers: getHeaders() });
      fetchData();
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        department_id: newUserDept ? parseInt(newUserDept) : null,
        password: newUserPassword
      })
    });
    if (res.ok) {
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('student');
      setNewUserDept('');
      setNewUserPassword('');
      setShowModal(null);
      fetchData();
    }
  };

  const handleDeleteUser = async (id) => {
    if (confirm("Delete this user?")) {
      await fetch(`/api/users/${id}`, { method: 'DELETE', headers: getHeaders() });
      fetchData();
    }
  };

  // --- CAMERA / WEBCAM LOGIC ---

  const startCamera = async () => {
    setAttendanceResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      alert("Unable to open camera: " + err.message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const captureFrame = () => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // Enroll reference photo
  const handleEnrollFace = async () => {
    const dataUrl = captureFrame();
    if (!dataUrl) return;

    const formData = new FormData();
    formData.append('image_base64', dataUrl);

    stopCamera();
    try {
      const res = await fetch(`/api/users/${selectedUserForFace.id}/reference-image`, {
        method: 'POST',
        headers: getHeaders(),
        body: formData
      });
      if (res.ok) {
        alert("Face biometric enrolled successfully!");
        setShowModal(null);
        fetchData();
      } else {
        const err = await res.json();
        alert("Enrollment failed: " + err.detail);
      }
    } catch (e) {
      alert("Error sending biometric to backend.");
    }
  };

  // Submit attendance photo
  const handleSubmitAttendance = async (sessionId) => {
    const dataUrl = captureFrame();
    if (!dataUrl) return;

    stopCamera();
    try {
      const res = await fetch('/api/attendance/submit', {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          image_base64: dataUrl
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setAttendanceResult({
          success: data.match,
          msg: data.match ? "Face Verified! Marked as Present." : "Verification Failed: Face mismatch.",
          score: data.similarity_score
        });
        fetchData();
      } else {
        setAttendanceResult({
          success: false,
          msg: data.detail || "Verification failed."
        });
      }
    } catch (e) {
      setAttendanceResult({
        success: false,
        msg: "Failed to connect to comparison engine."
      });
    }
  };

  // Lecturer open/close sessions
  const handleStartSession = async () => {
    if (!selectedCourseForSession) return;
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(selectedCourseForSession) })
    });
    if (res.ok) {
      fetchData();
    }
  };

  const handleCloseSession = async (id) => {
    const res = await fetch(`/api/sessions/${id}/close`, {
      method: 'PUT',
      headers: getHeaders()
    });
    if (res.ok) {
      fetchData();
    }
  };

  if (!token) {
    // LOGIN PANEL WITH SLEEK GRADIENTS & GLASSMORPHISM
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '1rem' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 className="logo" style={{ justifyContent: 'center', fontSize: '2.2rem' }}>BioAttend</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Hybrid Attendance Management & Biometrics
            </p>
          </div>

          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                required 
                placeholder="email@attendance.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                required 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {loginError && (
              <div style={{ 
                background: 'var(--color-error-bg)', 
                color: 'var(--color-error)', 
                padding: '0.75rem', 
                borderRadius: 'var(--radius-sm)', 
                fontSize: '0.85rem', 
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <ShieldAlert size={16} />
                {loginError}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* GLOBAL GLASS HEADER */}
      <header>
        <div className="logo"><Award /> BioAttend</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="user-badge">
            <span style={{ fontSize: '0.8rem', background: 'var(--color-primary-light)', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
              {role}
            </span>
            <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{userName}</span>
          </div>
          <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={handleLogout}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </header>

      {/* DASHBOARD BODY */}
      <main className="main-content">
        <div className="dashboard-grid">
          {/* SIDEBAR NAVIGATION */}
          <aside className="sidebar">
            {role === 'admin' && (
              <>
                <div 
                  className={`sidebar-nav-item ${activeTab === 'departments' ? 'active' : ''}`}
                  onClick={() => setActiveTab('departments')}
                >
                  <Building2 size={18} /> Departments
                </div>
                <div 
                  className={`sidebar-nav-item ${activeTab === 'courses' ? 'active' : ''}`}
                  onClick={() => setActiveTab('courses')}
                >
                  <BookOpen size={18} /> Courses
                </div>
                <div 
                  className={`sidebar-nav-item ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => setActiveTab('users')}
                >
                  <Users size={18} /> Users & Biometrics
                </div>
                <div 
                  className={`sidebar-nav-item ${activeTab === 'sessions' ? 'active' : ''}`}
                  onClick={() => setActiveTab('sessions')}
                >
                  <Calendar size={18} /> Sessions Log
                </div>
              </>
            )}

            {role === 'lecturer' && (
              <>
                <div 
                  className={`sidebar-nav-item ${activeTab === 'sessions' ? 'active' : ''}`}
                  onClick={() => setActiveTab('sessions')}
                >
                  <Play size={18} /> Active Sessions
                </div>
                <div 
                  className={`sidebar-nav-item ${activeTab === 'logs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('logs')}
                >
                  <FileSpreadsheet size={18} /> Attendance Reports
                </div>
              </>
            )}

            {role === 'student' && (
              <>
                <div 
                  className={`sidebar-nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
                  onClick={() => setActiveTab('attendance')}
                >
                  <Camera size={18} /> Mark Attendance
                </div>
                <div 
                  className={`sidebar-nav-item ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  <Calendar size={18} /> History Logs
                </div>
              </>
            )}
          </aside>

          {/* MAIN PANELS */}
          <section className="glass-panel" style={{ padding: '2rem' }}>
            
            {/* ADMIN - DEPARTMENTS PANEL */}
            {activeTab === 'departments' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2>Departments Management</h2>
                  <button className="btn btn-primary" onClick={() => setShowModal('dept')}>
                    <Plus size={16} /> New Department
                  </button>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map(d => (
                        <tr key={d.id}>
                          <td>{d.id}</td>
                          <td>{d.name}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => handleDeleteDept(d.id)}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ADMIN - COURSES PANEL */}
            {activeTab === 'courses' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2>Courses Management</h2>
                  <button className="btn btn-primary" onClick={() => setShowModal('course')}>
                    <Plus size={16} /> New Course
                  </button>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Course Name</th>
                        <th>Department</th>
                        <th>Lecturer Assigned</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map(c => (
                        <tr key={c.id}>
                          <td>{c.id}</td>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td>{c.department_name}</td>
                          <td>{c.lecturer_name || <span style={{ color: 'var(--color-text-muted)' }}>Unassigned</span>}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => handleDeleteCourse(c.id)}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ADMIN - USERS & BIOMETRICS PANEL */}
            {activeTab === 'users' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2>Users & Biometrics</h2>
                  <button className="btn btn-primary" onClick={() => setShowModal('user')}>
                    <Plus size={16} /> Register User
                  </button>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Biometric Enrolled</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 600 }}>{u.name}</td>
                          <td>{u.email}</td>
                          <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                          <td>
                            {u.role === 'student' ? (
                              u.has_reference_image ? (
                                <span className="badge badge-present">Ready</span>
                              ) : (
                                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => {
                                  setSelectedUserForFace(u);
                                  setShowModal('face');
                                  startCamera();
                                }}>
                                  <Camera size={14} /> Enroll
                                </button>
                              )
                            ) : (
                              <span style={{ color: 'var(--color-text-dark)' }}>N/A</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => handleDeleteUser(u.id)}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ADMIN / LECTURER - SESSIONS LOG PANEL */}
            {activeTab === 'sessions' && (
              <div>
                <h2>Attendance Sessions</h2>
                
                {role === 'lecturer' && (
                  <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Start Session for Course</label>
                      <select 
                        className="form-input" 
                        value={selectedCourseForSession}
                        onChange={e => setSelectedCourseForSession(e.target.value)}
                      >
                        <option value="">-- Choose Course --</option>
                        {courses.filter(c => c.lecturer_name === userName || role === 'admin').map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <button className="btn btn-primary" onClick={handleStartSession} disabled={!selectedCourseForSession}>
                      Initialize Session
                    </button>
                  </div>
                )}

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Course</th>
                        <th>Started At</th>
                        <th>Ended At</th>
                        <th>Status</th>
                        {role === 'lecturer' && <th style={{ textAlign: 'right' }}>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(s => (
                        <tr key={s.id}>
                          <td>{s.id}</td>
                          <td style={{ fontWeight: 600 }}>{s.course_name}</td>
                          <td>{new Date(s.start_time).toLocaleString()}</td>
                          <td>{s.end_time ? new Date(s.end_time).toLocaleString() : '—'}</td>
                          <td>
                            <span className={`badge badge-${s.status}`}>
                              {s.status}
                            </span>
                          </td>
                          {role === 'lecturer' && (
                            <td style={{ textAlign: 'right' }}>
                              {s.status === 'active' && (
                                <button className="btn btn-danger" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleCloseSession(s.id)}>
                                  Close
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* LECTURER - ATTENDANCE REPORTS */}
            {activeTab === 'logs' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2>Attendance Log Reports</h2>
                  <a className="btn btn-primary" href="/api/attendance/export">
                    <FileSpreadsheet size={16} /> Export CSV
                  </a>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Course</th>
                        <th>Timestamp</th>
                        <th>Similarity</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>{r.student_name}</td>
                          <td>{r.course_name}</td>
                          <td>{new Date(r.timestamp).toLocaleString()}</td>
                          <td>{r.similarity_score !== null ? `${(r.similarity_score).toFixed(4)}` : 'N/A'}</td>
                          <td>
                            <span className={`badge badge-${r.status}`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STUDENT - MARK ATTENDANCE */}
            {activeTab === 'attendance' && (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Live Attendance Session Check-In</h2>

                {activeSessions.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '3rem', background: 'rgba(255,255,255,0.02)' }}>
                    <ShieldAlert size={48} style={{ color: 'var(--color-warning)', marginBottom: '1rem' }} />
                    <h3>No Active Sessions Found</h3>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                      There are no active attendance sessions open for check-in at the moment.
                    </p>
                  </div>
                ) : (
                  <div>
                    {activeSessions.map(s => (
                      <div key={s.id} className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ color: 'var(--color-primary)' }}>{s.course_name}</h3>
                        <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 1.5rem 0' }}>Session ID: #{s.id}</p>
                        
                        {!isCameraActive && !attendanceResult && (
                          <button className="btn btn-primary" onClick={startCamera}>
                            <Camera size={16} /> Open Web Camera
                          </button>
                        )}

                        {isCameraActive && (
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <div className="webcam-wrapper">
                              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block' }}></video>
                              <div className="webcam-overlay-ring"></div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                              <button className="btn btn-primary" onClick={() => handleSubmitAttendance(s.id)}>
                                Verify & Mark Present
                              </button>
                              <button className="btn btn-secondary" onClick={stopCamera}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {attendanceResult && (
                          <div style={{ 
                            marginTop: '1rem', 
                            padding: '1.5rem', 
                            borderRadius: 'var(--radius-md)', 
                            background: attendanceResult.success ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                            border: `1px solid ${attendanceResult.success ? 'var(--color-success)' : 'var(--color-error)'}`,
                            maxWidth: '400px',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            {attendanceResult.success ? (
                              <CheckCircle2 size={36} style={{ color: 'var(--color-success)' }} />
                            ) : (
                              <XCircle size={36} style={{ color: 'var(--color-error)' }} />
                            )}
                            <h4 style={{ color: attendanceResult.success ? 'var(--color-success)' : 'var(--color-error)' }}>
                              {attendanceResult.msg}
                            </h4>
                            {attendanceResult.score !== undefined && (
                              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                Similarity Score: {attendanceResult.score.toFixed(4)} (Threshold: 0.36)
                              </p>
                            )}
                            <button className="btn btn-secondary" style={{ marginTop: '0.75rem', padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => setAttendanceResult(null)}>
                              Try Again
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STUDENT - HISTORY LOGS */}
            {activeTab === 'history' && (
              <div>
                <h2>Your Attendance Records</h2>
                <div className="table-container" style={{ marginTop: '1.5rem' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Check-in Time</th>
                        <th>Status</th>
                        <th>Similarity Index</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>{r.course_name}</td>
                          <td>{new Date(r.timestamp).toLocaleString()}</td>
                          <td>
                            <span className={`badge badge-${r.status}`}>
                              {r.status}
                            </span>
                          </td>
                          <td>{r.similarity_score !== null ? `${r.similarity_score.toFixed(4)}` : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </section>
        </div>
      </main>

      {/* --- MODAL DIALOGS --- */}

      {/* DEPARTMENT MODAL */}
      {showModal === 'dept' && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h3 style={{ marginBottom: '1.5rem' }}>Add New Department</h3>
            <form onSubmit={handleAddDept}>
              <div className="form-group">
                <label className="form-label">Department Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="e.g. Electrical Engineering"
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COURSE MODAL */}
      {showModal === 'course' && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h3 style={{ marginBottom: '1.5rem' }}>Add New Course</h3>
            <form onSubmit={handleAddCourse}>
              <div className="form-group">
                <label className="form-label">Course Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="e.g. Neural Networks"
                  value={newCourseName}
                  onChange={e => setNewCourseName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select 
                  className="form-input" 
                  required 
                  value={newCourseDept}
                  onChange={e => setNewCourseDept(e.target.value)}
                >
                  <option value="">-- Select Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Lecturer Assigned</label>
                <select 
                  className="form-input" 
                  value={newCourseLecturer}
                  onChange={e => setNewCourseLecturer(e.target.value)}
                >
                  <option value="">-- Choose Lecturer (Optional) --</option>
                  {users.filter(u => u.role === 'lecturer').map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER REGISTRATION MODAL */}
      {showModal === 'user' && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h3 style={{ marginBottom: '1.5rem' }}>Register User</h3>
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="John Doe"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  required 
                  placeholder="john@school.edu"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select 
                  className="form-input" 
                  required
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value)}
                >
                  <option value="student">Student</option>
                  <option value="lecturer">Lecturer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select 
                  className="form-input" 
                  required
                  value={newUserDept}
                  onChange={e => setNewUserDept(e.target.value)}
                >
                  <option value="">-- Choose Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  required 
                  placeholder="••••••••"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FACE ENROLLMENT MODAL */}
      {showModal === 'face' && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '520px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem' }}>Enroll Biometrics: {selectedUserForFace?.name}</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Ensure the student's face is centered inside the target ring and well lit.
            </p>
            
            <div className="webcam-wrapper" style={{ marginBottom: '1.5rem' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block' }}></video>
              <div className="webcam-overlay-ring"></div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={handleEnrollFace}>
                Capture & Enroll Reference
              </button>
              <button className="btn btn-secondary" onClick={() => {
                stopCamera();
                setShowModal(null);
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
