const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// firebase initializations
var firebase = require('firebase/app');
const{getDatabase, ref, onValue, set, update, get, child, push} = require('firebase/database');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require("firebase/auth");

const firebaseConfig = {
    apiKey: "AIzaSyCsHFKahio6YEUkTgUEC3t6ouj68wgtGQE",
    authDomain: "iot-projec-bacda.firebaseapp.com",
    databaseURL: "https://iot-projec-bacda-default-rtdb.firebaseio.com",
    projectId: "iot-projec-bacda",
    storageBucket: "iot-projec-bacda.appspot.com",
    messagingSenderId: "405825507517",
    appId: "1:405825507517:web:9c1d9a56a006332307a7d4",
    measurementId: "G-6SXWNK2QDB"
  };

firebase.initializeApp(firebaseConfig);
var database = getDatabase();
const auth = getAuth();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // for login attempts
  socket.on('loginAttempt', function(data) {
    console.log("email: " + data.email);
    console.log("password: " + data.password);
    
    signInWithEmailAndPassword(auth, data.email, data.password)
      .then((userCredential) => {
        console.log("signed in!")
        console.log(userCredential.user.email)

        socket.emit("message", "Successfully signed in!");
        
        // Redirect the user to the '/account' directory
        socket.emit("redirect", "/account");

      })
      .catch((error) => {
        console.log("error signing in");
        socket.emit("message", "Error signing in");
      });

  })

  // for account creation
  socket.on('createAccount', function(data) {

    createUserWithEmailAndPassword(auth, data.email, data.password)
      .then((userCredential) => {
        console.log("created account!")
        console.log(userCredential.user.email)

        const newUserRef = ref(database, "users/" + data.username);

        // adding new user to the database
        set(newUserRef, {
            id : data.piID
        })
        .then(() => {
            console.log('New user added successfully');
        })
        .catch((error) => {
            console.error('Error adding new user:', error);
        });

        const piRef = ref(database, "pis/3");

        // adding user1 to 
        set(piRef, {
            user1 : {
              name : data.user1,
              sessions : ""
            },
            user2 : {
              name : data.user2,
              sessions : ""
            }
        })
        .then(() => {
            console.log('Users added successfully');
        })
        .catch((error) => {
            console.error('Error adding new user1:', error);
        });

        socket.emit("message", "Account created successfully!");

        //Redirect the user to the '/account' directory
        socket.emit("redirect", "/account");

      })
      .catch((error) => {
        console.log("error making account")
        socket.emit("message", "Error creating account");
      });
  })

// user is requesting some info
socket.on("requestSessions", function(userInfo) {

  signInWithEmailAndPassword(auth, userInfo.email, userInfo.password)
    .then(async (userCredential) => {
      try {

        const atSymbolIndex = userInfo.email.indexOf('@');
        const username = userInfo.email.substring(0, atSymbolIndex);

        const piIDsnapshot = await get(ref(database, "users/" + username))


        const userSnapshot = await get(ref(database, "pis/" + piIDsnapshot.val()["id"]));
        let temp = {}
        //console.log(snapshot)

        const sessionst = {};
        userSnapshot.forEach((childSnapshot) => {
          temp = childSnapshot.val();
          temp["sessions"]["Overall"] = "";
          sessionst[childSnapshot.key] = temp;
        });


        socket.emit("receiveSessions", sessionst);

      } catch (error) {
        console.log("error", error);
      }
    })
    .catch((error) => {
      console.log("error signing in")
    });
  });

})

server.listen(3001, () => {
    console.log("server is running");
});