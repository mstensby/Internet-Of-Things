// AccountPage.js
import React from 'react';
import {useEffect, useState} from "react";
import io from 'socket.io-client';

const socket = io.connect("http://localhost:3001");

function AccountPage() {

  const userEmail = localStorage.getItem("email");
  const userPassword = localStorage.getItem("password");

  const [messageReceived, setData] = useState("");

  const requestSessions = function() {
    const userInfo = {
        email : userEmail,
        password : userPassword
    }
    socket.emit("requestSessions", userInfo)
}

useEffect(function() {
  socket.on("receiveSessions", function(data) {
    console.log("displaying data")
    console.log(data);
    console.log(data.sessions);
  });
}, [socket]);


  return (
    <div>
      <h2>Account Page</h2>
      <button onClick={requestSessions} id="grabData">testDataGrab</button>
      {userEmail}
      {userPassword}
      {/* Add your account-related content here */}
    </div>
  );
}

export default AccountPage;