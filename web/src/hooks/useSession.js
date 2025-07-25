import { useState, useCallback, useEffect } from 'react';

export const useSession = () => {
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load session history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('zlremote-session-history');
    if (saved) {
      try {
        setSessionHistory(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load session history:', error);
      }
    }
  }, []);

  // Save session history to localStorage
  const saveSessionHistory = useCallback((sessions) => {
    try {
      localStorage.setItem('zlremote-session-history', JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save session history:', error);
    }
  }, []);

  // Esta función NO debe crear sesiones reales
  const createSession = useCallback(async (config = {}) => {
    setIsLoading(true);
    try {
      // Solo crear un objeto de sesión local
      const session = {
        id: 'PENDING', // El ID real vendrá del desktop
        type: 'host',
        config,
        createdAt: Date.now(),
        status: 'pending'
      };

      setCurrentSession(session);
      return session;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinSession = useCallback(async (sessionId, password = '') => {
    setIsLoading(true);
    try {
      const session = {
        id: sessionId,
        type: 'viewer',
        password,
        joinedAt: Date.now(),
        status: 'connecting'
      };

      setCurrentSession(session);
      
      // Add to history
      const newHistory = [session, ...sessionHistory.filter(s => s.id !== sessionId)].slice(0, 10);
      setSessionHistory(newHistory);
      saveSessionHistory(newHistory);

      return session;
    } catch (error) {
      console.error('Failed to join session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [sessionHistory, saveSessionHistory]);

  const leaveSession = useCallback(() => {
    if (currentSession) {
      // Update session in history
      const updatedHistory = sessionHistory.map(session => 
        session.id === currentSession.id 
          ? { ...session, status: 'ended', endedAt: Date.now() }
          : session
      );
      setSessionHistory(updatedHistory);
      saveSessionHistory(updatedHistory);
    }
    
    setCurrentSession(null);
  }, [currentSession, sessionHistory, saveSessionHistory]);

  const updateSession = useCallback((updates) => {
    if (currentSession) {
      const updatedSession = { ...currentSession, ...updates };
      setCurrentSession(updatedSession);
    }
  }, [currentSession]);

  return {
    currentSession,
    sessionHistory,
    isLoading,
    createSession,
    joinSession,
    leaveSession,
    updateSession,
    setSessionHistory // Exportar esto también
  };
};