const form = document.getElementById('uploadForm');
const statusEl = document.getElementById('status');
const summaryEl = document.getElementById('summary');
const svg = d3.select('#mindmap');
const downloadJsonBtn = document.getElementById('downloadJson');
const downloadPngBtn = document.getElementById('downloadPng');

let lastResult = null;

form.addEventListener('submit', async (e) => {
	e.preventDefault();
	const fileInput = document.getElementById('file');
	const context = document.getElementById('context').value;
	const title = document.getElementById('title').value;
	const file = fileInput.files[0];
	if (!file) return;

	statusEl.textContent = 'Uploading and generating summary...';
	downloadJsonBtn.disabled = true;
	downloadPngBtn.disabled = true;
	summaryEl.textContent = '';
	clearSvg();

	const formData = new FormData();
	formData.append('file', file);
	formData.append('context', context);
	formData.append('title', title);

	try {
		const res = await fetch('/api/summarize', { method: 'POST', body: formData });
		if (!res.ok) throw new Error('Request failed');
		const data = await res.json();
		lastResult = data;
		renderSummary(data);
		renderMindmap(data.mindmap);
		statusEl.textContent = 'Done.';
		downloadJsonBtn.disabled = false;
		downloadPngBtn.disabled = false;
	} catch (err) {
		console.error(err);
		statusEl.textContent = 'Error: ' + (err.message || 'Failed');
	}
});

function renderSummary(data) {
	const parts = [
		data.title ? `Title: ${data.title}` : '',
		data.personalSummary || '',
		(data.keyLessons || []).map((l, i) => `${i + 1}. ${l.title}\n   ${l.explanation}\n   Examples: ${(l.examples || []).join('; ')}`).join('\n\n'),
	].filter(Boolean);
	summaryEl.textContent = parts.join('\n\n');
}

function clearSvg() {
	svg.selectAll('*').remove();
}

function renderMindmap(rootData) {
	if (!rootData) return;
	const width = svg.node().clientWidth || 800;
	const height = +svg.attr('height');

	const root = d3.hierarchy(rootData, (d) => d.children);
	root.x0 = height / 2;
	root.y0 = 0;

	const treeLayout = d3.tree().size([height - 40, width - 200]);

	update(root);

	function update(source) {
		const treeData = treeLayout(root);
		const nodes = treeData.descendants();
		const links = treeData.links();

		nodes.forEach((d) => (d.y = d.depth * 180));

		const node = svg.selectAll('g.node').data(nodes, (d) => d.data.id || (d.data.id = Math.random().toString(36).slice(2)));

		const nodeEnter = node
			.enter()
			.append('g')
			.attr('class', 'node')
			.attr('transform', () => `translate(${source.y0},${source.x0})`)
			.on('click', (event, d) => {
				if (d.children) {
					d._children = d.children;
					d.children = null;
				} else {
					d.children = d._children;
					d._children = null;
				}
				update(d);
			});

		nodeEnter
			.append('circle')
			.attr('class', 'node')
			.attr('r', 1e-6)
			.style('fill', (d) => (d._children ? '#555' : '#fff'))
			.style('stroke', '#111')
			.style('stroke-width', 1.5);

		nodeEnter
			.append('text')
			.attr('dy', '0.31em')
			.attr('x', (d) => (d.children || d._children ? -12 : 12))
			.attr('text-anchor', (d) => (d.children || d._children ? 'end' : 'start'))
			.text((d) => d.data.topic)
			.style('font', '12px system-ui');

		const nodeUpdate = nodeEnter.merge(node);

		nodeUpdate
			.transition()
			.duration(300)
			.attr('transform', (d) => `translate(${d.y},${d.x})`);

		nodeUpdate
			.select('circle.node')
			.attr('r', 6)
			.style('fill', (d) => (d._children ? '#555' : '#fff'))
			.attr('cursor', 'pointer');

		const nodeExit = node
			.exit()
			.transition()
			.duration(300)
			.attr('transform', () => `translate(${source.y},${source.x})`)
			.remove();

		nodeExit.select('circle').attr('r', 1e-6);
		nodeExit.select('text').style('fill-opacity', 1e-6);

		const link = svg.selectAll('path.link').data(links, (d) => d.target.data.id);

		const linkEnter = link
			.enter()
			.append('path')
			.attr('class', 'link')
			.attr('d', () => diagonal({ source: { x: source.x0, y: source.y0 }, target: { x: source.x0, y: source.y0 } }))
			.style('fill', 'none')
			.style('stroke', '#9ca3af')
			.style('stroke-width', 1.5);

		const linkUpdate = linkEnter.merge(link);

		linkUpdate
			.transition()
			.duration(300)
			.attr('d', (d) => diagonal(d));

		link
			.exit()
			.transition()
			.duration(300)
			.attr('d', () => diagonal({ source: { x: source.x, y: source.y }, target: { x: source.x, y: source.y } }))
			.remove();

		nodes.forEach((d) => {
			d.x0 = d.x;
			d.y0 = d.y;
		});
	}

	function diagonal(d) {
		return `M ${d.source.y},${d.source.x}
			C ${(d.source.y + d.target.y) / 2},${d.source.x}
			  ${(d.source.y + d.target.y) / 2},${d.target.x}
			  ${d.target.y},${d.target.x}`;
	}
}

// Downloads

downloadJsonBtn.addEventListener('click', () => {
	if (!lastResult) return;
	const blob = new Blob([JSON.stringify(lastResult, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${(lastResult.title || 'mindmap').replace(/\s+/g, '_')}.json`;
	a.click();
	URL.revokeObjectURL(url);
});

// Export PNG from SVG

downloadPngBtn.addEventListener('click', () => {
	const node = svg.node();
	const serializer = new XMLSerializer();
	let source = serializer.serializeToString(node);
	if (!source.match(/^<svg[^>]+xmlns="http:\/\/www.w3.org\/2000\/svg"/)) {
		source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
	}
	const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const img = new Image();
	img.onload = function () {
		const canvas = document.createElement('canvas');
		canvas.width = node.clientWidth;
		canvas.height = parseInt(node.getAttribute('height'), 10) || 600;
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(img, 0, 0);
		URL.revokeObjectURL(url);
		canvas.toBlob((pngBlob) => {
			const pngUrl = URL.createObjectURL(pngBlob);
			const a = document.createElement('a');
			a.href = pngUrl;
			a.download = `${(lastResult?.title || 'mindmap').replace(/\s+/g, '_')}.png`;
			a.click();
			URL.revokeObjectURL(pngUrl);
		});
	};
	img.src = url;
});