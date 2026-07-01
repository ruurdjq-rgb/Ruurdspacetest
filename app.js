/* ============================================================
   Sales Follow-up Cockpit — MVP
   Persoonlijke sales-executie cockpit. Geen CRM.
   Opslag: localStorage (later evt. te vervangen door Supabase).
   ============================================================ */

'use strict';

const STORAGE_KEY = 'sales-cockpit-tasks-v1';

/* Labels voor weergave */
const ACTION_LABELS = {
  bellen: 'Bellen',
  reminder: 'Reminder mail',
  wachten: 'Wachten op klant',
  offerte: 'Offerte opvolgen',
  handmatig: 'Handmatige actie',
};

const STATUS_LABELS = {
  open: 'Open',
  wachten: 'Wachten',
  gedaan: 'Gedaan',
  gewonnen: 'Gewonnen',
  verloren: 'Verloren',
};

const PRIORITY_LABELS = {
  laag: 'Laag',
  normaal: 'Normaal',
  hoog: 'Hoog',
};

/* Statussen die een taak als "afgehandeld" beschouwen */
const CLOSED_STATUSES = ['gedaan', 'gewonnen', 'verloren'];

/* ---------- Data laag ---------- */

const store = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Kon taken niet laden:', e);
      return [];
    }
  },
  save(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  },
};

let tasks = store.load();

/* ---------- Datum helpers ---------- */

/** Lokale datum als YYYY-MM-DD (zonder tijdzone-gedoe). */
function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function addDaysISO(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** Verschil in hele dagen tussen twee ISO-datums (b - a). */
function daysBetween(aISO, bISO) {
  const a = new Date(aISO + 'T00:00:00');
  const b = new Date(bISO + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

function formatDue(iso) {
  const diff = daysBetween(todayISO(), iso);
  const d = new Date(iso + 'T00:00:00');
  const nice = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  if (diff === 0) return `Vandaag (${nice})`;
  if (diff === 1) return `Morgen (${nice})`;
  if (diff === -1) return `Gisteren (${nice})`;
  if (diff < 0) return `${nice} — ${Math.abs(diff)} dagen te laat`;
  return `${nice} (over ${diff} dagen)`;
}

function uid() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

/* ---------- Classificatie in secties ---------- */

function isOpen(task) {
  return !CLOSED_STATUSES.includes(task.status);
}

/**
 * Bepaalt in welke sectie een taak valt.
 * Open taken -> op basis van due date.
 * Afgehandeld vandaag -> "afgerond".
 */
function classify(task) {
  const today = todayISO();
  if (CLOSED_STATUSES.includes(task.status)) {
    return task.closedDate === today ? 'afgerond' : 'archief';
  }
  const diff = daysBetween(today, task.due);
  if (diff < 0) return 'telaat';
  if (diff === 0) return 'vandaag';
  if (diff === 1) return 'morgen';
  if (diff <= 7) return 'week';
  return 'later';
}

const SECTIONS = [
  { key: 'telaat', title: 'Te laat', modifier: 'overdue', empty: 'Niets te laat. Netjes!' },
  { key: 'vandaag', title: 'Vandaag', modifier: 'today', empty: 'Niks te doen vandaag.' },
  { key: 'morgen', title: 'Morgen', modifier: 'morgen', empty: 'Morgen nog niets gepland.' },
  { key: 'week', title: 'Komende 7 dagen', modifier: 'week', empty: 'Komende week nog leeg.' },
  { key: 'afgerond', title: 'Afgerond vandaag', modifier: 'afgerond', empty: 'Nog niets afgerond vandaag.' },
];

/* ---------- Rendering ---------- */

const board = document.getElementById('board');

function priorityRank(p) {
  return { hoog: 0, normaal: 1, laag: 2 }[p] ?? 1;
}

function sortTasks(list) {
  return list.slice().sort((a, b) => {
    if (a.due !== b.due) return a.due < b.due ? -1 : 1;
    return priorityRank(a.priority) - priorityRank(b.priority);
  });
}

function render() {
  const buckets = {};
  SECTIONS.forEach((s) => (buckets[s.key] = []));
  tasks.forEach((t) => {
    const key = classify(t);
    if (buckets[key]) buckets[key].push(t);
  });

  board.innerHTML = '';
  SECTIONS.forEach((section) => {
    const list = sortTasks(buckets[section.key]);
    board.appendChild(renderSection(section, list));
  });

  renderStats(buckets);
}

function renderStats(buckets) {
  document.getElementById('stat-today').textContent = buckets.vandaag.length;
  document.getElementById('stat-overdue').textContent = buckets.telaat.length;
  document.getElementById('stat-done').textContent = buckets.afgerond.length;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function renderSection(section, list) {
  const wrap = el('section', `section section--${section.modifier}`);

  const header = el('div', 'section__header');
  header.appendChild(el('h2', 'section__title', section.title));
  header.appendChild(el('span', 'section__count', `${list.length}`));
  wrap.appendChild(header);

  if (list.length === 0) {
    wrap.appendChild(el('p', 'section__empty', section.empty));
    return wrap;
  }

  const cards = el('div', 'cards');
  list.forEach((task) => cards.appendChild(renderCard(task)));
  wrap.appendChild(cards);
  return wrap;
}

function renderCard(task) {
  const done = CLOSED_STATUSES.includes(task.status);
  const card = el('div', `card card--prio-${task.priority}${done ? ' card--done' : ''}`);

  const main = el('div', 'card__main');

  const top = el('div', 'card__top');
  top.appendChild(el('span', 'card__company', task.company));
  if (task.value) {
    top.appendChild(el('span', 'card__value', '€ ' + Number(task.value).toLocaleString('nl-NL')));
  }
  main.appendChild(top);

  const meta = el('div', 'card__meta');
  meta.appendChild(el('span', 'badge badge--action', ACTION_LABELS[task.action] || task.action));

  const overdue = isOpen(task) && daysBetween(todayISO(), task.due) < 0;
  meta.appendChild(el('span', `badge badge--due${overdue ? ' badge--overdue' : ''}`, formatDue(task.due)));

  meta.appendChild(el('span', `badge badge--status-${task.status}`, STATUS_LABELS[task.status]));

  if (task.priority === 'hoog') {
    meta.appendChild(el('span', 'badge badge--prio-hoog', 'Hoog'));
  }
  main.appendChild(meta);

  if (task.note) {
    main.appendChild(el('div', 'card__note', task.note));
  }

  card.appendChild(main);

  /* Acties */
  const actions = el('div', 'card__actions');
  if (!done) {
    const doneBtn = el('button', 'btn btn--done', 'Gedaan');
    doneBtn.addEventListener('click', () => markDone(task.id));
    actions.appendChild(doneBtn);

    const resBtn = el('button', 'btn', 'Nieuwe datum');
    resBtn.addEventListener('click', () => openReschedule(task.id));
    actions.appendChild(resBtn);
  }

  const editBtn = el('button', 'btn btn--ghost', 'Bewerken');
  editBtn.addEventListener('click', () => openEdit(task.id));
  actions.appendChild(editBtn);

  card.appendChild(actions);
  return card;
}

/* ---------- Acties op taken ---------- */

function markDone(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.status = 'gedaan';
  task.closedDate = todayISO();
  persist();
}

function persist() {
  store.save(tasks);
  render();
}

/* ---------- Modal: toevoegen / bewerken ---------- */

const overlay = document.getElementById('modal-overlay');
const form = document.getElementById('task-form');
const modalTitle = document.getElementById('modal-title');

const F = {
  id: document.getElementById('field-id'),
  company: document.getElementById('field-company'),
  action: document.getElementById('field-action'),
  due: document.getElementById('field-due'),
  status: document.getElementById('field-status'),
  priority: document.getElementById('field-priority'),
  value: document.getElementById('field-value'),
  note: document.getElementById('field-note'),
};

const autofollowWrap = document.getElementById('autofollow');
const offerteSent = document.getElementById('field-offerte-sent');
const autofollowOptions = document.getElementById('autofollow-options');
const afReminder = document.getElementById('af-reminder');
const afReminderDate = document.getElementById('af-reminder-date');
const afCall = document.getElementById('af-call');
const afCallDate = document.getElementById('af-call-date');

function openModal() {
  overlay.hidden = false;
  F.company.focus();
}

function closeModal() {
  overlay.hidden = true;
  form.reset();
  F.id.value = '';
  autofollowOptions.hidden = true;
}

function openNew() {
  form.reset();
  F.id.value = '';
  modalTitle.textContent = 'Nieuwe follow-up';
  F.due.value = todayISO();
  F.priority.value = 'normaal';
  autofollowWrap.hidden = false;
  autofollowOptions.hidden = true;
  offerteSent.checked = false;
  syncAutofollowDates();
  openModal();
}

function openEdit(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  form.reset();
  modalTitle.textContent = 'Follow-up bewerken';
  F.id.value = task.id;
  F.company.value = task.company;
  F.action.value = task.action;
  F.due.value = task.due;
  F.status.value = task.status;
  F.priority.value = task.priority;
  F.value.value = task.value || '';
  F.note.value = task.note || '';
  /* Autofollow alleen bij nieuw aanmaken relevant */
  autofollowWrap.hidden = true;
  openModal();
}

/* Autofollow-datums baseren op de gekozen opvolgdatum */
function syncAutofollowDates() {
  const base = F.due.value || todayISO();
  afReminderDate.value = addDaysISO(base, 3);
  afCallDate.value = addDaysISO(base, 7);
}

offerteSent.addEventListener('change', () => {
  autofollowOptions.hidden = !offerteSent.checked;
  if (offerteSent.checked) syncAutofollowDates();
});

F.due.addEventListener('change', () => {
  if (offerteSent.checked) syncAutofollowDates();
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = F.id.value;

  const data = {
    company: F.company.value.trim(),
    action: F.action.value,
    due: F.due.value,
    status: F.status.value,
    priority: F.priority.value,
    value: F.value.value ? Number(F.value.value) : null,
    note: F.note.value.trim(),
  };

  if (!data.company || !data.due) return;

  if (id) {
    /* Bewerken */
    const task = tasks.find((t) => t.id === id);
    if (task) {
      const wasClosed = CLOSED_STATUSES.includes(task.status);
      Object.assign(task, data);
      const nowClosed = CLOSED_STATUSES.includes(task.status);
      if (nowClosed && !wasClosed) task.closedDate = todayISO();
      if (!nowClosed) task.closedDate = null;
    }
  } else {
    /* Nieuw */
    const task = {
      id: uid(),
      ...data,
      closedDate: CLOSED_STATUSES.includes(data.status) ? todayISO() : null,
      created: todayISO(),
    };
    tasks.push(task);

    /* Automatische opvolgregel: offerte gestuurd */
    if (offerteSent.checked) {
      if (afReminder.checked && afReminderDate.value) {
        tasks.push({
          id: uid(),
          company: data.company,
          action: 'reminder',
          due: afReminderDate.value,
          status: 'open',
          priority: data.priority,
          value: data.value,
          note: 'Auto: reminder na offerte',
          closedDate: null,
          created: todayISO(),
        });
      }
      if (afCall.checked && afCallDate.value) {
        tasks.push({
          id: uid(),
          company: data.company,
          action: 'bellen',
          due: afCallDate.value,
          status: 'open',
          priority: data.priority,
          value: data.value,
          note: 'Auto: bellen na offerte',
          closedDate: null,
          created: todayISO(),
        });
      }
    }
  }

  persist();
  closeModal();
});

/* ---------- Modal: herplannen ---------- */

const resOverlay = document.getElementById('reschedule-overlay');
const resForm = document.getElementById('reschedule-form');
const resId = document.getElementById('reschedule-id');
const resDate = document.getElementById('reschedule-date');
const resCompany = document.getElementById('reschedule-company');

function openReschedule(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  resId.value = id;
  resCompany.textContent = `${task.company} — ${ACTION_LABELS[task.action] || task.action}`;
  resDate.value = addDaysISO(todayISO(), 1);
  resOverlay.hidden = false;
}

function closeReschedule() {
  resOverlay.hidden = true;
  resForm.reset();
}

document.getElementById('reschedule-quick').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-days]');
  if (!btn) return;
  resDate.value = addDaysISO(todayISO(), Number(btn.dataset.days));
});

resForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const task = tasks.find((t) => t.id === resId.value);
  if (task && resDate.value) {
    task.due = resDate.value;
    /* Herplannen zet een afgehandelde taak weer open */
    if (CLOSED_STATUSES.includes(task.status)) {
      task.status = 'open';
      task.closedDate = null;
    }
    persist();
  }
  closeReschedule();
});

/* ---------- Event wiring ---------- */

document.getElementById('btn-new-task').addEventListener('click', openNew);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('reschedule-close').addEventListener('click', closeReschedule);
document.getElementById('reschedule-cancel').addEventListener('click', closeReschedule);

overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});
resOverlay.addEventListener('click', (e) => {
  if (e.target === resOverlay) closeReschedule();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!overlay.hidden) closeModal();
    if (!resOverlay.hidden) closeReschedule();
  }
});

/* ---------- Demo-data bij eerste gebruik ---------- */

function seedIfEmpty() {
  if (tasks.length > 0) return;
  const t = todayISO();
  tasks = [
    { id: uid(), company: 'Acme B.V.', action: 'offerte', due: addDaysISO(t, -2), status: 'open', priority: 'hoog', value: 12000, note: 'Offerte 2 dagen geleden gestuurd, nog niks gehoord.', closedDate: null, created: t },
    { id: uid(), company: 'Jansen Techniek', action: 'bellen', due: t, status: 'open', priority: 'normaal', value: 4500, note: 'Terugbellen over planning.', closedDate: null, created: t },
    { id: uid(), company: 'De Vries Consulting', action: 'reminder', due: t, status: 'open', priority: 'laag', value: null, note: '', closedDate: null, created: t },
    { id: uid(), company: 'Bakker & Zn', action: 'bellen', due: addDaysISO(t, 1), status: 'wachten', priority: 'normaal', value: 8000, note: 'Wacht op akkoord directie.', closedDate: null, created: t },
    { id: uid(), company: 'Pixel Studio', action: 'offerte', due: addDaysISO(t, 4), status: 'open', priority: 'normaal', value: 6500, note: '', closedDate: null, created: t },
    { id: uid(), company: 'Groen Advies', action: 'handmatig', due: t, status: 'gedaan', priority: 'laag', value: null, note: 'Voorstel doorgestuurd.', closedDate: t, created: t },
  ];
  store.save(tasks);
}

seedIfEmpty();
render();
