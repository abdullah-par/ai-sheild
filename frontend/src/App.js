import React, { useState } from 'react';
import './index.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import ScanPage from './pages/ScanPage';
import ResultPage from './pages/ResultPage';
import Dashboard from './pages/Dashboard';
import PhishingPage from './pages/PhishingPage';
import SteganographyPage from './pages/SteganographyPage';
import AuthPage from './pages/AuthPage';
import FloatingChatbot from './components/FloatingChatbot';
import { AuthProvider } from './services/AuthContext';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [pageState, setPageState] = useState({});
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const navigate = (page, state = {}) => {
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
      case 'auth':
        return <AuthPage onNavigate={navigate} initialMode={pageState.mode} />;
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
        return <PhishingPage onNavigate={navigate} />;
      case 'steganography':
        return <SteganographyPage onNavigate={navigate} />;
      default:
        return <LandingPage onNavigate={navigate} />;
    }
  };

  return (
    <div className={`app ${theme}`}>
      <Navbar 
        currentPage={currentPage} 
        onNavigate={navigate} 
        theme={theme} 
        toggleTheme={toggleTheme} 
      />
      <main>{renderPage()}</main>
      <Footer onNavigate={navigate} />
      <FloatingChatbot />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
