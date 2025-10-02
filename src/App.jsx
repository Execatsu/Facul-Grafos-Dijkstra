import { BrowserRouter as Router} from 'react-router-dom';
import { Toaster } from "./components/ui/toaster";

import AppRoutes from './routes/AppRoutes';

import "./App.css";

export default function App() {
    return (
        <div className="App min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <Router>
                <AppRoutes/>
                <Toaster />
            </Router>
        </div>
    )
}
        