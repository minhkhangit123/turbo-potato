require('dotenv').config();

const express = require("express");
const app = express();
const socket = require("socket.io");
const color = require("colors");
const cors = require("cors");




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

const c_users = [];

// joins the user to the specific chatroom
function join_User(id, username, room) {
  const p_user = { id, username, room };

  c_users.push(p_user);
  // console.log(c_users, " users");

  return p_user;
}

console.log("user out ", c_users);

// Gets a particular user id to return the current user
function get_Current_User(id) {
  return c_users.find((p_user) => p_user.id === id);
}

// called when the user leaves the chat and its user object deleted from array
function user_Disconnect(id) {
  const index = c_users.findIndex((p_user) => p_user.id === id);

  if (index !== -1) {
    return c_users.splice(index, 1)[0];
  }
}

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
    socket.on('set movie', ({ username, roomnum, movieURL,movieId }) => {
        console.log("🚀 ~ file: server.js ~ line 97 ~ socket.on ~ roomnum", roomnum)
        var host = rooms['stream-' + socket.roomnum].host
        if (rooms['stream-' + socket.roomnum] && socket.id == host) {
            rooms['stream-' + roomnum].currVideo = movieURL;
            rooms['stream-' + roomnum].currTime = 0;
            rooms['stream-' + roomnum].state = true;
            rooms['stream-' + roomnum].muted = true;
            rooms['stream-' + roomnum].currVideoId = movieId;
            io.in(roomnum).emit("getURLMovie", {
                movieURL
            });
            io.in(roomnum).emit("getChoosedMovieId", {
                movieId
            });
        }
    })
    // ------------------------------------------------------------------------
    // New room
    socket.on('new room', ({ username, roomnum, userid }) => {
        
        // callback(true);
        // Roomnum passed through
        socket.roomnum = roomnum;
        socket.username = username;
        socket.userid = userid;

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

        if (!rooms['stream-' + socket.roomnum]) {
            if (username != roomnum) {

                io.to(socket.id).emit("hostDisconnect");
            }
            else{
                socket.send(socket.id)
                // Sets the first socket to join as the host
                host = socket.id
                init = true
    
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
                
                io.to(socket.id).emit("hostAgain");
            }
            else if (socket.id != host) {
                socket.join(socket.roomnum);
                
                rooms['stream-' + roomnum].users.push(userid)
                io.to(socket.roomnum).emit("getData", rooms['stream-' + roomnum].users);
                io.to(socket.id).emit("isHost", { isHost: false });

            }

        }

      
    });
    // ------------------------------------------------------------------------
    // Get host data
    socket.on('get host data', function (data) {
        if (rooms['stream-' + socket.roomnum]) {
            var roomnum = data.room
            // var host = io.sockets.adapter.rooms['room-' + roomnum].host
            var host = rooms['stream-' + socket.roomnum].host

           

            // Broadcast to current host and set false
            // Call back not supported when broadcasting

            // Checks if it has the data, if not get the data and recursively call again


            // if (caller != host){
            if (socket.id == host) {

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
    
                socket.to(socket.roomnum).emit("compareHost", returnData);


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

        if (rooms['stream-' + socket.roomnum]) {
            if (socket.id == rooms['stream-' + socket.roomnum].host) {
                io.to(rooms['stream-' + socket.roomnum].id).emit("hostDisconnect");
                var id = rooms.indexOf("room-" + socket.roomnum)
                rooms.splice(id, 1);
                delete rooms['stream-' + socket.roomnum]
            }
            else {
                if (rooms['stream-' + socket.roomnum].users.indexOf(socket.userid) != -1) {
                    rooms['stream-' + socket.roomnum].users.splice((rooms['stream-' + socket.roomnum].users.indexOf(socket.userid)), 1);
                    io.to(rooms['stream-' + socket.roomnum].host).emit("getData", rooms['stream-' + socket.roomnum].users);

                }
            }
        }
        delete userrooms[id]
        // If socket username is found

        if (users.indexOf(socket.username) != -1) {
            users.splice((users.indexOf(socket.username)), 1);
            //updateUsernames();
           
        }
        

        connections.splice(connections.indexOf(socket), 1);
       
    });

    function updateRoomUsers(roomnum) {
        if (io.sockets.adapter.rooms.get(socket.roomnum) !== undefined) {
            var roomUsers = io.sockets.adapter.rooms.get(socket.roomnum).users
            io.sockets.in(roomnum).emit('get users', roomUsers)
        }
    }
});