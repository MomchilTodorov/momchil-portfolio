import {StrictMode} from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {PortfolioProvider} from './context.jsx';
import {validatePortfolio} from './api.js';
import App from './App.jsx';
import './styles.css';
import './showcase.css';

let initialData=null;
try{initialData=validatePortfolio(window.__PORTFOLIO__);}catch{}
const element=document.getElementById('root');
const app=<StrictMode><BrowserRouter useTransitions={false}><PortfolioProvider initialData={initialData}><App/></PortfolioProvider></BrowserRouter></StrictMode>;
if(element.dataset.prerendered==='true')hydrateRoot(element,app);
else createRoot(element).render(app);
