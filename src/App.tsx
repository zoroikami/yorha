import React, { useState, useEffect } from 'react';
import { LandingView } from './components/LandingView';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';

interface User {
  nombre: string;
  email: string;
  foto: string;
  banner: string;
}

type Route = 'landing' | 'login' | 'dashboard';

const App: React.FC = () => {
  const [route, setRoute] = useState<Route>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Check session on app load
    const checkSession = async () => {
      try {
        const response = await fetch('php/session_check.php');
        const data = await response.json();
        
        if (response.ok && data.authenticated) {
          setUser(data.user);
          setRoute('dashboard');
        } else {
          // If URL params indicate auth error, route to login directly
          const params = new URLSearchParams(window.location.search);
          if (params.get('error')) {
            setRoute('login');
          }
        }
      } catch (err) {
        console.warn('Session check failed (might be running offline/without backend proxy)', err);
      } finally {
        setAppReady(true);
      }
    };

    checkSession();
  }, []);

  if (!appReady) {
    return (
      <div style={{
        height: '100vh',
        backgroundColor: '#050508',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#c5a358',
        fontFamily: "'Cinzel', serif"
      }}>
        <h2>CONECTANDO CON LA ESTACIÓN TERRESTRE...</h2>
        <div style={{
          marginTop: '20px',
          width: '200px',
          height: '2px',
          backgroundColor: '#222',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            width: '80px',
            height: '100%',
            backgroundColor: '#c5a358',
            position: 'absolute',
            animation: 'loading-pulse 1.5s infinite ease-in-out'
          }}></div>
        </div>
        <style>{`
          @keyframes loading-pulse {
            0% { left: -80px; }
            100% { left: 200px; }
          }
        `}</style>
      </div>
    );
  }

  switch (route) {
    case 'landing':
      return <LandingView onNavigate={setRoute} user={user} />;
    case 'login':
      return (
        <LoginView
          onNavigate={setRoute}
          onLoginSuccess={(userData) => {
            setUser(userData);
            setRoute('dashboard');
          }}
        />
      );
    case 'dashboard':
      if (!user) {
        setRoute('login');
        return null;
      }
      return (
        <DashboardView
          user={user}
          onLogout={() => {
            setUser(null);
            setRoute('landing');
          }}
        />
      );
    default:
      return <LandingView onNavigate={setRoute} user={user} />;
  }
};

export default App;
