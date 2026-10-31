import {renderToString} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {PortfolioProvider} from './context.jsx';
import App from './App.jsx';

export function render(url,data){return renderToString(<MemoryRouter initialEntries={[url]}><PortfolioProvider initialData={data}><App/></PortfolioProvider></MemoryRouter>);}
