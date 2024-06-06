const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socket(server);

let chess = new Chess(); // Initialize the chess game
let players = { white: null, black: null };

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    if (!players.white) {
        players.white = socket.id;
        socket.emit('playerRole', 'W');
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit('playerRole', 'B');
    } else {
        socket.emit('spectatorRole');
    }

    socket.on('disconnect', () => {
        console.log('Disconnect:', socket.id);
        if (socket.id === players.white) {
            players.white = null;
            resetGame();
        } else if (socket.id === players.black) {
            players.black = null;
            resetGame();
        }
    });

    socket.on('move', (move) => {
        try {
            if (chess.turn() === 'w' && socket.id !== players.white) {
                return;
            }
            if (chess.turn() === 'b' && socket.id !== players.black) {
                return;
            }

            const result = chess.move(move);
            if (result) {
                io.emit('move', move);
                io.emit('boardState', chess.fen());

                if (chess.game_over()) {
                    io.emit('gameOver', chess.turn() === 'w' ? 'B' : 'W');
                    resetGame();
                }
            } else {
                console.log('Invalid move:', move);
                socket.emit('invalidMove', move);
            }
        } catch (err) {
            console.log('Error processing move:', err);
            socket.emit('invalidMove', move);
        }
    });
});

app.get('/', (req, res) => res.render('index', { title: 'Chess Game' }));

function resetGame() {
    chess = new Chess();
    io.emit('boardState', chess.fen());
}

server.listen(3000, () => console.log('Server is running on port 3000'));
