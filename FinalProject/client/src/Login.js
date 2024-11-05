// Updated JSX code in Login.js
import './Login.css';
import io from 'socket.io-client';
import { useEffect, useState } from "react";
import React from 'react';
import { useHistory } from 'react-router-dom';

const socket = io.connect("http://localhost:3001");

function Login() {

  const history = useHistory();

  const [piID, setID] = useState("");
  const [user1, setUser1] = useState("");
  const [user2, setUser2] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [messageReceived, setMessage] = useState("");
  const [createAccountClicked, setCreateAccountClicked] = useState(false); // Track if Create New Account button is clicked

  const createAccount = (event) => {
    event.preventDefault();
    setCreateAccountClicked(true);

    // Check if all required fields are filled before creating the account
    if (email && password && piID && user1 && user2) {
      const atSymbolIndex = email.indexOf('@');
      const username = email.substring(0, atSymbolIndex);
      socket.emit("createAccount", { user1, user2, username, piID, email, password });
    }
  };

  const loginAttempt = (event) => {
    event.preventDefault();
    console.log("sent login");
    if (email && password) {
      socket.emit("loginAttempt", { email, password });
    }
  };

  useEffect(function () {
    socket.on("message", function (data) {
      setMessage(data);
    });
  }, [socket]);

  useEffect(function () {
    // Socket event listener for redirection
    socket.on("redirect", function () {

      localStorage.setItem("email", document.getElementById("email").value);
      localStorage.setItem("password", document.getElementById("password").value);

      history.push("/account");

    });

    return () => {
      socket.off("redirectAccount");
    };

  }, [history]);

  return (
    <div className="container">
      <h2>Login Form</h2>
      <form id="loginForm">
        <div class="form-group">
          <label for="piID">Pi ID:</label>
          <input type="piID" id="piID" name="piID" onChange={(event) => {
            setID(event.target.value);
          }} required={createAccountClicked}/>
        </div>
        <div class="form-group">
          <label for="email">Email:</label>
          <input type="email" id="email" name="email" required onChange={(event) => {
            setEmail(event.target.value);
          }} />
        </div>
        <div class="form-group">
          <label for="password">Password:</label>
          <input type="password" id="password" name="password" required onChange={(event) => {
            setPassword(event.target.value);
          }} />
        </div>
        <div class="form-group">
          <label for="user1">User1:</label>
          <input type="user1" id="user1" name="user1" onChange={(event) => {
            setUser1(event.target.value);
          }} required={createAccountClicked}/>
        </div>
        <div class="form-group">
          <label for="user2">User2:</label>
          <input type="user2" id="user2" name="user2" onChange={(event) => {
            setUser2(event.target.value);
          }} required={createAccountClicked}/>
        </div>
        <button onClick={createAccount} id="createAccountBtn">Create New Account</button>
        <button onClick={loginAttempt} id="loginBtn">Login</button>
      </form>
      {messageReceived}
    </div>
  );
}

export default Login;
