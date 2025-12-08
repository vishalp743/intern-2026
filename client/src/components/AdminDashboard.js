import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminDashboard.css';

// 1. Define Standard Metrics as a Constant (Extracted from server/models/FormDefinition.js for display)
const STANDARD_METRICS = [
  {
    fieldName: 'Technical Competence',
    maxValue: 15,
    subFields: [
      { subFieldName: 'Fundamentals Understanding', maxValue: 5 }, 
      { subFieldName: 'Ability to Ask and Answer Questions', maxValue: 5 },
      { subFieldName: 'Quiz Score', maxValue: 5 },
    ],
  },
  {
    fieldName: 'Communication',
    maxValue: 15,
    subFields: [
      { subFieldName: 'Active Listening', maxValue: 5 },
      { subFieldName: 'Verbal Fluency + Articulation ', maxValue: 5 },
      { subFieldName: 'PPT + Way of Delivery (Clarity)', maxValue: 5 },
    ],
  },
  {
    fieldName: 'Learning & Adaptability',
    maxValue: 15,
    subFields: [
      { subFieldName: 'Efforts towards understanding ', maxValue: 5 },
      { subFieldName: 'Handling uncertainity', maxValue: 5 },
      { subFieldName: 'Willingness to Receive Feedback', maxValue: 5 },
    ],
  },
  {
    fieldName: 'Initiative & Ownership',
    maxValue: 15,
    subFields: [
      { subFieldName: 'Volunteering for Demonstrations / Answers', maxValue: 5 },
      { subFieldName: 'Asking Relevant Questions', maxValue: 5 },
      { subFieldName: 'Recall During the Next Session', maxValue: 5 },
    ],
  },
  {
    fieldName: 'Professionalism',
    maxValue: 15,
    subFields: [
      { subFieldName: 'Respectful Communication ', maxValue: 5 },
      { subFieldName: 'Responsiveness in Team Communication', maxValue: 5 },
      { subFieldName: 'Punctuality', maxValue: 5 },
    ],
  },
];

// 2. NEW Component: Metric Details Modal (Popup)
const MetricDetailsModal = ({ metrics, onClose }) => (
    <div className="modal-backdrop">
        <div className="metric-modal">
            <div className="modal-header">
                <h2>Standard Metrics Definition</h2>
                <button className="close-btn-modal" onClick={onClose}>&times;</button>
            </div>
            <p className="modal-info">These metrics are automatically included in all forms and are normalized to a 0-10 scale based on 3 sub-metrics (max raw score of 5 each, total raw max 15 per metric).</p>
            <div className="metric-list">
                {metrics.map((metric, index) => (
                    <div key={index} className="metric-item">
                        <h4 className="metric-title">{metric.fieldName} <span className="metric-max">(Max Score: {metric.maxValue} Normalized: 10)</span></h4>
                        <ul className="submetric-list">
                            {metric.subFields.map((sub, subIndex) => (
                                <li key={subIndex}>
                                    {sub.subFieldName} <span className="submetric-max">(Raw Score Range: 0-{sub.maxValue})</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    </div>
);


const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [formName, setFormName] = useState('');
  
  // Default state kept as requested, but we will filter empty ones on submit
  const [customFields, setCustomFields] = useState([
    {
      fieldName: '',
      minValue: 0,
      maxValue: 15, 
      subFields: [
        { subFieldName: '', minValue: 0, maxValue: 5 }, 
        { subFieldName: '', minValue: 0, maxValue: 5 },
        { subFieldName: '', minValue: 0, maxValue: 5 },
      ],
    },
  ]);

  // User management states
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('Tutor');

  // Intern management states
  const [internName, setInternName] = useState('');
  const [internEmail, setInternEmail] = useState('');
  const [interns, setInterns] = useState([]);

  // Tutor management for form association
  const [tutors, setTutors] = useState([]);
  const [selectedTutor, setSelectedTutor] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [allForms, setAllForms] = useState([]); 
  // ✅ NEW STATE
  const [showMetricModal, setShowMetricModal] = useState(false); 

  const navigate = useNavigate(); 

  // --- Logout Function ---
  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      try {
        await api.post('/auth/logout');
      } catch (error) {
        console.error("Logout failed on server, but logging out client-side.", error);
      } finally {
        localStorage.removeItem('token');
        navigate('/');
      }
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Fetch interns and tutors on mount
  useEffect(() => {
    fetchInterns();
    fetchTutors();
    fetchAllForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTutors = async () => {
    try {
      const res = await api.get('/users?role=Tutor');
      setTutors(res.data);
    } catch (error) {
      console.error('Error fetching tutors:', error);
    }
  };

  const fetchInterns = async () => {
    try {
      const response = await api.get('/interns');
      setInterns(response.data);
    } catch (error) {
      console.error('Error fetching interns:', error);
    }
  };

  const fetchAllForms = async () => {
    try {
      const res = await api.get('/forms'); 
      setAllForms(res.data);
    } catch (error) {
      console.error('Error fetching all forms:', error);
      showMessage('error', 'Failed to load forms list.');
    }
  };


  // ========== USER MANAGEMENT ==========
  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newUser = {
        name: userName,
        email: userEmail,
        password: userPassword,
        role: userRole,
      };
      const response = await api.post('/users', newUser);
      showMessage('success', `User "${response.data.name}" created successfully!`);
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      setUserRole('Tutor');
      fetchTutors(); // Refresh tutor list
    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'Error creating user';
      showMessage('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ========== INTERN MANAGEMENT ==========
  const handleAddIntern = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newIntern = { name: internName, email: internEmail };
      const response = await api.post('/interns', newIntern);
      showMessage('success', `Intern "${response.data.name}" added successfully!`);
      setInternName('');
      setInternEmail('');
      fetchInterns();
    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'Error adding intern';
      showMessage('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIntern = async (internId) => {
    if (window.confirm('Are you sure you want to delete this intern?')) {
      setLoading(true);
      try {
        await api.delete(`/interns/${internId}`);
        showMessage('success', 'Intern deleted successfully!');
        fetchInterns();
      } catch (error) {
        const errorMsg = error.response?.data?.msg || 'Error deleting intern';
        showMessage('error', errorMsg);
      } finally {
        setLoading(false);
      }
    }
  };

  // ========== FORM MANAGEMENT - HELPERS (Existing, not modified) ==========
  const handleAddField = () => {
    setCustomFields([
      ...customFields,
      {
        fieldName: '',
        minValue: 0,
        maxValue: 15,
        subFields: [
          { subFieldName: '', minValue: 0, maxValue: 5 },
          { subFieldName: '', minValue: 0, maxValue: 5 },
          { subFieldName: '', minValue: 0, maxValue: 5 },
        ],
      },
    ]);
  };

  const handleFieldChange = (index, event) => {
    const values = [...customFields];
    values[index][event.target.name] = event.target.value;
    setCustomFields(values);
  };

  const handleSubFieldChange = (fieldIndex, subIndex, event) => {
    const values = [...customFields];
    values[fieldIndex].subFields[subIndex][event.target.name] = event.target.value;
    setCustomFields(values);
  };

  const handleAddSubField = (fieldIndex) => {
    const values = [...customFields];
    values[fieldIndex].subFields.push({
      subFieldName: '',
      minValue: 0,
      maxValue: 5,
    });
    setCustomFields(values);
  };

  const handleRemoveSubField = (fieldIndex, subIndex) => {
    const values = [...customFields];
    values[fieldIndex].subFields.splice(subIndex, 1);
    setCustomFields(values);
  };

  const handleRemoveField = (fieldIndex) => {
    const values = customFields.filter((_, i) => i !== fieldIndex);
    setCustomFields(values);
  };
  
  // ========== FORM MANAGEMENT - ACTIONS (Modified with deletion logic) ==========

  const handleDeleteForm = async (formId, formName) => {
    if (window.confirm(`Are you sure you want to delete the form "${formName}"? This will permanently delete the form definition AND ALL ASSOCIATED EVALUATION DATA. This action cannot be undone.`)) {
      setLoading(true);
      try {
        await api.delete(`/forms/${formId}`); // DELETE /api/forms/:id
        showMessage('success', `Form "${formName}" and its evaluation data deleted successfully!`);
        fetchAllForms(); // Refresh the list
      } catch (error) {
        const errorMsg = error.response?.data?.msg || 'Error deleting form';
        showMessage('error', errorMsg);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!selectedTutor) {
      showMessage('error', 'Please select a tutor for this form.');
      return;
    }

    setLoading(true);
    try {
      // Filter out custom fields that have no name (since the UI is hidden, default state is empty)
      const validCustomFields = customFields.filter(field => field.fieldName.trim() !== '');

      const newForm = {
        formName,
        customFields: validCustomFields,
        status: 'Active',
        tutor: selectedTutor,
      };
      const response = await api.post('/forms', newForm);
      showMessage('success', `Form "${response.data.formName}" created for selected tutor!`);
      setFormName('');
      setSelectedTutor('');
      
      // Reset custom fields
      setCustomFields([
        {
          fieldName: '',
          minValue: 0,
          maxValue: 15,
          subFields: [
            { subFieldName: '', minValue: 0, maxValue: 5 },
            { subFieldName: '', minValue: 0, maxValue: 5 },
            { subFieldName: '', minValue: 0, maxValue: 5 },
          ],
        },
      ]);
      
      fetchAllForms(); // Refresh the list after creation
    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'Error creating form';
      showMessage('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleViewVisualizations = () => {
    navigate('/admin/visualizations');
  };

  const renderFormsList = () => {
    if (allForms.length === 0) {
      return <p className="empty-message">No evaluation forms created yet.</p>;
    }

    return (
      <div className="interns-list-section">
        <h3>Available Forms ({allForms.length})</h3>
        <table className="interns-table">
          <thead>
            <tr>
              <th>Form Name</th>
              <th>Assigned Tutor</th>
              <th>Status</th>
              <th>Created On</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {allForms.map((form) => (
              <tr key={form._id}>
                <td>{form.formName}</td>
                {/* Tutor data is populated and available under form.tutor */}
                <td>{form.tutor?.name || 'N/A'}</td> 
                <td><span style={{ color: form.status === 'Active' ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>{form.status}</span></td>
                <td>{new Date(form.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    type="button"
                    className="btn-delete-small"
                    onClick={() => handleDeleteForm(form._id, form.formName)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };


  // ========== RENDER ==========
  return (
    <div className="">
      {/* 3. Render Modal */}
      {showMetricModal && <MetricDetailsModal metrics={STANDARD_METRICS} onClose={() => setShowMetricModal(false)} />}
      
      {/* --- Navigation Bar --- */}
      <nav className="navbar">
        <div className="navbar-left">
          <h2 className="nav-title">Intern Evaluation Portal - Admin</h2>
        </div>
        <div className="navbar-right">
          <button className="nav-btn" onClick={() => setActiveTab('users')}>
            Dashboard
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h1>Admin Dashboard</h1>
          <p>Manage Trainers and create evaluation forms</p>
        </div>

        {message.text && (
          <div className={`message-alert message-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="tabs-container">
          <button
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Manage Trainers
          </button>
          <button
            className={`tab-button ${activeTab === 'interns' ? 'active' : ''}`}
            onClick={() => setActiveTab('interns')}
          >
            🎓 Manage Interns
          </button>
          <button
            className={`tab-button ${activeTab === 'forms' ? 'active' : ''}`}
            onClick={() => setActiveTab('forms')}
          >
            📋 Create Forms
          </button>
          <button
            className={`tab-button ${activeTab === 'visualizations' ? 'active' : ''}`}
            onClick={() => handleViewVisualizations()}
          >
            📊 Visualizations
          </button>
        </div>

        {/* ========== USERS TAB (Existing) ========== */}
        {activeTab === 'users' && (
          <div className="tab-content">
            <div className="form-card">
              <h2>Add New Trainer</h2>
              <form onSubmit={handleAddUser}>
                <div className="form-group">
                  <label htmlFor="userName">Full Name *</label>
                  <input
                    id="userName"
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="userEmail">Email Address *</label>
                  <input
                    id="userEmail"
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="userPassword">Password *</label>
                  <input
                    id="userPassword"
                    type="password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    minLength="6"
                  />
                </div>

                <div className="form-group" style={{ display: "none" }}>
                  <label htmlFor="userRole">User Role *</label>
                  <select
                    id="userRole"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                  >
                    <option value="Tutor">Tutor</option>
                  </select>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ========== INTERNS TAB (Existing) ========== */}
        {activeTab === 'interns' && (
          <div className="tab-content">
            <div className="form-card">
              <h2>Add New Intern</h2>
              <form onSubmit={handleAddIntern}>
                <div className="form-group">
                  <label htmlFor="internName">Intern Name *</label>
                  <input
                    id="internName"
                    type="text"
                    value={internName}
                    onChange={(e) => setInternName(e.target.value)}
                    placeholder="Enter intern name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="internEmail">Email Address *</label>
                  <input
                    id="internEmail"
                    type="email"
                    value={internEmail}
                    onChange={(e) => setInternEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Intern'}
                </button>
              </form>

              <div className="interns-list-section">
                <h3>Current Interns</h3>
                {interns.length === 0 ? (
                  <p className="empty-message">No interns added yet</p>
                ) : (
                  <table className="interns-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interns.map((intern) => (
                        <tr key={intern._id}>
                          <td>{intern.name}</td>
                          <td>{intern.email}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-delete-small"
                              onClick={() => handleDeleteIntern(intern._id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========== FORM CREATION / MANAGEMENT TAB (MODIFIED) ========== */}
        {activeTab === 'forms' && (
          <div className="tab-content">
            <div className="form-card">
              <h2>Create Evaluation Form</h2>
              <form onSubmit={handleSubmitForm}>
                <div className="form-group">
                  <label htmlFor="formName">Form Name *</label>
                  <input
                    id="formName"
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter form name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="tutorSelect">Assign to Tutor *</label>
                  <select
                    id="tutorSelect"
                    required
                    value={selectedTutor}
                    onChange={(e) => setSelectedTutor(e.target.value)}
                  >
                    <option value="">-- Select Tutor --</option>
                    {tutors.map((tutor) => (
                      <option key={tutor._id} value={tutor._id}>
                        {tutor.name} ({tutor.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="section-divider">
                  <h3>📌 Standard Fields</h3>
                  <p className="section-info" style={{ marginBottom: '5px' }}>
                    These 5 default metrics include 3 sub-standards each.
                  </p>
                  {/* Link/Button to open Modal */}
                  <button 
                    type="button" 
                    className="link-btn" 
                    onClick={() => setShowMetricModal(true)}
                  >
                    View Details & Scoring Logic
                  </button>
                </div>

                {/* Custom Fields Section - COMMENTED OUT (Existing) */}

                <div className="form-actions" style={{ display: 'flex', gap: '15px' }}>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Form'}
                  </button>
                </div>
              </form>
              
              <hr style={{ margin: '40px 0', border: 'none', borderTop: '2px solid #ecf0f1' }} /> 
              
              {renderFormsList()}
              
            </div>
          </div>
        )}

        {/* ========== VISUALIZATIONS TAB (Existing) ========== */}
        {activeTab === 'visualizations' && (
          <div className="tab-content">
            <div className="form-card" style={{ textAlign: 'center', padding: '50px' }}>
              <h2>Visualizations Dashboard</h2>
              <p style={{ color: '#555', marginBottom: '30px' }}>
                View detailed analytics, radar charts, and score comparisons for all interns.
              </p>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleViewVisualizations}
                style={{ 
                  backgroundColor: '#2ecc71', 
                  color: 'white', 
                  maxWidth: '300px', 
                  margin: '0 auto',
                  fontSize: '18px',
                  padding: '15px'
                }}
              >
                View Visualizations 📊
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
