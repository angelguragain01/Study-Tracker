const STORAGE_KEY = 'study_tracker_v6';
const QUOTES = [
    "Small progress is still progress.",
    "You don't have to be perfect, just consistent.",
    "Every expert was once a beginner."
];

let state = loadState();

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return { subjects: [], activeView: 'home', activeSubjectId: null, showAddSubject: false };
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
}

function addSubject(name) {
    if (!name || name.trim() === '') return;
    const subject = { id: Date.now().toString(), name: name.trim(), teachers: [] };
    state.subjects.push(subject);
    state.showAddSubject = false;
    state.activeView = 'subject';
    state.activeSubjectId = subject.id;
    saveState();
}

function addTeacher(subjectId, name) {
    if (!name || name.trim() === '') return;
    const subject = state.subjects.find(s => s.id === subjectId);
    if (!subject) return;
    subject.teachers.push({ id: Date.now().toString(), name: name.trim(), tasks: [] });
    saveState();
}

function addTask(subjectId, teacherId, title) {
    if (!title || title.trim() === '') return;
    const subject = state.subjects.find(s => s.id === subjectId);
    if (!subject) return;
    const teacher = subject.teachers.find(t => t.id === teacherId);
    if (!teacher) return;
    teacher.tasks.push({
        id: Date.now().toString(),
        title: title.trim(),
        done: false,
        completedAt: null
    });
    saveState();
}

function toggleTask(taskId) {
    for (const subject of state.subjects) {
        for (const teacher of subject.teachers) {
            const task = teacher.tasks.find(t => t.id === taskId);
            if (task) {
                task.done = !task.done;
                task.completedAt = task.done ? new Date().toISOString() : null;
                saveState();
                return;
            }
        }
    }
}

function deleteTask(taskId) {
    for (const subject of state.subjects) {
        for (const teacher of subject.teachers) {
            const taskIndex = teacher.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                teacher.tasks.splice(taskIndex, 1);
                saveState();
                return;
            }
        }
    }
}

function switchView(view, subjectId = null) {
    state.activeView = view;
    state.activeSubjectId = subjectId;
    state.showAddSubject = false;
    saveState();
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function calculateStats() {
    const now = new Date();
    const thisWeekStart = getWeekStart(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    let thisWeekCount = 0;
    let lastWeekCount = 0;
    let pendingCount = 0;
    const weeklyData = new Array(4).fill(0);

    for (const subject of state.subjects) {
        for (const teacher of subject.teachers) {
            for (const task of teacher.tasks) {
                if (!task.done) {
                    pendingCount++;
                    continue;
                }

                const completedDate = new Date(task.completedAt);
                
                if (completedDate >= thisWeekStart) thisWeekCount++;
                else if (completedDate >= lastWeekStart) lastWeekCount++;

                for (let i = 0; i < 4; i++) {
                    const weekStart = new Date(thisWeekStart);
                    weekStart.setDate(weekStart.getDate() - (i * 7));
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 7);

                    if (completedDate >= weekStart && completedDate < weekEnd) {
                        weeklyData[3 - i]++;
                    }
                }
            }
        }
    }

    let trendText = '—';
    if (lastWeekCount > 0) {
        const diff = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
        trendText = (diff >= 0 ? '+' : '') + diff.toFixed(0) + '%';
    } else if (thisWeekCount > 0) {
        trendText = '+100%';
    }

    return { thisWeekCount, trendText, pendingCount, weeklyData };
}

let chartInstance = null;

function renderChart(weeklyData) {
    const ctx = document.getElementById('progressChart')?.getContext('2d');
    if (!ctx) return;
    
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['3 weeks ago', '2 weeks ago', 'Last week', 'This week'],
            datasets: [{
                data: weeklyData,
                backgroundColor: '#1C1917',
                borderRadius: 4,
                barThickness: 32,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1C1917',
                    titleFont: { family: '-apple-system, sans-serif' },
                    bodyFont: { family: '-apple-system, sans-serif' },
                    padding: 10,
                    cornerRadius: 4,
                    displayColors: false
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { 
                        color: '#78716C', 
                        font: { size: 11 },
                        stepSize: 1 
                    }, 
                    grid: { color: '#F5F5F4', drawBorder: false } 
                },
                x: { 
                    ticks: { color: '#78716C', font: { size: 11 } }, 
                    grid: { display: false } 
                }
            }
        }
    });
}

function render() {
    renderStickyNotes();
    renderNavTabs();
    
    const homeView = document.getElementById('view-home');
    const subjectView = document.getElementById('view-subject');
    
    homeView.classList.toggle('active', state.activeView === 'home');
    subjectView.classList.toggle('active', state.activeView === 'subject');
    
    if (state.activeView === 'home') {
        renderHomeView();
    } else if (state.activeView === 'subject') {
        renderSubjectView();
    }
}

function renderStickyNotes() {
    const container = document.getElementById('sticky-notes');
    container.innerHTML = '';
    
    QUOTES.forEach((quote, index) => {
        const note = document.createElement('div');
        note.className = 'sticky-note';
        note.innerHTML = `
            
            <div class="sticky-note-text">"${quote}"</div>
        `;
        container.appendChild(note);
    });
}

function renderNavTabs() {
    const navContainer = document.getElementById('nav-tabs');
    navContainer.innerHTML = '';
    
    if (state.showAddSubject) {
        const formHtml = `
            <div class="add-subject-inline">
                <input type="text" id="inline-subject-input" placeholder="Enter subject name..." class="input-field">
                <button id="inline-subject-save" class="btn-primary">Create</button>
                <button id="inline-subject-cancel" class="btn-cancel">Cancel</button>
            </div>
        `;
        navContainer.innerHTML = formHtml;
        
        setTimeout(() => {
            const input = document.getElementById('inline-subject-input');
            const saveBtn = document.getElementById('inline-subject-save');
            const cancelBtn = document.getElementById('inline-subject-cancel');
            
            if (input) input.focus();
            
            if (saveBtn) {
                saveBtn.onclick = () => {
                    addSubject(input.value);
                };
            }
            
            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    state.showAddSubject = false;
                    saveState();
                };
            }
            
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') saveBtn.click();
                });
            }
        }, 0);
        
        return;
    }
    
    const tabsWrapper = document.createElement('div');
    tabsWrapper.className = 'tabs-wrapper';
    
    const homeTab = document.createElement('button');
    homeTab.className = `nav-tab ${state.activeView === 'home' ? 'active' : ''}`;
    homeTab.textContent = 'Home';
    homeTab.onclick = () => switchView('home');
    tabsWrapper.appendChild(homeTab);
    
    const maxSubjects = 6;
    const subjectsToShow = state.subjects.slice(0, maxSubjects);
    
    subjectsToShow.forEach(subject => {
        const tab = document.createElement('button');
        tab.className = `nav-tab ${state.activeView === 'subject' && state.activeSubjectId === subject.id ? 'active' : ''}`;
        const displayName = subject.name.length > 12 ? subject.name.substring(0, 12) + '...' : subject.name;
        tab.textContent = displayName;
        tab.onclick = () => switchView('subject', subject.id);
        tabsWrapper.appendChild(tab);
    });
    
    const currentTabCount = 1 + subjectsToShow.length;
    const emptySlots = 7 - currentTabCount;
    
    for (let i = 0; i < emptySlots; i++) {
        const emptyTab = document.createElement('button');
        emptyTab.className = 'nav-tab empty-slot';
        emptyTab.textContent = '—';
        tabsWrapper.appendChild(emptyTab);
    }
    
    const addSubjectTab = document.createElement('button');
    addSubjectTab.className = 'nav-tab add-subject';
    addSubjectTab.textContent = '+ Add Subject';
    addSubjectTab.onclick = () => {
        state.showAddSubject = true;
        saveState();
    };
    tabsWrapper.appendChild(addSubjectTab);
    
    navContainer.appendChild(tabsWrapper);
}

function renderHomeView() {
    const homeView = document.getElementById('view-home');
    const stats = calculateStats();
    
    let html = `
        <section class="dashboard">
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-label">Completed this week</span>
                    <span class="stat-value">${stats.thisWeekCount}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Compared to last week</span>
                    <span class="stat-value">${stats.trendText}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Pending tasks</span>
                    <span class="stat-value">${stats.pendingCount}</span>
                </div>
            </div>
            <div class="chart-container">
                <canvas id="progressChart"></canvas>
            </div>
        </section>
    `;
    
    homeView.innerHTML = html;
    
    renderChart(stats.weeklyData);
}

function renderSubjectView() {
    const subjectView = document.getElementById('view-subject');
    
    if (!state.activeSubjectId) {
        subjectView.innerHTML = '<div class="empty-state">Select a subject from the tabs above.</div>';
        return;
    }
    
    const subject = state.subjects.find(s => s.id === state.activeSubjectId);
    if (!subject) {
        subjectView.innerHTML = '<div class="empty-state">Subject not found.</div>';
        return;
    }
    
    let html = `
        <div class="subject-header">
            <h2 class="subject-title">${escapeHtml(subject.name)}</h2>
        </div>
        
        <div class="add-teacher-section">
            <div class="add-teacher-form">
                <input type="text" id="input-teacher" placeholder="Add new teacher" class="input-field">
                <button id="btn-add-teacher" class="btn-secondary">Add Teacher</button>
            </div>
        </div>
    `;
    
    if (subject.teachers.length === 0) {
        html += '<div class="empty-state">No teachers yet. Add a teacher above to get started.</div>';
    } else {
        subject.teachers.forEach(teacher => {
            html += `
                <div class="teacher-block">
                    <div class="teacher-header">
                        <div class="teacher-name">${escapeHtml(teacher.name)}</div>
                    </div>
                    <div class="add-task-form">
                        <input type="text" data-teacher-id="${teacher.id}" placeholder="Add new task" class="input-field task-input">
                        <button data-teacher-id="${teacher.id}" class="btn-primary add-task-btn">Add Task</button>
                    </div>
            `;
            
            if (teacher.tasks.length === 0) {
                html += '<div class="empty-task">No tasks yet.</div>';
            } else {
                teacher.tasks.forEach(task => {
                    const doneClass = task.done ? 'done' : '';
                    html += `
                        <div class="task-item ${doneClass}" data-id="${task.id}">
                            <div class="task-checkbox" data-id="${task.id}">
                                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <span class="task-text" data-id="${task.id}">${escapeHtml(task.title)}</span>
                            <button class="task-delete" data-id="${task.id}" title="Delete task">−</button>
                        </div>
                    `;
                });
            }
            
            html += '</div>';
        });
    }
    
    subjectView.innerHTML = html;
    
    document.getElementById('btn-add-teacher').onclick = () => {
        const input = document.getElementById('input-teacher');
        const name = input.value.trim();
        if (name) {
            addTeacher(subject.id, name);
            input.value = '';
        }
    };
    
    document.getElementById('input-teacher').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('btn-add-teacher').click();
    });
    
    document.querySelectorAll('.add-task-btn').forEach(btn => {
        btn.onclick = () => {
            const teacherId = btn.dataset.teacherId;
            const input = document.querySelector(`.task-input[data-teacher-id="${teacherId}"]`);
            const title = input.value.trim();
            if (title) {
                addTask(subject.id, teacherId, title);
                input.value = '';
            }
        };
    });
    
    document.querySelectorAll('.task-input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const teacherId = input.dataset.teacherId;
                const btn = document.querySelector(`.add-task-btn[data-teacher-id="${teacherId}"]`);
                btn.click();
            }
        });
    });
    
    document.querySelectorAll('.task-checkbox, .task-text').forEach(el => {
        el.onclick = () => toggleTask(el.dataset.id);
    });
    
    document.querySelectorAll('.task-delete').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            deleteTask(btn.dataset.id);
        };
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

render();