import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoadingPage from './pages/LoadingPage';
import HowItWorksPage from './pages/HowItWorksPage';
import RoutePlanner from './pages/RoutePlanner';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/loading" element={<LoadingPage />} />
        <Route path="/planner" element={<RoutePlanner />} />
        <Route path="/share" element={<RoutePlanner />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
      </Routes>
    </Router>
  );
}

export default App;
