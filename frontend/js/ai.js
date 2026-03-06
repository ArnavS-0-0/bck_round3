/* ===================================================
   AI Clinical Response Assistant — Core JavaScript
   Handles patient queries, AI responses, and staff ops
   =================================================== */

// ───────────── Configuration ─────────────
const API_BASE = 'https://bck-round3.onrender.com'; // Set to backend URL when available, e.g. 'https://api.example.com'
const STORAGE_KEY = 'clinassist_queries';
const SETTINGS_KEY = 'clinassist_settings';

// ───────────── State ─────────────
let queries = [];
let currentQueryId = null;
let currentUrgencyFilter = 'all';

// ───────────── Helpers ─────────────
function generateId() {
  return 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getUrgencyClass(urgency) {
  const map = { 'Low': 'badge-low', 'Medium': 'badge-medium', 'High': 'badge-high' };
  return map[urgency] || 'badge-info';
}

// ───────────── Storage ─────────────
function loadQueries() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    queries = data ? JSON.parse(data) : [];
  } catch { queries = []; }
}

function saveQueries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
}

function getSettings() {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : { tone: 'professional', strictness: 'balanced' };
  } catch {
    return { tone: 'professional', strictness: 'balanced' };
  }
}

function saveSettingsToStorage(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ───────────── AI Simulation ─────────────
// Generates realistic clinical draft responses based on query context
function generateAIDraft(queryData) {
  const settings = getSettings();
  const { department, category, message, urgency, name } = queryData;
  const tone = settings.tone;
  const strictness = settings.strictness;

  // Build context-aware response templates
  const greetings = {
    professional: `Dear ${name || 'Patient'},\n\n`,
    empathetic: `Dear ${name || 'Patient'},\n\nThank you for reaching out to us. We understand that health concerns can be worrying, and we appreciate you sharing this with our team.\n\n`,
    concise: `Hello ${name || 'Patient'},\n\n`,
    detailed: `Dear ${name || 'Patient'},\n\nThank you for contacting the ${department || 'medical'} department. We have carefully reviewed your query and prepared the following preliminary response.\n\n`
  };

  const departmentResponses = {
    'General Medicine': {
      strict: `Based on the clinical presentation described, the following differential considerations apply:\n\n1. A comprehensive metabolic panel (CMP) and complete blood count (CBC) are recommended as initial diagnostic measures.\n2. Vital signs monitoring should be maintained with regular intervals.\n3. Further diagnostic imaging may be warranted pending initial lab results.\n\nPlease schedule a follow-up consultation within 5-7 business days for clinical assessment.`,
      balanced: `Based on your description, here is our preliminary assessment:\n\n1. We recommend scheduling routine blood work (CBC, metabolic panel) to establish baseline values.\n2. Monitoring your symptoms and noting any changes will be helpful for your upcoming consultation.\n3. If symptoms worsen or new symptoms develop, please don't hesitate to contact us or visit the emergency department.\n\nA follow-up appointment is recommended within the next week.`,
      'patient-friendly': `Thank you for telling us about your symptoms. Here's what we suggest:\n\n1. We'd like to run some standard blood tests to get a clearer picture of your health.\n2. Please keep track of how you're feeling — when symptoms come and go, and what makes them better or worse.\n3. If anything gets worse or you feel very unwell, please come see us right away.\n\nWe'd like to see you again in about a week.`
    },
    'Cardiology': {
      strict: `Cardiovascular assessment protocol initiated:\n\n1. A 12-lead electrocardiogram (ECG) is recommended for initial cardiac rhythm evaluation.\n2. Echocardiographic evaluation may be indicated based on clinical presentation.\n3. Serial cardiac biomarker assessment (troponin, BNP) should be considered.\n4. Blood pressure monitoring with a validated oscillometric device is advised.\n\nCritical values should be reported immediately to the on-call cardiologist.`,
      balanced: `Regarding your cardiovascular concerns:\n\n1. We recommend an ECG (heart rhythm test) as a starting point.\n2. Depending on the results, an echocardiogram (heart ultrasound) may be helpful.\n3. Regular blood pressure monitoring at home is recommended.\n4. Please note any episodes of chest discomfort, shortness of breath, or irregular heartbeat.\n\nPlease avoid strenuous activity until your consultation.`,
      'patient-friendly': `We take heart-related concerns very seriously. Here's our plan:\n\n1. We'd like to do a simple heart test (ECG) to check your heart rhythm.\n2. We may also want to do an ultrasound of your heart to see how it's working.\n3. It would be helpful if you could check your blood pressure at home and keep a log.\n4. Please let us know right away if you experience chest pain, difficulty breathing, or dizziness.\n\nTry to take it easy until your appointment.`
    },
    'Orthopedics': {
      strict: `Musculoskeletal assessment recommendations:\n\n1. Radiographic imaging of the affected region is indicated for initial evaluation.\n2. Inflammatory markers (ESR, CRP) should be assessed.\n3. RICE protocol (Rest, Ice, Compression, Elevation) is recommended for acute management.\n4. NSAID therapy may be considered pending contraindication review.\n\nAdvanced imaging (MRI) will be determined based on initial findings.`,
      balanced: `For your orthopedic concern:\n\n1. We recommend an X-ray of the affected area as a first step.\n2. Rest and ice application can help manage pain and swelling.\n3. Over-the-counter anti-inflammatory medication may provide relief.\n4. Avoid putting excessive strain on the affected area.\n\nWe may recommend further imaging if needed after reviewing the X-ray.`,
      'patient-friendly': `Here's what we suggest for your bone/joint concern:\n\n1. We'd like to take an X-ray to see what's going on.\n2. For now, rest the affected area, apply ice, and try to keep it elevated when possible.\n3. You can take ibuprofen or similar medication for pain, unless you have allergies.\n4. Avoid heavy lifting or movements that cause pain.\n\nWe'll have a better plan once we see the X-ray results.`
    }
  };

  // Default response for departments not explicitly mapped
  const defaultResponse = {
    strict: `Clinical assessment based on the presented query:\n\n1. A comprehensive clinical evaluation is recommended.\n2. Relevant diagnostic investigations will be ordered as indicated.\n3. Treatment protocols will be established following thorough assessment.\n4. Follow-up scheduling is recommended within 7-10 days.\n\nPlease maintain documentation of any symptom progression for clinical review.`,
    balanced: `Based on your query, here is our preliminary guidance:\n\n1. We recommend scheduling a consultation for proper evaluation.\n2. Any relevant medical records or test results you can bring would be helpful.\n3. Please keep a log of your symptoms, including timing and severity.\n4. If you experience any acute worsening, please seek immediate medical attention.\n\nWe look forward to addressing your concerns at your upcoming visit.`,
    'patient-friendly': `Thank you for reaching out. Here's what we'd like you to do:\n\n1. Let's set up an appointment so we can properly look into your concern.\n2. If you have any past test results or medical records, please bring them along.\n3. It helps if you write down when your symptoms happen and how bad they feel.\n4. If things suddenly get worse, please come to the emergency room right away.\n\nWe're here to help and will take great care of you.`
  };

  // Urgency addendum
  const urgencyNotes = {
    'High': `\n\n⚠️ PRIORITY NOTE: This query has been flagged as HIGH urgency. Expedited review and response is recommended. If you are experiencing a medical emergency, please call 911 or visit the nearest emergency room immediately.`,
    'Medium': `\n\nPlease note: Your query has been assigned MEDIUM priority. We aim to provide a thorough response within 24-48 hours.`,
    'Low': ''
  };

  // Closings
  const closings = {
    professional: `\n\nThis response has been generated for preliminary guidance only. Final clinical recommendations will be provided after staff review.\n\nBest regards,\n${department || 'Medical'} Department\nClinAssist AI Healthcare`,
    empathetic: `\n\nPlease know that our team cares deeply about your well-being. This preliminary response will be reviewed by our medical staff to ensure you receive the best possible guidance.\n\nWarmly,\n${department || 'Medical'} Department\nClinAssist AI Healthcare`,
    concise: `\n\nPending staff review.\n\n— ${department || 'Medical'} Dept.`,
    detailed: `\n\nIMPORTANT DISCLAIMER: This is a preliminary AI-generated draft response. It is intended for informational purposes only and does not constitute medical advice, diagnosis, or treatment. A qualified healthcare professional will review this response and may make modifications before it is sent to you.\n\nFor emergencies, please call 911 or your local emergency services.\n\nSincerely,\n${department || 'Medical'} Department\nClinAssist AI Healthcare Platform`
  };

  // Assemble the response
  const deptResponses = departmentResponses[department] || defaultResponse;
  const s = strictness === 'strict' ? 'strict' : (strictness === 'patient-friendly' ? 'patient-friendly' : 'balanced');
  const t = tone || 'professional';

  let response = greetings[t] || greetings.professional;
  response += `Regarding your ${category || 'medical'} query:\n\n`;
  response += deptResponses[s] || deptResponses.balanced;
  response += urgencyNotes[urgency] || '';
  response += closings[t] || closings.professional;

  return response;
}

// ─────────── Patient Portal Functions ───────────

/** Submit a patient query */
function submitPatientQuery() {
  const formCard = document.getElementById('queryFormCard');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const responsePanel = document.getElementById('responsePanel');
  const errorPanel = document.getElementById('errorPanel');

  // Gather form data
  const name = document.getElementById('patientName')?.value?.trim();
  const email = document.getElementById('patientEmail')?.value?.trim();
  const phone = document.getElementById('patientPhone')?.value?.trim();
  const department = 'Triage'; // To be assigned by AI or staff
  const category = 'general';
  const urgency = 'Medium'; // Will be overridden by AI

  const message = document.getElementById('patientMessage')?.value?.trim();

  // Validation
  if (!name || !email || !phone || !message) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  if (!email.includes('@')) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }

  const queryData = {
    id: generateId(),
    name, email, phone, department, category, urgency, message,
    timestamp: new Date().toISOString(),
    status: 'pending',
    aiResponse: '',
    staffEdited: false,
    approvedBy: null,
    approvedAt: null
  };

  // Show loading
  formCard.style.display = 'none';
  responsePanel.style.display = 'none';
  errorPanel.style.display = 'none';
  loadingOverlay.classList.add('active');

  // Simulate API call with backend fallback
  const payload = { name, email, phone, department, category, urgency, message };

  if (API_BASE) {
    // Real backend call
    fetch(`${API_BASE}/suggest-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: payload.message })
    })
      .then(res => {
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then(data => {
        if (data.category) queryData.category = data.category;
        if (data.urgency) {
          let urg = data.urgency.toLowerCase();
          if (urg === 'low') queryData.urgency = 'Low';
          else if (urg === 'high') queryData.urgency = 'High';
          else queryData.urgency = 'Medium';
        }
        queryData.aiResponse = data.suggested_reply || generateAIDraft(queryData);
        finalizeSubmission(queryData, loadingOverlay, responsePanel);
      })
      .catch(err => {
        // Fallback to local AI
        console.warn('Backend unavailable, using local AI:', err);
        queryData.aiResponse = generateAIDraft(queryData);
        finalizeSubmission(queryData, loadingOverlay, responsePanel);
      });
  } else {
    // Local simulation with realistic delay
    setTimeout(() => {
      queryData.aiResponse = generateAIDraft(queryData);
      finalizeSubmission(queryData, loadingOverlay, responsePanel);
    }, 1800);
  }
}

function finalizeSubmission(queryData, loadingOverlay, responsePanel) {
  // Save to storage
  loadQueries();
  queries.unshift(queryData);
  saveQueries();

  // Show success panel (no longer showing AI dictation here)
  loadingOverlay.classList.remove('active');
  responsePanel.style.display = 'block';

  showToast('Query submitted successfully!', 'success');
}

function resetForm() {
  const formCard = document.getElementById('queryFormCard');
  const responsePanel = document.getElementById('responsePanel');
  const errorPanel = document.getElementById('errorPanel');

  if (formCard) formCard.style.display = 'block';
  if (responsePanel) responsePanel.style.display = 'none';
  if (errorPanel) errorPanel.style.display = 'none';
  document.getElementById('patientQueryForm')?.reset();
  const fileDisplay = document.getElementById('fileNameDisplay');
  if (fileDisplay) fileDisplay.style.display = 'none';
}

// ─────────── Patient Status Lookup Functions ───────────

function switchPatientTab(tab) {
  const btnNew = document.getElementById('tabNewQuery');
  const btnStatus = document.getElementById('tabCheckStatus');
  const secNew = document.getElementById('sectionNewQuery');
  const secStatus = document.getElementById('sectionCheckStatus');

  if (tab === 'new') {
    if (btnNew) { btnNew.classList.add('btn-primary'); btnNew.classList.remove('btn-secondary'); }
    if (btnStatus) { btnStatus.classList.add('btn-secondary'); btnStatus.classList.remove('btn-primary'); }
    if (secNew) secNew.style.display = 'block';
    if (secStatus) secStatus.style.display = 'none';
  } else {
    if (btnStatus) { btnStatus.classList.add('btn-primary'); btnStatus.classList.remove('btn-secondary'); }
    if (btnNew) { btnNew.classList.add('btn-secondary'); btnNew.classList.remove('btn-primary'); }
    if (secStatus) secStatus.style.display = 'block';
    if (secNew) secNew.style.display = 'none';

    // Clear previous results on open
    const resultsArea = document.getElementById('lookupResultsArea');
    if (resultsArea) resultsArea.innerHTML = '';
  }
}

function lookupQueries() {
  const email = document.getElementById('lookupEmail')?.value?.trim().toLowerCase();
  const resultsArea = document.getElementById('lookupResultsArea');

  if (!email) {
    showToast('Please enter an email address to lookup.', 'error');
    return;
  }
  if (!resultsArea) return;

  loadQueries();
  const userQueries = queries.filter(q => q.email.toLowerCase() === email);

  if (userQueries.length === 0) {
    resultsArea.innerHTML = `
      <div class="empty-state glass-strong" style="padding: 30px; text-align: center;">
        <div class="empty-state-icon" style="font-size: 2rem; margin-bottom: 10px;">🔍</div>
        <h4 style="color: var(--primary);">No Queries Found</h4>
        <p style="color: var(--grey-300);">We couldn't find any queries associated with <b>${escapeHtml(email)}</b>.</p>
      </div>`;
    return;
  }

  resultsArea.innerHTML = `<h4 style="margin-bottom: 20px; color: var(--text);">Your Queries</h4>` +
    userQueries.map(q => {
      const isApproved = q.status === 'approved';
      const statusBadge = isApproved
        ? `<span class="badge badge-success" style="float: right;">Approved</span>`
        : `<span class="badge badge-warning" style="float: right;">Pending Review</span>`;

      let responseSection = '';
      if (isApproved) {
        responseSection = `
          <div style="margin-top: 15px; padding: 15px; background: rgba(30, 215, 96, 0.1); border-left: 3px solid var(--success); border-radius: 4px;">
            <p style="font-size: 0.85rem; color: var(--grey-400); margin-bottom: 8px;"><strong>Staff Response:</strong></p>
            <p style="white-space: pre-wrap; font-size: 0.95rem; line-height: 1.5;">${escapeHtml(q.aiResponse)}</p>
            <p style="font-size: 0.8rem; color: var(--grey-400); margin-top: 10px; text-align: right;">— Approved by ${escapeHtml(q.approvedBy || 'Staff')}</p>
          </div>
        `;
      } else {
        responseSection = `
          <div style="margin-top: 15px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; text-align: center;">
            <p style="color: var(--grey-300); font-style: italic;"><i class="fas fa-clock"></i> Your query is currently being reviewed by our clinical staff.</p>
          </div>
        `;
      }

      return `
        <div class="glass-strong" style="margin-bottom: 20px; padding: 20px; border-radius: 12px;">
          <div style="margin-bottom: 10px;">
            ${statusBadge}
            <div style="font-size: 0.85rem; color: var(--grey-400);"><i class="far fa-clock"></i> Submitted: ${formatTimestamp(q.timestamp)}</div>
          </div>
          <div style="margin-top: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <p style="font-weight: 600; margin-bottom: 5px;">Query:</p>
            <p style="font-size: 0.9rem; color: var(--grey-200);">${escapeHtml(q.message)}</p>
          </div>
          ${responseSection}
        </div>
      `;
    }).join('');
}

function retrySubmission() {
  const errorPanel = document.getElementById('errorPanel');
  const formCard = document.getElementById('queryFormCard');
  errorPanel.style.display = 'none';
  formCard.style.display = 'block';
}

// ─────────── Staff Panel Functions ───────────

/** Load all queries into staff views */
function loadAllQueries() {
  loadQueries();
  renderDashboardQueries();
  renderIncomingQueries();
  renderHistory();
  updateStats();
  updateQueryCountBadge();
}

function updateStats() {
  loadQueries();
  const total = queries.length;
  const pending = queries.filter(q => q.status === 'pending').length;
  const approved = queries.filter(q => q.status === 'approved').length;
  const high = queries.filter(q => q.urgency === 'High' && q.status !== 'approved').length;

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('statTotal', total);
  el('statPending', pending);
  el('statApproved', approved);
  el('statHigh', high);
}

function updateQueryCountBadge() {
  const badge = document.getElementById('queryCountBadge');
  if (badge) {
    const pending = queries.filter(q => q.status === 'pending').length;
    badge.textContent = pending;
  }
}

/** Render query cards */
function renderQueryCard(q) {
  return `
    <div class="query-card" onclick="viewQueryDetail('${q.id}')">
      <div class="query-card-header">
        <div class="query-card-patient">
          <div class="query-card-avatar">${getInitials(q.name)}</div>
          <div>
            <div class="query-card-name">${escapeHtml(q.name)}</div>
            <div class="query-card-dept">${escapeHtml(q.department)}</div>
          </div>
        </div>
        <span class="badge badge-dot ${getUrgencyClass(q.urgency)}">${q.urgency}</span>
      </div>
      <div class="query-card-preview">${escapeHtml(q.message)}</div>
      <div class="query-card-footer">
        <span class="query-card-time"><i class="far fa-clock"></i> ${formatTimestamp(q.timestamp)}</span>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); viewQueryDetail('${q.id}')">
          <i class="fas fa-eye"></i> View Details
        </button>
      </div>
    </div>
  `;
}

function renderDashboardQueries() {
  const container = document.getElementById('dashboardQueries');
  if (!container) return;
  const recent = queries.slice(0, 5);
  if (recent.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>No Queries Yet</h3>
        <p>Patient queries will appear here when submitted.</p>
      </div>`;
    return;
  }
  container.innerHTML = recent.map(renderQueryCard).join('');
}

function renderIncomingQueries() {
  const container = document.getElementById('incomingQueries');
  const countEl = document.getElementById('incomingCount');
  if (!container) return;

  let filtered = currentUrgencyFilter === 'all'
    ? queries
    : queries.filter(q => q.urgency === currentUrgencyFilter);

  // Apply search filter
  const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase() || '';
  if (searchTerm) {
    filtered = filtered.filter(q =>
      q.name.toLowerCase().includes(searchTerm) ||
      q.department.toLowerCase().includes(searchTerm) ||
      q.message.toLowerCase().includes(searchTerm)
    );
  }

  if (countEl) countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>No Queries Found</h3>
        <p>Try adjusting your filters or search terms.</p>
      </div>`;
    return;
  }
  container.innerHTML = filtered.map(renderQueryCard).join('');
}

function renderHistory() {
  const tbody = document.getElementById('historyBody');
  const emptyState = document.getElementById('historyEmpty');
  if (!tbody) return;

  const processed = queries.filter(q => q.status !== 'pending');

  if (processed.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    document.getElementById('historyTable').style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  document.getElementById('historyTable').style.display = '';

  tbody.innerHTML = processed.map(q => `
    <tr>
      <td><strong>${escapeHtml(q.name)}</strong></td>
      <td>${escapeHtml(q.department)}</td>
      <td><span class="badge badge-dot ${getUrgencyClass(q.urgency)}">${q.urgency}</span></td>
      <td><span class="status-${q.status}">${capitalize(q.status)}</span></td>
      <td>${formatTimestamp(q.timestamp)}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="viewQueryDetail('${q.id}'); switchSection('incoming', document.querySelector('[data-section=incoming]'));">View</button></td>
    </tr>
  `).join('');
}

// ─────────── Query Detail ───────────

function viewQueryDetail(id) {
  loadQueries();
  const query = queries.find(q => q.id === id);
  if (!query) {
    showToast('Query not found.', 'error');
    return;
  }

  currentQueryId = id;

  // Populate detail fields
  const set = (elId, val) => { const e = document.getElementById(elId); if (e) e.textContent = val; };
  set('detailName', query.name);
  set('detailEmail', query.email);
  set('detailPhone', query.phone);
  set('detailDept', query.department);
  set('detailCategory', query.category);
  set('detailMessage', query.message);
  set('detailTimestamp', formatTimestamp(query.timestamp));

  const urgencyEl = document.getElementById('detailUrgency');
  if (urgencyEl) {
    urgencyEl.innerHTML = `<span class="badge badge-dot ${getUrgencyClass(query.urgency)}">${query.urgency}</span>`;
  }

  // If no AI response yet, generate one
  if (!query.aiResponse) {
    query.aiResponse = generateAIDraft(query);
    saveQueries();
  }

  const textarea = document.getElementById('aiResponseTextarea');
  if (textarea) textarea.value = query.aiResponse;

  // Switch to detail view
  switchSection('incoming', document.querySelector('[data-section="incoming"]'));
  const listView = document.getElementById('incomingListView');
  const detailView = document.getElementById('incomingDetailView');
  if (listView) listView.style.display = 'none';
  if (detailView) detailView.style.display = 'block';
}

function closeQueryDetail() {
  currentQueryId = null;
  const listView = document.getElementById('incomingListView');
  const detailView = document.getElementById('incomingDetailView');
  if (listView) listView.style.display = 'block';
  if (detailView) detailView.style.display = 'none';
}

/** Regenerate AI suggestion for current query */
function regenerateSuggestion() {
  if (!currentQueryId) return;
  loadQueries();
  const query = queries.find(q => q.id === currentQueryId);
  if (!query) return;

  const textarea = document.getElementById('aiResponseTextarea');
  if (textarea) {
    textarea.value = 'Regenerating...';
    textarea.disabled = true;
  }

  if (API_BASE) {
    fetch(`${API_BASE}/suggest-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.message })
    })
      .then(res => res.json())
      .then(data => {
        query.aiResponse = data.suggested_reply || generateAIDraft(query);
        saveQueries();
        if (textarea) { textarea.value = query.aiResponse; textarea.disabled = false; }
        showToast('Response regenerated!', 'success');
      })
      .catch(() => {
        query.aiResponse = generateAIDraft(query);
        saveQueries();
        if (textarea) { textarea.value = query.aiResponse; textarea.disabled = false; }
        showToast('Response regenerated (local).', 'info');
      });
  } else {
    setTimeout(() => {
      query.aiResponse = generateAIDraft(query);
      saveQueries();
      if (textarea) { textarea.value = query.aiResponse; textarea.disabled = false; }
      showToast('Response regenerated!', 'success');
    }, 1000);
  }
}

/** Approve and send the current response */
function approveCurrentResponse() {
  if (!currentQueryId) return;
  loadQueries();
  const query = queries.find(q => q.id === currentQueryId);
  if (!query) return;

  const textarea = document.getElementById('aiResponseTextarea');
  query.aiResponse = textarea?.value || query.aiResponse;
  query.status = 'approved';
  query.approvedBy = 'Dr. Rebecca Hart';
  query.approvedAt = new Date().toISOString();
  query.staffEdited = (textarea?.value !== generateAIDraft(query));
  saveQueries();

  if (API_BASE) {
    fetch(`${API_BASE}/api/approve-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queryId: currentQueryId,
        response: query.aiResponse,
        approvedBy: query.approvedBy
      })
    }).catch(err => console.warn('Backend approve failed:', err));
  }

  showToast('Response approved and sent!', 'success');
  closeQueryDetail();
  loadAllQueries();
}

/** Mark as reviewed */
function markAsReviewed() {
  if (!currentQueryId) return;
  loadQueries();
  const query = queries.find(q => q.id === currentQueryId);
  if (!query) return;

  const textarea = document.getElementById('aiResponseTextarea');
  query.aiResponse = textarea?.value || query.aiResponse;
  query.status = 'reviewed';
  saveQueries();

  showToast('Query marked as reviewed.', 'info');
  closeQueryDetail();
  loadAllQueries();
}

// ─────────── Generate Response (Manual) ───────────

function generateManualResponse() {
  const queryText = document.getElementById('manualQuery')?.value?.trim();
  if (!queryText) {
    showToast('Please enter a patient query.', 'error');
    return;
  }

  const dept = document.getElementById('manualDept')?.value || 'General Medicine';
  const cat = document.getElementById('manualCategory')?.value || 'Symptoms & Diagnosis';

  const responseArea = document.getElementById('manualResponseArea');
  const responseText = document.getElementById('manualResponseText');

  const queryData = {
    name: 'Patient',
    department: dept,
    category: cat,
    message: queryText,
    urgency: 'Medium'
  };

  if (responseText) responseText.value = 'Generating...';
  if (responseArea) responseArea.style.display = 'block';

  setTimeout(() => {
    const draft = generateAIDraft(queryData);
    if (responseText) responseText.value = draft;
    showToast('Response generated!', 'success');
  }, 1200);
}

function copyResponse() {
  const text = document.getElementById('manualResponseText')?.value;
  if (text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Response copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Copy failed. Please select and copy manually.', 'error');
    });
  }
}

// ─────────── Settings ───────────

function saveSettings() {
  const tone = document.querySelector('input[name="tone"]:checked')?.value || 'professional';
  const strictness = document.querySelector('input[name="strictness"]:checked')?.value || 'balanced';
  saveSettingsToStorage({ tone, strictness });
  showToast('Settings saved successfully!', 'success');
}

function loadSettingsUI() {
  const settings = getSettings();
  const toneRadio = document.querySelector(`input[name="tone"][value="${settings.tone}"]`);
  const strictRadio = document.querySelector(`input[name="strictness"][value="${settings.strictness}"]`);
  if (toneRadio) toneRadio.checked = true;
  if (strictRadio) strictRadio.checked = true;
}

// ─────────── Navigation ───────────

function switchSection(section, clickedEl) {
  // Hide all sections
  document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));

  // Show target
  const target = document.getElementById(`sec-${section}`);
  if (target) target.classList.add('active');

  // Update sidebar active
  document.querySelectorAll('.sidebar-nav-item').forEach(item => item.classList.remove('active'));
  if (clickedEl) clickedEl.classList.add('active');

  // Update header title
  const titles = {
    dashboard: 'Dashboard',
    incoming: 'Incoming Queries',
    generate: 'Generate Response',
    history: 'Response History',
    settings: 'Settings'
  };
  const titleEl = document.getElementById('sectionTitle');
  if (titleEl) titleEl.textContent = titles[section] || 'Dashboard';

  // Reset detail view when switching away
  if (section !== 'incoming') {
    closeQueryDetail();
  }

  // Close mobile sidebar
  closeSidebar();

  // Load settings UI if switching to settings
  if (section === 'settings') loadSettingsUI();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar?.classList.toggle('open');
  overlay?.classList.toggle('open');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar?.classList.remove('open');
  overlay?.classList.remove('open');
}

// ─────────── Filtering ───────────

function filterByUrgency(urgency) {
  currentUrgencyFilter = urgency;
  renderIncomingQueries();
}

function filterQueries() {
  renderIncomingQueries();
  renderDashboardQueries();
}

// ─────────── Toast Notifications ───────────

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span>${escapeHtml(message)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ─────────── Utilities ───────────

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─────────── Initialize ───────────
loadQueries();
