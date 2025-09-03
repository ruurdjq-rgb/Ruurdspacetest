/* Dagscore To-do: elke voltooide taak telt als 1 punt. Data per datum in localStorage. */
(function() {
  const STORAGE_KEY = 'dayScoreTodo.v1';

  /** @typedef {{ id: string, title: string, completed: boolean, createdAt: number }} Task */

  const datePicker = document.getElementById('datePicker');
  const addTaskForm = document.getElementById('addTaskForm');
  const taskTitleInput = document.getElementById('taskTitle');
  const taskListEl = document.getElementById('taskList');
  const scoreValueEl = document.getElementById('scoreValue');
  const completedCountEl = document.getElementById('completedCount');
  const totalCountEl = document.getElementById('totalCount');

  function getTodayDateString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function loadAllData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return {};
      return parsed;
    } catch (e) {
      console.error('Kon data niet laden, reset naar leeg.', e);
      return {};
    }
  }

  function saveAllData(all) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('Opslaan mislukt.', e);
    }
  }

  /** @returns {Task[]} */
  function getTasksForDate(dateStr) {
    const all = loadAllData();
    return Array.isArray(all[dateStr]) ? all[dateStr] : [];
  }

  /** @param {string} dateStr @param {Task[]} tasks */
  function setTasksForDate(dateStr, tasks) {
    const all = loadAllData();
    all[dateStr] = tasks;
    saveAllData(all);
  }

  function makeId() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function render() {
    const dateStr = datePicker.value || getTodayDateString();
    const tasks = getTasksForDate(dateStr);
    renderTaskList(tasks);
    updateScore(tasks);
  }

  function renderTaskList(tasks) {
    taskListEl.innerHTML = '';
    if (!tasks.length) {
      const empty = document.createElement('li');
      empty.className = 'task-item';
      empty.textContent = 'Nog geen taken voor deze dag.';
      taskListEl.appendChild(empty);
      return;
    }

    for (const task of tasks) {
      const li = document.createElement('li');
      li.className = 'task-item';
      li.dataset.taskId = task.id;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!task.completed;
      checkbox.setAttribute('aria-label', 'Markeer als voltooid');
      checkbox.addEventListener('change', () => toggleTask(task.id, checkbox.checked));

      const title = document.createElement('div');
      title.className = 'task-title' + (task.completed ? ' completed' : '');
      title.textContent = task.title;

      const actions = document.createElement('div');
      actions.className = 'task-actions';

      const del = document.createElement('button');
      del.className = 'task-delete';
      del.textContent = 'Verwijder';
      del.addEventListener('click', () => deleteTask(task.id));

      actions.appendChild(del);

      li.appendChild(checkbox);
      li.appendChild(title);
      li.appendChild(actions);
      taskListEl.appendChild(li);
    }
  }

  function updateScore(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const score = completed; // 1 punt per voltooide taak
    scoreValueEl.textContent = String(score);
    completedCountEl.textContent = String(completed);
    totalCountEl.textContent = String(total);
  }

  function addTask(title) {
    const dateStr = datePicker.value || getTodayDateString();
    const tasks = getTasksForDate(dateStr);
    const newTask = { id: makeId(), title: title.trim(), completed: false, createdAt: Date.now() };
    tasks.push(newTask);
    setTasksForDate(dateStr, tasks);
    render();
  }

  function toggleTask(taskId, isCompleted) {
    const dateStr = datePicker.value || getTodayDateString();
    const tasks = getTasksForDate(dateStr).map(t => t.id === taskId ? { ...t, completed: !!isCompleted } : t);
    setTasksForDate(dateStr, tasks);
    render();
  }

  function deleteTask(taskId) {
    const dateStr = datePicker.value || getTodayDateString();
    const tasks = getTasksForDate(dateStr).filter(t => t.id !== taskId);
    setTasksForDate(dateStr, tasks);
    render();
  }

  function init() {
    datePicker.value = getTodayDateString();
    datePicker.addEventListener('change', render);
    addTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = taskTitleInput.value.trim();
      if (!title) return;
      addTask(title);
      taskTitleInput.value = '';
      taskTitleInput.focus();
    });
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

