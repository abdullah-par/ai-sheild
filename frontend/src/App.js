import React, { useState } from 'react';
import './index.css';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import ScanPage from './pages/ScanPage';
import ResultPage from './pages/ResultPage';
import Dashboard from './pages/Dashboard';
import PhishingPage from './pages/PhishingPage';
import SteganographyPage from './pages/SteganographyPage';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [pageState, setPageState] = useState({});

  const navigate = (page, state = {}) => {
    // Only scroll to top when actually switching pages (not same-page section scrolls)
    if (page !== currentPage) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setCurrentPage(page);
    setPageState(state);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <LandingPage onNavigate={navigate} />;
      case 'scan':
        return (
          <ScanPage
            initialType={pageState.scanType || 'url'}
            onResult={(data) => navigate('result', { scanData: data })}
          />
        );
      case 'result':
        return (
          <ResultPage
            scanData={pageState.scanData || { type: 'url', value: 'example.com' }}
            onNavigate={navigate}
          />
        );
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />;
      case 'phishing':
        return <PhishingPage />;
      case 'steganography':
        return <SteganographyPage />;
      default:
        return <LandingPage onNavigate={navigate} />;
    }
  };

  return (
    <div className="app">
      <Navbar currentPage={currentPage} onNavigate={navigate} />
      <main>{renderPage()}</main>
    </div>
  );
}

export default App;
