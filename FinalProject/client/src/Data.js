import './Data.css';
import React, { useState, useEffect } from 'react';
import { Typography, Select, MenuItem, TextField, Box, Grid, Paper } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import io from 'socket.io-client';


const socket = io.connect("http://localhost:3001");

const DriveSenseDashboard = () => {
  const [sessionSelection, setSession] = useState('');
  const [userSelection, setUser] = useState('');
  const [lineChartData, setLineChartData] = useState([]);
  const [lineChartData2, setLineChartData2] = useState([]);
  const [userData, setUserData] = useState({});
  const [minThresholdPercentage, setMinThresholdPercentage] = useState(0);
  const [maxThresholdPercentage, setMaxThresholdPercentage] = useState(1);
  const [aboveThresholdPercentage, setAboveThresholdPercentage] = useState(0);
  const [duration, setDuration] = useState(0);
  const [minDuration, setMinDuration] = useState(0);
  const [maxDuration, setMaxDuration] = useState(0);


  const userEmail = localStorage.getItem("email");
  const userPassword = localStorage.getItem("password");

  const requestSessions = function() {
    const userInfo = {
        email : userEmail,
        password : userPassword
    }
    socket.emit("requestSessions", userInfo);
  }

  useEffect(() => {
    // Call requestSessions function after io connection is established
    socket.on("connect", requestSessions);
    console.log("grabbing sessions")

    return () => {
      // Clean up the socket event listener when the component unmounts
      socket.off("connect", requestSessions);
    };
   }, []); // Empty dependency array ensures this effect only runs once after initial render

  useEffect(function() {
    socket.on("receiveSessions", function(data) {
      setUserData(data); // Update the user data
    });
  }, [socket]);

  useEffect(() => {
    if (userSelection && sessionSelection) {
      const currentUserSessions = userData[userSelection]?.sessions;
      if (currentUserSessions) {
        if (sessionSelection === 'Overall') {
            let overallDecibels = [];
            let overallDistractedness = [];
            let duration = 0;
            let minPercentage = Infinity;
            let maxPercentage = -Infinity;
            let minDuration = Infinity;
            let maxDuration = -Infinity;
            Object.values(currentUserSessions).forEach(session => {
              if(session) {
                minDuration = Math.min(minDuration, session.duration);
                maxDuration = Math.max(maxDuration, session.duration);
                duration += session.duration || 0;
                overallDecibels = overallDecibels.concat(session.decibels);
                overallDistractedness = overallDistractedness.concat(session.distractedness);
                const aboveThresholdValues = session.distractedness.filter(value => value > 0.8).length;
                const totalValues = session.distractedness.length;
                const percentage = (aboveThresholdValues / totalValues) * 100;
                minPercentage = Math.min(minPercentage, percentage);
                maxPercentage = Math.max(maxPercentage, percentage);
              }
            });
            setMinDuration(Math.round(minDuration));
            setMaxDuration(Math.round(maxDuration));
            setDuration(Math.round(duration))
            setLineChartData(overallDistractedness.map((value, index) => ({ index, value })));
            setLineChartData2(overallDecibels.map((value, index) => ({ index, value })));
            setMinThresholdPercentage(Math.round(minPercentage));
            setMaxThresholdPercentage(Math.round(maxPercentage));


            // Calculate the percentage of time that the distr values are above 0.8
            const totalValues = overallDistractedness.length;
            const aboveThresholdValues = overallDistractedness.filter(value => value > 0.8).length;
            const percentage = (aboveThresholdValues / totalValues) * 100;
            setAboveThresholdPercentage(Math.round(percentage));
        } 
        else {
            const decibels = currentUserSessions[sessionSelection]["decibels"];
            const distr = currentUserSessions[sessionSelection]["distractedness"];
            const newLineChartData = distr.map((value, index) => ({
                index: index, // Index for x-axis
                value: value
            }));
            const newLineChartData2 = decibels.map((value, index) => ({
                index: index, // Index for x-axis
                value: value
            }));
            setDuration(currentUserSessions[sessionSelection]["duration"])
            setLineChartData(newLineChartData);
            setLineChartData2(newLineChartData2);

            // Calculate the percentage of time that the distr values are above 0.8
            const totalValues = distr.length;
            const aboveThresholdValues = distr.filter(value => value > 0.8).length;
            const percentage = (aboveThresholdValues / totalValues) * 100;
            setAboveThresholdPercentage(Math.round(percentage));
        }
      }
    }
  }, [userSelection, sessionSelection, userData]);


  const handleUserChange = (event) => {
    setUser(event.target.value);
    setSession(''); // Reset session selection when user changes
  };

  const handleSessionChange = (event) => {
    setSession(event.target.value);
  };

  const distrSettings = {
    width: 250,
    height: 250,
    value: aboveThresholdPercentage,
    valueMin: minThresholdPercentage,
    valueMax: maxThresholdPercentage
  };

  const durSettings = {
    width: 200,
    height: 200,
    value: duration,
    valueMin: minDuration,
    valueMax: maxDuration
  };
  

  // Calculate grade based on aboveThresholdPercentage
  const calculateGrade = () => {
    if (aboveThresholdPercentage >= 0 && aboveThresholdPercentage < 2) {
      return 'A';
    } else if (aboveThresholdPercentage >= 2 && aboveThresholdPercentage < 5) {
      return 'B';
    } else if (aboveThresholdPercentage >= 5 && aboveThresholdPercentage < 10) {
      return 'C';
    } else if (aboveThresholdPercentage >= 10 && aboveThresholdPercentage < 20) {
      return 'D';
    } else {
      return 'F';
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A':
        return '#00ff00'; // green
      case 'B':
        return '#80ff00'; // green-yellow
      case 'C':
        return '#ffff00'; // yellow
      case 'D':
        return '#ff8000'; // orange
      case 'F':
        return '#ff0000'; // red
      default:
        return '#000000'; // black (default color)
    }
  };

  //const selectedSession = userData[userSelection]?.sessions[sessionSelection];
  const sessionsNames = Object.keys(userData[userSelection]?.sessions || {});
  const driverOptions = Object.keys(userData);

  return (
    <Box sx={{ padding: 4 }}>
      <Grid container spacing={2}>
          <Grid item xs={6}>
            <Select
            value={userSelection}
            onChange={handleUserChange}
            displayEmpty
            inputProps={{ 'aria-label': 'Without label' }}
            sx={{ backgroundColor: '#f0f0f0', borderRadius: '4px' }} // Set the background color to white
        >
            <MenuItem value="" disabled>Select Driver</MenuItem>
            {driverOptions.map((option, index) => (
            <MenuItem key={index} value={option}>{option}</MenuItem>
            ))}
        </Select>
          </Grid>
          <Grid item xs={6}>
            <Select
            value={sessionSelection}
            onChange={handleSessionChange}
            displayEmpty
            inputProps={{ 'aria-label': 'Without label' }}
            sx={{ backgroundColor: '#f0f0f0', borderRadius: '4px' }} // Set the background color to white
        >
            <MenuItem value="" disabled>Select Session</MenuItem>
            {sessionsNames.map((option, index) => (
            <MenuItem key={index} value={option}>{option}</MenuItem>
            ))}
        </Select>
          </Grid>
      </Grid>

      
        <Grid container spacing={2}>
            <Paper elevation={3} sx={{ padding: 2, marginTop: 2, borderRadius: '15px', backgroundColor: '#353a45', margin: 5 }}>
            <Grid item xs={6}>
                <Typography variant="h6" gutterBottom sx={{ color: '#fff', fontWeight: 'bold', marginBottom: '10px' }} >Distractedness Levels</Typography>
                <LineChart width={600} height={300} data={lineChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="index" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 10 }} />
                </LineChart>
            </Grid>
            </Paper>
            <Paper elevation={3} sx={{ padding: 2, marginTop: 2, borderRadius: '15px', backgroundColor: '#353a45', margin: 5 }}>
                <Grid item xs={6}>
                    <Typography variant="h6" gutterBottom sx={{ color: '#fff', fontWeight: 'bold', marginBottom: '10px' }}>Audio Measurements</Typography>
                    <LineChart width={600} height={300} data={lineChartData2} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis dataKey="index" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#ff8800" activeDot={{ r: 8 }} />
                    </LineChart>
                </Grid>
            </Paper>
        </Grid>

        <Grid container spacing={3}>
        <Paper elevation={3} sx={{ padding: 2, marginTop: 2, borderRadius: '15px', backgroundColor: '#353a45', margin: 5 }}>
          <Grid item xs={6}>
            <Typography variant="h6" gutterBottom sx={{ color: '#fff', fontWeight: 'bold', marginBottom: '10px' }}>Percentage of time distracted</Typography>
            <PieChart width={400} height={400}>
              <Pie
                dataKey="value"
                isAnimationActive={true}
                data={[{ name: 'Distracted', value: aboveThresholdPercentage }, { name: 'Not distracted', value: 100 - aboveThresholdPercentage }]}
                cx={200}
                cy={200}
                outerRadius={80}
                fill="#8884d8"
                label
              >
                {[
                  { name: 'Distracted', value: aboveThresholdPercentage},
                  { name: 'Not Distracted', value: (100 - aboveThresholdPercentage) }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d'][index % 2]}/>
                ))}
              </Pie>
              <Tooltip />
            <Legend
                layout="vertical"
                verticalAlign="bottom"
                align="right"
              />
            </PieChart>
          </Grid>
          </Paper>
          <Paper elevation={3} sx={{ padding: 2, marginTop: 2, borderRadius: '15px', backgroundColor: '#353a45', margin: 5 }}>
            <Grid item xs={6}>
                <Typography variant="h6" gutterBottom sx={{ color: '#fff', fontWeight: 'bold', marginBottom: '10px' }}>Percentage (%) of distractedness across all sessions</Typography>
                <Gauge
                startAngle={-110}
                endAngle={110}
                {...distrSettings}
                sx={(theme) => ({
                    [`& .${gaugeClasses.valueText}`]: {
                    fontSize: 40,
                    },
                    [`& .${gaugeClasses.valueArc}`]: {
                    fill: '#61c6e2',
                    },
                    [`& .${gaugeClasses.referenceArc}`]: {
                    fill: theme.palette.text.disabled,
                    },
                })}
                text={
                    ({ value, valueMax }) => `${value.toFixed(0)} / ${valueMax.toFixed(0)}`
                 }/>
            </Grid>
          </Paper>
          <Paper elevation={3} sx={{ width: 250, padding: 4, marginTop: 2, borderRadius: '15px', backgroundColor: '#353a45', margin: 5 }}>
            <Grid item xs={10}>
            <Typography variant="h5" gutterBottom sx={{ color: '#fff', fontWeight: 'bold', marginBottom: '10px' }}>REPORT</Typography>
            <Typography variant="h6" gutterBottom sx={{ color: '#fff', fontWeight: 'bold', marginBottom: '10px' }}>Duration compared to other Sessions</Typography>
            <Gauge
                {...durSettings}
                cornerRadius="50%"
                sx={(theme) => ({
                    [`& .${gaugeClasses.valueText}`]: {
                    fontSize: 40,
                    },
                    [`& .${gaugeClasses.valueArc}`]: {
                    fill: '#52b202',
                    },
                    [`& .${gaugeClasses.referenceArc}`]: {
                    fill: theme.palette.text.disabled,
                    },
                })}
                text={
                  ({ value, valueMax }) => `${value.toFixed(0)} / ${valueMax.toFixed(0)}`
               }
                />
                <Typography variant="h5" gutterBottom sx={{ color: '#fff', fontWeight: 'bold', marginBottom: '10px' }}>Duration: {duration} hours</Typography>
                <Typography variant="h5" gutterBottom sx={{ color: '#fff', fontWeight: 'bold', marginBottom: '10px' }}>
                  Grade: <span style={{ fontSize: '24px', color: getGradeColor(calculateGrade()) }}>{calculateGrade()}</span>
                </Typography>
            </Grid>
          </Paper>

        </Grid>
    </Box>
  );
};

export default DriveSenseDashboard;

