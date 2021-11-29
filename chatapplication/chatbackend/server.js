require('dotenv').config();

const express = require("express");
const app = express();
const socket = require("socket.io");
const color = require("colors");
const cors = require("cors");
const { get_Current_User, user_Disconnect, join_User } = require("./dummyuser");

app.use(express());

const port = 8000;

app.use(cors());

var server = app.listen(
    port,
    console.log(
        `Server is running on the port no: ${(port)} `
            .green
    )
);

const io = socket(server);

users = [];
connections = [];
rooms = [];
// Store all of the sockets and their respective room numbers
userrooms = {}

// Set given room for url parameter
var given_room = ""

app.get('watchgroup/:room', function (req, res) {
    given_room = req.params.room
    res.sendFile(__dirname + '/index.html');
});

//initializing the socket io connection 
io.sockets.on("connection", (socket) => {

    // Connect Socket
    connections.push(socket);
    // console.log('%s connected: %s sockets connected', socket.id, connections.length);

    // Set default room, if provided in url
    socket.emit('set id', {
        id: given_room
    })

    // reset url parameter
    // Workaround because middleware was not working right
    socket.on('reset url', function (data) {
        given_room = ""
    });

    ///////////////////////////////////////////////////////////

    //for a new user joining the room
    socket.on("joinRoom", ({ username, roomname }) => {
        //* create user
        const p_user = join_User(socket.id, username, roomname);
        socket.join(p_user.room);

        //display a welcome message to the user who have joined a room
        socket.emit("message", {
            userId: p_user.id,
            username: p_user.username,
            text: `Welcome ${p_user.username}`,
        });

        //displays a joined room message to all other room users except that particular user
        socket.broadcast.to(p_user.room).emit("message", {
            userId: p_user.id,
            username: p_user.username,
            text: `${p_user.username} has joined the chat`,
        });
    });

    //user sending message
    socket.on("chat", (text, username, roomname) => {
        // console.log("text", text, username, roomname);
        //gets the room user and the message sent
        const p_user = get_Current_User(socket.id);

        io.to(roomname).emit("message", {
            userId: socket.id,
            username: username,
            text: text,
        });
    });


    // Set movie URL on rooms
    socket.on('set movie', ({ username, roomnum, movieURL }) => {
        var host = rooms['stream-' + socket.roomnum].host
        if (rooms['stream-' + socket.roomnum] && socket.id == host){
            rooms['stream-' + roomnum].currVideo = movieURL;
            rooms['stream-' + roomnum].currTime = 0;
            rooms['stream-' + roomnum].state = true;
        }
    })
    // ------------------------------------------------------------------------
    // New room
    socket.on('new room', ({ username, roomnum }) => {
        
        // console.log("roomnum", roomnum);
        // console.log("username", username);
        // callback(true);
        // Roomnum passed through
        socket.roomnum = roomnum;
        socket.username = username;
        console.log('%s connected to room %s: %s sockets connected', socket.username, socket.roomnum, connections.length);

        // This stores the room data for all sockets
        userrooms[socket.id] = roomnum

        var host = null
        var init = false

        // Sets default room value to 1
        if (socket.roomnum == null || socket.roomnum == "") {
            socket.roomnum = '1'
            userrooms[socket.id] = '1'
        }

        // Adds the room to a global array
        if (!rooms.includes('stream-' + socket.roomnum)) {
            rooms.push('stream-' + socket.roomnum);
        }

        // Checks if the room exists or not

        //if (io.sockets.adapter.rooms.get(socket.roomnum) === undefined) 
        // console.log("🚀 ~ file: server.js ~ line 123 ~ socket.on ~ rooms.includes('stream-' + socket.roomnum)", rooms['stream-' + socket.roomnum])
        // console.log("rooms['stream-' + socket.roomnum]", rooms['stream-' + socket.roomnum]);
        if (!rooms['stream-' + socket.roomnum]) {
            socket.send(socket.id)
            // Sets the first socket to join as the host
            host = socket.id
            init = true

            // Set the host on the client side
            socket.emit('setHost');

            //console.log(socket.id)
        } else {
            // console.log(socket.roomnum)
            host = rooms['stream-' + roomnum].host;

        }

        // Actually join the room      
        socket.join(socket.roomnum);


        // Sets the default values when first initializing
        if (init) {
            console.log("Creating new room", roomnum);
            rooms['stream-' + roomnum] = {
                id: roomnum,
                host: host,
                currPlayer: 3,
                currVideo: '',
                currTime: 0,
                state: false,
                hostName: socket.username,
                users: [socket.username],
            }
            // console.log("rooms['stream-' + roomnum]", rooms['stream-' + roomnum]);
        }
        
        // console.log("host ID", host);
        // console.log("connect socket.id", socket.id);

        // Get time from host which calls change time for that socket
        if (socket.id != host) {
            //socket.broadcast.to(host).emit('getTime', { id: socket.id });
            // console.log("Call the host " + host)

            // Set a timeout so the video can load before it syncs
            setTimeout(function () {
                socket.broadcast.to(host).emit('getData');
            }, 1000);

            console.log("rooms['stream-' + roomnum]", rooms['stream-' + roomnum]);
            console.log("rooms", rooms);
            rooms['stream-' + roomnum].users.push(username)
            // io.to(socket.id).emit("isHost", {isHost: false});
            // console.log("im sending to tyou")

        } else {
            console.log(username + " is the host")
            // io.to(socket.roomnum).emit("isHost", {isHost: true});

        }
    });
    // ------------------------------------------------------------------------
    // Get host data
    socket.on('get host data', function(data) {
        // console.log("data", data);
        if (rooms['stream-' + socket.roomnum]) {
            var roomnum = data.room
            // var host = io.sockets.adapter.rooms['room-' + roomnum].host
            var host = rooms['stream-' + socket.roomnum].host

            // Broadcast to current host and set false
            // Call back not supported when broadcasting

            // Checks if it has the data, if not get the data and recursively call again
            if (data.currTime === undefined) {
                // Saves the original caller so the host can send back the data
                console.log("getPlayerData");
                var caller = socket.id
                socket.broadcast.to(host).emit('getPlayerData', {
                    room: roomnum,
                    caller: caller
                })
            } else {
                var caller = data.caller
                // if (caller != host){
                if (1 == host){
                    console.log("%s is comparing Host time", caller);
                    // console.log("data", data);
                    data.currTime = rooms['stream-' + socket.roomnum].currTime
                    data.state = rooms['stream-' + socket.roomnum].state
                    // Call necessary function on the original caller

                    // io.to(caller).emit("compareHost", data);

                    // socket.broadcast.to(caller).emit('compareHost', data);
                    // return data;
                }
                else {
                    console.log("Host update currTime from %s to %s and State from %s to %s", rooms['stream-' + socket.roomnum].currTime, data.currTime, rooms['stream-' + socket.roomnum].state, data.state )
                    rooms['stream-' + socket.roomnum].currTime = data.currTime
                    rooms['stream-' + socket.roomnum].state = data.state
                    let returnData = {
                        room: data.room,
                        host: rooms['stream-' + socket.roomnum].host,
                        currTime: rooms['stream-' + socket.roomnum].currTime,
                        state: rooms['stream-' + socket.roomnum].state,
                        currVideo: rooms['stream-' + socket.roomnum].currVideo
                    }
                    // console.log("Current currTime is %s and State is %s", rooms['stream-' + socket.roomnum].currTime, rooms['stream-' + socket.roomnum].state )
                    console.log("data", returnData);
                    // console.log("rooms['stream-' + socket.roomnum]", rooms['stream-' + socket.roomnum]);
                    io.to(socket.roomnum).emit("compareHost", returnData);

                    // console.log("data", data);
                    // console.log("socket.roomnum", socket.roomnum);
                    // socket.to('stream-' + socket.roomnum).emit('compareHost', data);
                    // io.to(socket.roomnum).emit('compareHost', data);
                    // socket.broadcast.emit('compareHost', data);
                }
            }
        }

    })

    // Disconnect
    socket.on('disconnect', function (data) {

        const p_user = user_Disconnect(socket.id);

        if (p_user) {
          io.to(p_user.room).emit("message", {
            userId: p_user.id,
            username: p_user.username,
            text: `${p_user.username} has left the room`,
          });
        }

        if (rooms['stream-' + socket.roomnum]){
            if (socket.id == rooms['stream-' + socket.roomnum].host){
                var id = rooms.indexOf("room-" + socket.roomnum)
                rooms.splice(id, 1);
                delete rooms['stream-' + socket.roomnum]
                console.log("rooms", rooms);
            }
        }

        // If socket username is found

        if (users.indexOf(socket.username) != -1) {
            users.splice((users.indexOf(socket.username)), 1);
            //updateUsernames();
            console.log(socket.username + ' is disconnected: %s sockets remaining', connections.length);
        }
        else {
            console.log(socket.id + ' is disconnected: %s sockets remaining', connections.length);

        }

        connections.splice(connections.indexOf(socket), 1);
        // console.log(socket.username + ' is disconnected: %s sockets remaining', connections.length);

        // console.log(io.sockets.adapter.rooms['room-' + socket.roomnum])
        // console.log(socket.roomnum)


        // HOST DISCONNECT
        // Need to check if current socket is the host of the roomnum
        // If it is the host, needs to auto assign to another socket in the room

        // Grabs room from userrooms data structure
        var id = socket.id
        var roomnum = userrooms[id]
        //var room = io.sockets.adapter.rooms.get(socket.roomnum)
        var room = rooms.find((room) => room.id === socket.roomnum)

        // If you are not the last socket to leave
        if (room !== undefined) {
            // If you are the host
            if (socket.id == room.host) {
                // Reassign
                console.log("hello i am the host " + socket.id + " and i am leaving my responsibilities to " + Object.keys(room.sockets)[0])
                io.to(Object.keys(room.sockets)[0]).emit('autoHost', {
                    roomnum: roomnum
                })
            }
            const index = c_users.findIndex((p_user) => p_user.id === id);

            if (index !== -1) {
                return rooms.splice(index, 1)[0];
            }
            // Remove from users list
            // If socket username is found
            if (room.users.indexOf(socket.username) != -1) {
                room.users.splice((room.users.indexOf(socket.username)), 1);
                updateRoomUsers(roomnum);
            }
        }

        // Delete socket from userrooms
        delete userrooms[id]

    });

    function updateRoomUsers(roomnum) {
        if (io.sockets.adapter.rooms.get(socket.roomnum) !== undefined) {
            var roomUsers = io.sockets.adapter.rooms.get(socket.roomnum).users
            io.sockets.in(roomnum).emit('get users', roomUsers)
        }
    }
});