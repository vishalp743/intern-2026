import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [formName, setFormName] = useState('');
  const [customFields, setCustomFields] = useState([
    {
      fieldName: '',
      minValue: 0,
      maxValue: 10,
      subFields: [
        { subFieldName: '', minValue: 0, maxValue: 10 },
        { subFieldName: '', minValue: 0, maxValue: 10 },
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

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Fetch interns and tutors on mount
  useEffect(() => {
    fetchInterns();
    fetchTutors();
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

  // ========== FORM MANAGEMENT ==========
  const handleAddField = () => {
    setCustomFields([
      ...customFields,
      {
        fieldName: '',
        minValue: 0,
        maxValue: 10,
        subFields: [
          { subFieldName: '', minValue: 0, maxValue: 10 },
          { subFieldName: '', minValue: 0, maxValue: 10 },
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
      maxValue: 10,
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

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!selectedTutor) {
      showMessage('error', 'Please select a tutor for this form.');
      return;
    }

    setLoading(true);
    try {
      const newForm = {
        formName,
        customFields,
        status: 'Active',
        tutor: selectedTutor,
      };
      const response = await api.post('/forms', newForm);
      showMessage('success', `Form "${response.data.formName}" created for selected tutor!`);
      setFormName('');
      setSelectedTutor('');
      setCustomFields([
        {
          fieldName: '',
          minValue: 0,
          maxValue: 10,
          subFields: [
            { subFieldName: '', minValue: 0, maxValue: 10 },
            { subFieldName: '', minValue: 0, maxValue: 10 },
          ],
        },
      ]);
    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'Error creating form';
      showMessage('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };



  // ========== RENDER ==========
  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>Manage users and create evaluation forms</p>
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
          👥 Manage Users
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
      </div>

      {/* ========== USERS TAB ========== */}
      {activeTab === 'users' && (
        <div className="tab-content">
          <div className="form-card">
            <h2>Add New User</h2>
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

              <div className="form-group">
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

      {/* ========== INTERNS TAB ========== */}
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

      {/* ========== FORM CREATION TAB ========== */}
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
                <p className="section-info">
                  These 5 default metrics include 4 sub-standards each.
                </p>
              </div>

              {/* Custom Fields Section */}
              <div className="section-divider">
                <h3>➕ Custom Fields</h3>
                <p className="section-info">
                  Add custom fields with optional sub-fields.
                </p>

                {customFields.map((field, fieldIndex) => (
                  <div key={fieldIndex} className="custom-field-container">
                    <div className="custom-field-header">
                      <input
                        type="text"
                        placeholder="Field Name"
                        name="fieldName"
                        value={field.fieldName}
                        onChange={(event) => handleFieldChange(fieldIndex, event)}
                      />
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => handleRemoveField(fieldIndex)}
                      >
                        ✕ Remove
                      </button>
                    </div>

                    <div className="sub-fields-section">
                      <label className="sub-fields-label">Sub-fields (Optional):</label>
                      {field.subFields &&
                        field.subFields.map((subField, subIndex) => (
                          <div key={subIndex} className="sub-field">
                            <input
                              type="text"
                              placeholder="Sub-field Name"
                              name="subFieldName"
                              value={subField.subFieldName}
                              onChange={(event) =>
                                handleSubFieldChange(fieldIndex, subIndex, event)
                              }
                            />
                            <button
                              type="button"
                              className="btn-remove-sub"
                              onClick={() =>
                                handleRemoveSubField(fieldIndex, subIndex)
                              }
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      <button
                        type="button"
                        className="btn-secondary-small"
                        onClick={() => handleAddSubField(fieldIndex)}
                      >
                        + Add Sub-field
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleAddField}
                >
                  + Add Custom Field
                </button>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Form'}
                </button>

                {/* NEW: View Visualizations button opens the visualization page in a new tab */}
                
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
