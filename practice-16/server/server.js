const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const webpush = require('web-push');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client')));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3001", "http://localhost:3000", "https://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const vapidKeys = {
  publicKey: 'BPlv95NfVupqg6SLmbUhZ10wI_Sl9vLIjESmwAEZIGgqVF8eCZA39aJjX9zEzKXqeFjDnn9vF_3Ohbmjbg58z8A',
  privateKey: 'hZasvuyoECCoyET6oR_A_zbbHC6BWEV5uIc42HX0ZlY'
};

webpush.setVapidDetails('mailto:arms@shop.com', vapidKeys.publicKey, vapidKeys.privateKey);

let subscriptions = [];

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('newProduct', (product) => {
    console.log('New product:', product);
    io.emit('productAdded', product);
    const payload = JSON.stringify({ title: 'Бастион', body: 'Добавлена новая позиция в каталог' });
    subscriptions.forEach(sub => {
      webpush.sendNotification(sub, payload).catch(err => console.error('Push error:', err));
    });
  });
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

app.post('/subscribe', (req, res) => {
  subscriptions.push(req.body);
  res.status(201).json({ message: 'Subscribed' });
});

app.post('/unsubscribe', (req, res) => {
  subscriptions = subscriptions.filter(sub => sub.endpoint !== req.body.endpoint);
  res.status(200).json({ message: 'Unsubscribed' });
});

server.listen(3001, () => console.log('Server on http://localhost:3001'));