import {createContext, useContext, useEffect, useState} from 'react';
import {loadPortfolio} from './api.js';

const PortfolioContext = createContext(null);
export function PortfolioProvider({initialData, children}) {
  const [data,setData] = useState(initialData || null);
  const [status,setStatus] = useState(initialData ? 'ready' : 'loading');
  const [attempt,setAttempt] = useState(0);
  useEffect(()=>{
    const controller = new AbortController();
    setStatus(data ? 'refreshing' : 'loading');
    loadPortfolio({base:import.meta.env.VITE_WP_API_BASE || '/api/',signal:controller.signal})
      .then(fresh=>{setData(fresh);setStatus('ready');})
      .catch(error=>{if(error.name!=='AbortError')setStatus('error');});
    return ()=>controller.abort();
  },[attempt]);
  return <PortfolioContext.Provider value={{data,status,retry:()=>setAttempt(n=>n+1)}}>{children}</PortfolioContext.Provider>;
}
export function usePortfolio(){return useContext(PortfolioContext);}
