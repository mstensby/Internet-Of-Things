import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Login from './Login';
import Account from './Account';
import Data from './Data';

function App() {
  return (
  
    <Router>
      <Switch>
        <Route path="/test">
          <Account />
        </Route>
        <Route path="/account">
        <header class="hero hero--map gps-bg">
	
        <div class="gps-bg__guts">
          <div class="gps-bg__bg"></div>
          <div class="gps-bg__route"></div>
          <div class="gps-bg__marker"></div>
        </div>
        <div class="gps-bg__fade"></div>

        <h1 class="hero__title">
          DriveSense
        </h1>
        
      </header>
          <Data />
        </Route>
        <Route path="/">
          <Login />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;