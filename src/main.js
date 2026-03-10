import './styles/global.css';
import './styles/components.css';
import './styles/charts.css';
import { route, startRouter } from './router.js';
import { supabase } from './supabase.js';

// Pages
import LoginPage from './pages/Login.js';
import OverviewPage from './pages/Overview.js';
import CallsPage from './pages/Calls.js';
import PipelinePage from './pages/Pipeline.js';
import LeaderboardPage from './pages/Leaderboard.js';
import AgentPage from './pages/Agent.js';
import SettingsPage from './pages/Settings.js';

// Register routes
route('/login', LoginPage);
route('/', OverviewPage);
route('/calls', CallsPage);
route('/pipeline', PipelinePage);
route('/leaderboard', LeaderboardPage);
route('/agent/:id', AgentPage);
route('/settings', SettingsPage);

// Start app
startRouter();

// Listen for auth state changes
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    window.location.hash = '#/login';
  }
});
