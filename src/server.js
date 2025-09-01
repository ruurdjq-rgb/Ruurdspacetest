const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

function sendHtml(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Interne serverfout');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(302, { Location: '/bad-habits' });
    res.end();
    return;
  }

  if (req.url === '/bad-habits') {
    const filePath = path.join(__dirname, 'public', 'bad-habits.html');
    sendHtml(res, filePath);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Niet gevonden');
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

