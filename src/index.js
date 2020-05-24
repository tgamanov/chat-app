const path = require('path');
const http = require('http')
const express = require('express');
const socketio = require('socket.io')
const Filter = require('bad-words')
const {
    generateMessage,
    generateLocationMessage
} = require('./utils/messages')
const {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom
} = require('./utils/users')

const app = express();
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000

//Define paths for express config
const publicDirectoryPath = path.join(__dirname, '../public');

//Setup static directory to serve 
app.use(express.static(publicDirectoryPath));
console.log('New WebSocket connection');


io.on('connection', (socket) => {
    socket.on('join', (options, clb) => {
        const {
            error,
            user
        } = addUser({
            id: socket.id,
            ...options
        })
        if (error) {
            return clb(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('admin', `${user.username}, welcome to ${user.room} chat room.`))
        socket.broadcast.to(user.room).emit('message', generateMessage('admin', `${user.username} has joined.`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        clb()
    })

    socket.on('sendMessage', (message, clb) => {
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return clb('Profanity is not allowed!')
        }

        const user = getUser(socket.id)

        io.to(user.room).emit('message', generateMessage(user.username, message))
        clb()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('admin', `${user.username} has left.`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    socket.on('sendLocation', (location, clb) => {
        const user = getUser(socket.id)

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${location.lat},${location.long}`))
        clb('Location shared to other users')
    })
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}.`);
})