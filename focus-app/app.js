const $ = (sel, parent=document) => parent.querySelector(sel)
const $$ = (sel, parent=document) => Array.from(parent.querySelectorAll(sel))

const storage = {
	get(key, fallback) {
		try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
	},
	set(key, value) {
		localStorage.setItem(key, JSON.stringify(value))
	}
}

const state = {
	mode: 'focus',
	remainingSeconds: 25*60,
	isRunning: false,
	completedFocusCount: 0,
	settings: storage.get('settings', { focus: 25, short: 5, long: 15, longEvery: 4 }),
	tasks: storage.get('tasks', []),
	stats: storage.get('stats', {})
}

function saveSettingsFromInputs() {
	const focus = parseInt($('#focus-min').value) || 25
	const short = parseInt($('#short-min').value) || 5
	const long = parseInt($('#long-min').value) || 15
	const longEvery = parseInt($('#long-every').value) || 4
	state.settings = { focus, short, long, longEvery }
	storage.set('settings', state.settings)
	if (!state.isRunning) setMode(state.mode) // refresh display
}

function setMode(mode) {
	state.mode = mode
	const mins = mode === 'focus' ? state.settings.focus
		: mode === 'short' ? state.settings.short
		: state.settings.long
	state.remainingSeconds = mins * 60
	updateDisplay()
}

function tick() {
	if (!state.isRunning) return
	if (state.remainingSeconds > 0) {
		state.remainingSeconds -= 1
		updateDisplay()
	} else {
		onTimerComplete()
	}
}

function updateDisplay() {
	const m = Math.floor(state.remainingSeconds / 60).toString().padStart(2, '0')
	const s = (state.remainingSeconds % 60).toString().padStart(2, '0')
	$('#time').textContent = `${m}:${s}`
}

function onTimerComplete() {
	state.isRunning = false
	if (state.mode === 'focus') {
		state.completedFocusCount += 1
		incrementStatsForToday('focusMinutes', state.settings.focus)
	}
	// auto-switch logic
	if (state.mode === 'focus') {
		if (state.completedFocusCount % state.settings.longEvery === 0) setMode('long')
		else setMode('short')
	} else {
		setMode('focus')
	}
	updateTodaySummary()
}

function incrementStatsForToday(metric, amount) {
	const todayKey = new Date().toISOString().slice(0,10)
	state.stats[todayKey] = state.stats[todayKey] || { focusMinutes: 0, sessions: 0 }
	state.stats[todayKey][metric] += amount
	if (metric === 'focusMinutes') state.stats[todayKey].sessions += 1
	storage.set('stats', state.stats)
	renderChart()
}

function start() {
	if (state.isRunning) return
	state.isRunning = true
}

function pause() {
	state.isRunning = false
}

function reset() {
	state.isRunning = false
	setMode(state.mode)
}

// tasks
function addTask(title, est) {
	state.tasks.push({ id: crypto.randomUUID(), title, est, done: false, used: 0 })
	storage.set('tasks', state.tasks)
	renderTasks()
}

function toggleTask(id) {
	const t = state.tasks.find(t => t.id === id)
	if (!t) return
	t.done = !t.done
	storage.set('tasks', state.tasks)
	renderTasks()
}

function incTomato(id, delta) {
	const t = state.tasks.find(t => t.id === id)
	if (!t) return
	t.used = Math.max(0, t.used + delta)
	storage.set('tasks', state.tasks)
	renderTasks()
}

function deleteTask(id) {
	state.tasks = state.tasks.filter(t => t.id !== id)
	storage.set('tasks', state.tasks)
	renderTasks()
}

// chart
let chart
function renderChart() {
	const ctx = $('#stats-chart')
	if (!ctx) return
	const labels = [...Array(7)].map((_, i) => {
		const d = new Date(); d.setDate(d.getDate() - (6 - i))
		return d.toISOString().slice(5,10)
	})
	const todayKey = new Date().toISOString().slice(0,10)
	const data = labels.map(label => {
		const key = new Date(`${new Date().getFullYear()}-${label}`).toISOString().slice(0,10)
		return state.stats[key]?.focusMinutes || 0
	})
	if (chart) chart.destroy()
	chart = new Chart(ctx, {
		type: 'bar',
		data: { labels, datasets: [{ label: 'Focus (min)', data, backgroundColor: '#22d3ee' }] },
		options: { scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
	})
}

function updateTodaySummary() {
	const todayKey = new Date().toISOString().slice(0,10)
	const s = state.stats[todayKey] || { focusMinutes: 0, sessions: 0 }
	$('#today-summary').textContent = `Today: ${s.sessions} sessions, ${s.focusMinutes} min focused`
}

// tabs
function setupTabs() {
	$$('.tab').forEach(btn => {
		btn.addEventListener('click', () => {
			$$('.tab').forEach(b => b.classList.remove('active'))
			btn.classList.add('active')
			const tab = btn.dataset.tab
			$$('.view').forEach(v => v.classList.remove('active'))
			$(`#view-${tab}`).classList.add('active')
			if (tab === 'stats') renderChart()
		})
	})
}

function setupTimer() {
	$('#start').addEventListener('click', () => start())
	$('#pause').addEventListener('click', () => pause())
	$('#reset').addEventListener('click', () => reset())
	;['#focus-min','#short-min','#long-min','#long-every'].forEach(sel => {
		$(sel).addEventListener('change', saveSettingsFromInputs)
	})
	// hydrate inputs
	$('#focus-min').value = state.settings.focus
	$('#short-min').value = state.settings.short
	$('#long-min').value = state.settings.long
	$('#long-every').value = state.settings.longEvery
	setMode('focus')
	setInterval(tick, 1000)
}

function renderTasks() {
	const list = $('#task-list')
	list.innerHTML = ''
	state.tasks.forEach(t => {
		const li = document.createElement('li')
		li.className = 'task-item'
		li.innerHTML = `
			<input type="checkbox" ${t.done ? 'checked' : ''} />
			<div class="title">${t.title}</div>
			<div class="tomato">${t.used} / ${t.est}</div>
			<button class="inc">+1</button>
			<button class="del">✕</button>
		`
		li.querySelector('input').addEventListener('change', () => toggleTask(t.id))
		li.querySelector('.inc').addEventListener('click', () => incTomato(t.id, 1))
		li.querySelector('.del').addEventListener('click', () => deleteTask(t.id))
		list.appendChild(li)
	})
}

function setupTasks() {
	renderTasks()
	$('#task-form').addEventListener('submit', (e) => {
		e.preventDefault()
		const title = $('#task-title').value.trim()
		const est = parseInt($('#task-est').value) || 1
		if (!title) return
		addTask(title, est)
		$('#task-title').value = ''
		$('#task-est').value = '1'
	})
}

function init() {
	setupTabs()
	setupTimer()
	setupTasks()
	updateTodaySummary()
}

document.addEventListener('DOMContentLoaded', init)

