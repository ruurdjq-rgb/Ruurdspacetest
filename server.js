import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 25 * 1024 * 1024 },
});

function getOpenAIClient() {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) return null;
	return new OpenAI({ apiKey });
}

async function extractTextFromUpload(file) {
	if (!file) throw new Error('No file provided');
	const originalName = file.originalname || '';
	const lower = originalName.toLowerCase();
	if (file.mimetype === 'text/plain' || lower.endsWith('.txt')) {
		return file.buffer.toString('utf-8');
	}
	if (file.mimetype === 'application/pdf' || lower.endsWith('.pdf')) {
		const result = await pdfParse(file.buffer);
		return result.text || '';
	}
	if (lower.endsWith('.epub')) {
		throw new Error('EPUB not supported yet. Please upload PDF or TXT.');
	}
	throw new Error(`Unsupported file type: ${file.mimetype || originalName}`);
}

function buildPrompt({ title, context, textSample }) {
	return [
		'You are an expert at creating highly personal book summaries and mindmaps.',
		'Given the reader context and book text, produce a JSON response with:',
		'- personalSummary: a concise, first-person summary tailored to the reader context (150-250 words).',
		'- keyLessons: 5-10 lessons. Each has title, explanation (2-3 sentences), and 1-2 concrete examples for application in life.',
		'- mindmap: hierarchical nodes with id, topic, and children. Root topic should be the book title.',
		'Constraints:',
		'- Use clear, practical language. No fluff.',
		'- Prefer actionability and specificity over theory.',
		'- Output MUST be valid JSON only.',
		'',
		`Reader context: ${context || 'N/A'}`,
		`Book title: ${title || 'Untitled'}`,
		'Book text sample (may be truncated):',
		textSample,
		'',
		'JSON schema to follow:',
		'{',
		'  "title": string,',
		'  "personalSummary": string,',
		'  "keyLessons": [',
		'    { "title": string, "explanation": string, "examples": [string, ...] }',
		'  ],',
		'  "mindmap": { "id": string, "topic": string, "children": [ { "id": string, "topic": string, "children": [...] } ] }',
		'}',
	].join('\n');
}

function createFallbackSummary({ title, text, context }) {
	const sentences = (text || '').split(/[.!?]\s+/).filter(Boolean);
	const summarySentences = sentences.slice(0, 8).join('. ');
	const rootId = 'root';
	return {
		title: title || 'Untitled',
		personalSummary: summarySentences || `This is a placeholder summary tailored to: ${context || 'N/A'}.`,
		keyLessons: [
			{ title: 'Focus on fundamentals', explanation: 'Master core ideas before advanced tactics. Build from first principles and apply consistently.', examples: ['Schedule weekly review', 'Teach a chapter to a friend'] },
			{ title: 'Turn insights into habits', explanation: 'Translate lessons into small, repeatable actions you can maintain daily.', examples: ['2-minute rule', 'Habit tracker for 30 days'] },
		],
		mindmap: {
			id: rootId,
			topic: title || 'Book',
			children: [
				{ id: 'lesson-1', topic: 'Fundamentals', children: [ { id: 'l1-a', topic: 'First principles', children: [] } ] },
				{ id: 'lesson-2', topic: 'Habits', children: [ { id: 'l2-a', topic: 'Daily actions', children: [] } ] },
			],
		},
	};
}

async function generateSummary({ title, text, context }) {
	const textSample = (text || '').slice(0, 16000);
	const client = getOpenAIClient();
	if (!client) {
		return createFallbackSummary({ title, text: textSample, context });
	}
	const prompt = buildPrompt({ title, context, textSample });
	const completion = await client.chat.completions.create({
		model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
		temperature: 0.3,
		messages: [
			{ role: 'system', content: 'You produce only valid JSON. No markdown.' },
			{ role: 'user', content: prompt },
		],
	});
	const content = completion.choices?.[0]?.message?.content || '';
	try {
		const parsed = JSON.parse(content);
		if (!parsed.title) parsed.title = title || 'Untitled';
		return parsed;
	} catch (err) {
		return createFallbackSummary({ title, text: textSample, context });
	}
}

app.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

app.post('/api/summarize', upload.single('file'), async (req, res) => {
	try {
		const context = req.body?.context || '';
		const title = req.body?.title || '';
		const file = req.file;
		const text = await extractTextFromUpload(file);
		const result = await generateSummary({ title, text, context });
		res.json(result);
	} catch (error) {
		console.error('Summarize error:', error);
		res.status(400).json({ error: error?.message || 'Failed to process file' });
	}
});

app.use(express.static(path.join(__dirname, 'public')));
// Fallback to index.html for non-API routes (Express 5 safe):
app.get(/^(?!\/api\/).*/, (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
});