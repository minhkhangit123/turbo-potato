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

app.get('watchgroup/:room', function(req, res) {
  given_room = req.params.room
  res.sendFile(__dirname + '/index.html');
});

//initializing the socket io connection 
io.sockets.on("connection", (socket) => {

  // Connect Socket
  connections.push(socket);
  console.log('Connected: %s sockets connected', connections.length);

  // Set default room, if provided in url
  socket.emit('set id', {
      id: given_room
  })

    // reset url parameter
  // Workaround because middleware was not working right
  socket.on('reset url', function(data) {
    given_room = ""
  });

  ///////////////////////////////////////////////////////////

  //for a new user joining the room
  socket.on("joinRoom", ({ username, roomname }) => {
    //* create user
    const p_user = join_User(socket.id, username, roomname);
    console.log(socket.id, "=id");
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
  socket.on("chat", (text) => {
    //gets the room user and the message sent
    const p_user = get_Current_User(socket.id);

    io.to(p_user.room).emit("message", {
      userId: p_user.id,
      username: p_user.username,
      text: text,
    });
  });

  // ------------------------------------------------------------------------
  // New room
  socket.on('new room', ({ username, roomnum }) => {
    //callback(true);
    // Roomnum passed through
    socket.roomnum = roomnum;
    socket.username = username;

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
    if (!rooms.includes(socket.roomnum)) {
        rooms.push(socket.roomnum);
    }

    // Checks if the room exists or not
    console.log("io.sockets.adapter.rooms.get(socket.roomnum)", io.sockets.adapter.rooms.get(socket.roomnum));
    if (io.sockets.adapter.rooms.get(socket.roomnum) === undefined) {
        socket.send(socket.id)
        // Sets the first socket to join as the host
        host = socket.id
        init = true

        // Set the host on the client side
        socket.emit('setHost');
        
        //console.log(socket.id)
    } else {
        console.log(socket.roomnum)
        host = io.sockets.adapter.rooms.get(socket.roomnum).host
    }

    // Actually join the room
    console.log(socket.username + " connected to room-" + socket.roomnum)
    socket.join(socket.roomnum);

    // Sets the default values when first initializing
    if (init) {
        // io.sockets.adapter.rooms.set(socket.roomnum, {
        //     host: host,
        //     currPlayer: 0,
        //     currVideo: {
        //         yt: 'M7lc1UVf-VE',
        //         dm: 'x26m1j4',
        //         vimeo: '76979871',
        //         html5: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
        //     },
        //     hostName: socket.username,
        //   })
        
        // // Sets the host
        // io.sockets.adapter.rooms['room-' + socket.roomnum].host = host
        // // Default Player
        // io.sockets.adapter.rooms['room-' + socket.roomnum].currPlayer = 0
        // // Default video
        // io.sockets.adapter.rooms['room-' + socket.roomnum].currVideo = {
        //     yt: 'M7lc1UVf-VE',
        //     dm: 'x26m1j4',
        //     vimeo: '76979871',
        //     html5: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
        // }
        // // Previous Video
        // io.sockets.adapter.rooms['room-' + socket.roomnum].prevVideo = {
        //     yt: {
        //         id: 'M7lc1UVf-VE',
        //         time: 0
        //     },
        //     dm: {
        //         id: 'x26m1j4',
        //         time: 0
        //     },
        //     vimeo: {
        //         id: '76979871',
        //         time: 0
        //     },
        //     html5: {
        //         id: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        //         time: 0
        //     }
        // }
        // // Host username
        // io.sockets.adapter.rooms['room-' + socket.roomnum].hostName = socket.username
        // // Keep list of online users
        // io.sockets.adapter.rooms['room-' + socket.roomnum].users = [socket.username]
        // // Set an empty queue
        // io.sockets.adapter.rooms['room-' + socket.roomnum].queue = {
        //     yt: [],
        //     dm: [],
        //     vimeo: [],
        //     html5: []
        // }
    }

    // Set Host label
    // console.log("io.sockets.adapter.rooms.get(socket.roomnum)", io.sockets.adapter.rooms.get(socket.roomnum));
    // io.sockets.in(socket.roomnum).emit('changeHostLabel', {
    //     username: io.sockets.adapter.rooms.get(socket.roomnum).hostName
    // })
    

    // Set Queue
    // updateQueueVideos()

    // Gets current video from room variable
    // switch (io.sockets.adapter.rooms.get(socket.roomnum).currPlayer) {
    //     case 0:
    //         var currVideo = io.sockets.adapter.rooms.get(socket.roomnum).currVideo.yt
    //         break;
    //     case 1:
    //         var currVideo = io.sockets.adapter.rooms.get(socket.roomnum).currVideo.dm
    //         break;
    //     case 2:
    //         var currVideo = io.sockets.adapter.rooms.get(socket.roomnum).currVideo.vimeo
    //         break;
    //     case 3:
    //         var currVideo = io.sockets.adapter.rooms.get(socket.roomnum).currVideo.html5
    //         break;
    //     default:
    //         console.log("Error invalid player id")
    // }
    // var currYT = io.sockets.adapter.rooms.get(socket.roomnum).currVideo.yt

    // // Change the video player to current One
    // switch (io.sockets.adapter.rooms.get(socket.roomnum).currPlayer) {
    //     case 0:
    //         // YouTube is default so do nothing
    //         break;
    //     case 1:
    //         io.sockets.in(socket.roomnum).emit('createDaily', {});
    //         break;
    //     case 2:
    //         io.sockets.in(socket.roomnum).emit('createVimeo', {});
    //         break;
    //     case 3:
    //         io.sockets.in(socket.roomnum).emit('createHTML5', {});
    //         break;
    //     default:
    //         console.log("Error invalid player id")
    // }

    // // Change the video to the current one
    // socket.emit('changeVideoClient', {
    //     videoId: currVideo
    // });
    
    // Get time from host which calls change time for that socket
    if (socket.id != host) {
        //socket.broadcast.to(host).emit('getTime', { id: socket.id });
        console.log("call the damn host " + host)

        // Set a timeout so the video can load before it syncs
        setTimeout(function() {
            socket.broadcast.to(host).emit('getData');
        }, 1000);

    } else {
        console.log("I am the host")
    }
  });
  // ------------------------------------------------------------------------

    // Disconnect
    socket.on('disconnect', function(data) {

    // If socket username is found
    if (users.indexOf(socket.username) != -1) {
        users.splice((users.indexOf(socket.username)), 1);
        updateUsernames();
    }

    connections.splice(connections.indexOf(socket), 1);
    console.log(socket.id + ' is disconnected: %s sockets remaining', connections.length);
    // console.log(io.sockets.adapter.rooms['room-' + socket.roomnum])
    // console.log(socket.roomnum)


    // HOST DISCONNECT
    // Need to check if current socket is the host of the roomnum
    // If it is the host, needs to auto assign to another socket in the room

    // Grabs room from userrooms data structure
    var id = socket.id
    var roomnum = userrooms[id]
    var room = io.sockets.adapter.rooms['room-' + roomnum]

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
});