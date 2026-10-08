import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api, getToken, Me, SESSION_EXPIREE, setToken } from './api';
import Connexion from './pages/Connexion';
import ChangerMdp from './pages/ChangerMdp';
import Pointage from './pages/Pointage';
import AdminCadre from './pages/admin/Cadre';
import Registre from './pages/admin/Registre';
import Agents from './pages/admin/Agents';
import Zone from './pages/admin/Zone';
import Journal from './pages/admin/Journal';

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [pret, setPret] = useState(false);

  const charger = useCallback(async () => {
    if (getToken()) {
      try {
        setMe(await api<Me>('/me'));
      } catch {
        setMe(null);
      }
    } else setMe(null);
    setPret(true);
  }, []);

  useEffect(() => {
    charger();
    const sortir = () => setMe(null);
    window.addEventListener(SESSION_EXPIREE, sortir);
    return () => window.removeEventListener(SESSION_EXPIREE, sortir);
  }, [charger]);

  const deconnexion = () => {
    setToken(null);
    setMe(null);
  };

  if (!pret) return null;
  if (!me) return <Connexion onConnecte={charger} />;
  if (me.doitChangerMdp) return <ChangerMdp me={me} onFait={charger} onSortir={deconnexion} />;

  if (me.role === 'EMPLOYEE')
    return (
      <Routes>
        <Route path="*" element={<Pointage me={me} recharger={charger} onSortir={deconnexion} />} />
      </Routes>
    );

  const accueil = me.role === 'TECH' ? '/zone' : '/registre';
  return (
    <Routes>
      <Route element={<AdminCadre me={me} onSortir={deconnexion} />}>
        {me.role === 'ADMIN' && (
          <>
            <Route path="/registre" element={<Registre />} />
            <Route path="/agents" element={<Agents me={me} />} />
            <Route path="/journal" element={<Journal />} />
          </>
        )}
        <Route path="/zone" element={<Zone />} />
        <Route path="*" element={<Navigate to={accueil} replace />} />
      </Route>
    </Routes>
  );
}
