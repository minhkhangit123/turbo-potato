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
    socket.on("joinRoom", ({ username, roomnum }) => {
        //* create user
        const p_user = join_User(socket.id, username, roomnum);
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
    socket.on("chat", (text, username, roomnum) => {
        // console.log("text", text, username, roomname);
        //gets the room user and the message sent
        const p_user = get_Current_User(socket.id);

        io.to(roomnum).emit("message", {
            userId: socket.id,
            username: username,
            text: text,
        });
    });


    // Set movie URL on rooms
    socket.on('set movie', ({ username, roomnum, movieURL }) => {
        console.log("🚀 ~ file: server.js ~ line 97 ~ socket.on ~ roomnum", roomnum)
        var host = rooms['stream-' + socket.roomnum].host
        if (rooms['stream-' + socket.roomnum] && socket.id == host) {
            rooms['stream-' + roomnum].currVideo = movieURL;
            rooms['stream-' + roomnum].currTime = 0;
            rooms['stream-' + roomnum].state = true;
            rooms['stream-' + roomnum].muted = true;
            io.in(roomnum).emit("getURLMovie", {
                movieURL
            });
        }
    })
    // ------------------------------------------------------------------------
    // New room
    socket.on('new room', ({ username, roomnum, userid }) => {
        console.log("🚀 ~ file: server.js ~ line 112 ~ socket.on ~ userid", userid)

        console.log("roomnum", roomnum);
        console.log("username", username);
        // callback(true);
        // Roomnum passed through
        socket.roomnum = roomnum;
        socket.username = username;
        socket.userid = userid;
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
            if (username != roomnum) {

                io.to(socket.id).emit("hostDisconnect");
            }
            else{
                socket.send(socket.id)
                // Sets the first socket to join as the host
                host = socket.id
                init = true
    
                console.log("Creating new room", roomnum);
                rooms['stream-' + roomnum] = {
                    id: roomnum,
                    host: host,
                    currPlayer: 3,
                    currVideo: '',
                    currTime: 0,
                    state: false,
                    muted: true,
                    hostName: socket.username,
                    users: [socket.userid],
                }
                console.log(username + " is the host")
                socket.join(socket.roomnum);
                io.to(socket.id).emit("isHost", { isHost: true });
            }
            
            // Set the host on the client side   
            //console.log(socket.id)
        } else {
            // console.log(socket.roomnum)
            host = rooms['stream-' + roomnum].host;
            hostName = rooms['stream-' + roomnum].hostName;
            if (hostName == socket.username) {
                console.log("🚀 ~ file: server.js ~ line 161 ~ socket.on ~ socket.id", socket.id)
                console.log("🚀 ~ file: server.js ~ line 161 ~ socket.on ~ host", host)
                io.to(socket.id).emit("hostAgain");
            }
            else if (socket.id != host) {
                socket.join(socket.roomnum);
                // console.log("rooms['stream-' + roomnum]", rooms['stream-' + roomnum]);
                // console.log("rooms", rooms);
                rooms['stream-' + roomnum].users.push(userid)
                io.to(host).emit("getData", rooms['stream-' + roomnum].users);
                io.to(socket.id).emit("isHost", { isHost: false });
                // console.log("im sending to tyou")

            }

        }

        // Actually join the room      
       


        // Sets the default values when first initializing
        // if (init) {
        //     console.log("Creating new room", roomnum);
        //     rooms['stream-' + roomnum] = {
        //         id: roomnum,
        //         host: host,
        //         currPlayer: 3,
        //         currVideo: '',
        //         currTime: 0,
        //         state: false,
        //         muted: true,
        //         hostName: socket.username,
        //         users: [socket.username],
        //     }
        //     // console.log("rooms['stream-' + roomnum]", rooms['stream-' + roomnum]);
        // }

        // // console.log("host ID", host);
        // // console.log("connect socket.id", socket.id);

        // // Get time from host which calls change time for that socket
        // if (socket.id != host) {
        //     //socket.broadcast.to(host).emit('getTime', { id: socket.id });
        //     // console.log("Call the host " + host)

        //     // Set a timeout so the video can load before it syncs

        //     io.to(host).emit("getData");

        //     // console.log("rooms['stream-' + roomnum]", rooms['stream-' + roomnum]);
        //     // console.log("rooms", rooms);
        //     rooms['stream-' + roomnum].users.push(username)
        //     io.to(socket.id).emit("isHost", { isHost: false });
        //     // console.log("im sending to tyou")

        // } else {
        //     console.log(username + " is the host")
        //     io.to(socket.id).emit("isHost", { isHost: true });

        // }
    });
    // ------------------------------------------------------------------------
    // Get host data
    socket.on('get host data', function (data) {
        console.log("data", data);
        if (rooms['stream-' + socket.roomnum]) {
            var roomnum = data.room
            // var host = io.sockets.adapter.rooms['room-' + roomnum].host
            var host = rooms['stream-' + socket.roomnum].host

            console.log("rooms['stream-' + roomnum]", rooms['stream-' + roomnum]);

            console.log("🚀 ~ file: server.js ~ line 208 ~ socket.roomnum", socket.id)
            console.log("🚀 ~ file: server.js ~ line 208 ~ host", host)

            // Broadcast to current host and set false
            // Call back not supported when broadcasting

            // Checks if it has the data, if not get the data and recursively call again


            // if (caller != host){
            if (socket.id == host) {

                console.log("Host update currTime from %s to %s and State from %s to %s", rooms['stream-' + socket.roomnum].currTime, data.currTime, rooms['stream-' + socket.roomnum].state, data.state)
                rooms['stream-' + socket.roomnum].currTime = data.currTime
                rooms['stream-' + socket.roomnum].state = data.state
                rooms['stream-' + socket.roomnum].muted = data.muted
                let returnData = {
                    room: data.room,
                    host: rooms['stream-' + socket.roomnum].host,
                    currTime: data.currTime,
                    state: data.state,
                    muted: data.muted,
                    currVideo: rooms['stream-' + socket.roomnum].currVideo
                }
                // console.log("Current currTime is %s and State is %s", rooms['stream-' + socket.roomnum].currTime, rooms['stream-' + socket.roomnum].state )

                // console.log("rooms['stream-' + socket.roomnum]", rooms['stream-' + socket.roomnum]);
                socket.to(socket.roomnum).emit("compareHost", returnData);


            }

        }

    })

    // Disconnect
    socket.on('disconnect', function (data) {
        console.log('disconnected')
        const p_user = user_Disconnect(socket.id);
        console.log("🚀 ~ file: server.js ~ line 293 ~ p_user", p_user)

        if (p_user) {
            io.to(p_user.room).emit("message", {
                userId: p_user.id,
                username: p_user.username,
                text: `${p_user.username} has left the room`,
            });
        }

        if (rooms['stream-' + socket.roomnum]) {
            if (socket.id == rooms['stream-' + socket.roomnum].host) {
                console.log('host is disconnected')
                io.to(rooms['stream-' + socket.roomnum].id).emit("hostDisconnect");
                var id = rooms.indexOf("room-" + socket.roomnum)
                rooms.splice(id, 1);
                delete rooms['stream-' + socket.roomnum]
                console.log("rooms", rooms);
            }
            else {
                if (rooms['stream-' + socket.roomnum].users.indexOf(socket.userid) != -1) {
                    console.log("🚀 ~ file: server.js ~ line 334 ~ socket.username", socket.userid)
                    rooms['stream-' + socket.roomnum].users.splice((rooms['stream-' + socket.roomnum].users.indexOf(socket.userid)), 1);
                    console.log("🚀 ~ file: server.js ~ line 335 ~  rooms['stream-' + socket.roomnum].users", rooms['stream-' + socket.roomnum].users)
                    io.to(rooms['stream-' + socket.roomnum].host).emit("getData", rooms['stream-' + socket.roomnum].users);

                }
            }
        }
        delete userrooms[id]
        // If socket username is found

        if (users.indexOf(socket.username) != -1) {
            users.splice((users.indexOf(socket.username)), 1);
            //updateUsernames();
            console.log(socket.username + ' is disconnected 1: %s sockets remaining', connections.length);
        }
        else {
            console.log(socket.id + ' is disconnected 2: %s sockets remaining', connections.length);

        }

        connections.splice(connections.indexOf(socket), 1);
        // console.log(socket.username + ' is disconnected: %s sockets remaining', connections.length);

        // console.log(io.sockets.adapter.rooms['room-' + socket.roomnum])
        // console.log(socket.roomnum)


        // HOST DISCONNECT
        // Need to check if current socket is the host of the roomnum
        // If it is the host, needs to auto assign to another socket in the room

        // Grabs room from userrooms data structure
        // var id = socket.id
        // var roomnum = userrooms[id]
        // //var room = io.sockets.adapter.rooms.get(socket.roomnum)
        // rooms.find((room) => console.log("🚀 ~ file: server.js ~ line 313 ~ room", room)
        // )
        // var room = rooms.find((room) => room.id === socket.roomnum)

        // // If you are not the last socket to leave
        // if (room !== undefined) {
        //     // If you are the host
        //     if (socket.id == room.host) {
        //         // Reassign
        //         console.log("hello i am the host " + socket.id + " and i am leaving my responsibilities to " + Object.keys(room.sockets)[0])
        //         io.to(Object.keys(room.sockets)[0]).emit('autoHost', {
        //             roomnum: roomnum
        //         })
        //     }
        //     const index = c_users.findIndex((p_user) => p_user.id === id);

        //     if (index !== -1) {
        //         return rooms.splice(index, 1)[0];
        //     }
        //     // Remove from users list
        //     // If socket username is found

        // }

        // Delete socket from userrooms


    });

    function updateRoomUsers(roomnum) {
        if (io.sockets.adapter.rooms.get(socket.roomnum) !== undefined) {
            var roomUsers = io.sockets.adapter.rooms.get(socket.roomnum).users
            io.sockets.in(roomnum).emit('get users', roomUsers)
        }
    }
});