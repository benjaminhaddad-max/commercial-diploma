import { requireAuth } from '../auth.js';
import { apiGet } from '../api.js';
import { renderSidebar, bindSidebarEvents } from '../components/Sidebar.js';
import { renderHeader, bindHeaderEvents } from '../components/Header.js';
import { formatDuration, formatNumber } from '../utils/numbers.js';

const PERIOD_MAP = { today: 'today', week: 'week', month: 'month', last30: '30d' };

export default async function CallsPage(app) {
  const profile = await requireAuth();
  if (!profile) return;

  let currentPeriod = 'today';

  function renderPage(calls, agents) {
    app.innerHTML = `
      <div class="dashboard-layout">
        ${renderSidebar(profile)}
        <div class="dashboard-main">
          ${renderHeader('Analytics Appels')}
          <div class="dashboard-content">
            <div class="grid grid-2" style="margin-bottom:24px;">
              <div class="card">
                <div class="card-header"><span class="card-title">Appels par agent</span></div>
                <div id="agentCallsChart" class="chart-container"></div>
              </div>
              <div class="card">
                <div class="card-header"><span class="card-title">Distribution des dur\u00e9es</span></div>
                <div id="durationChart" class="chart-container"></div>
              </div>
            </div>
            <div class="card">
              <div class="card-header">
                <span class="card-title">Journal des appels</span>
                <span style="font-size:0.75rem;color:var(--text-muted);">${calls.length} appels</span>
              </div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Direction</th>
                    <th>Dur\u00e9e</th>
                    <th>Statut</th>
                    <th>Heure</th>
                  </tr>
                </thead>
                <tbody id="callsTableBody">
                  ${renderCallRows(calls)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    bindSidebarEvents();
    bindHeaderEvents(
      (period) => { currentPeriod = period; loadData(); },
      () => loadData()
    );

    renderCharts(calls, agents);
  }

  function renderCallRows(calls) {
    if (calls.length === 0) {
      return '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">Aucun appel sur cette p\u00e9riode</td></tr>';
    }

    return calls.slice(0, 100).map(c => {
      const dirColor = c.direction === 'Sortant' ? 'var(--accent-blue)' : 'var(--accent-purple)';
      const statusColor = c.status === 'D\u00e9croch\u00e9' ? 'var(--accent-green)'
        : c.status === 'Ne r\u00e9pond pas' ? 'var(--accent-red)'
        : 'var(--accent-yellow)';

      return `
        <tr>
          <td style="font-weight:500;color:var(--text-primary);">${c.agent}</td>
          <td><span style="color:${dirColor};font-size:0.75rem;font-weight:500;">${c.direction}</span></td>
          <td>${formatDuration(c.duration)}</td>
          <td><span style="color:${statusColor};font-size:0.8125rem;">${c.status}</span></td>
          <td style="color:var(--text-muted);">${c.hour || '--:--'}</td>
        </tr>
      `;
    }).join('');
  }

  function renderCharts(calls, agents) {
    if (typeof ApexCharts === 'undefined') return;

    // Group calls by agent for charts
    const agentMap = {};
    calls.forEach(c => {
      if (!agentMap[c.agent]) {
        agentMap[c.agent] = { outbound: 0, inbound: 0, durations: [] };
      }
      if (c.direction === 'Sortant') agentMap[c.agent].outbound++;
      else agentMap[c.agent].inbound++;
      if (c.duration > 0) agentMap[c.agent].durations.push(c.duration);
    });

    const agentNames = Object.keys(agentMap);
    const outboundData = agentNames.map(n => agentMap[n].outbound);
    const inboundData = agentNames.map(n => agentMap[n].inbound);

    // Agent calls bar chart
    const agentEl = document.getElementById('agentCallsChart');
    if (agentEl && agentNames.length > 0) {
      new ApexCharts(agentEl, {
        chart: { type: 'bar', height: 280, background: 'transparent', foreColor: '#9ca3b4', fontFamily: 'Inter', toolbar: { show: false } },
        theme: { mode: 'dark' },
        colors: ['#4f8cff', '#a78bfa'],
        series: [
          { name: 'Sortants', data: outboundData },
          { name: 'Entrants', data: inboundData },
        ],
        xaxis: { categories: agentNames, axisBorder: { show: false }, axisTicks: { show: false } },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
        grid: { borderColor: 'rgba(255,255,255,0.06)', strokeDashArray: 4 },
        dataLabels: { enabled: false },
        tooltip: { theme: 'dark' },
      }).render();
    } else if (agentEl) {
      agentEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Pas de donn\u00e9es</div>';
    }

    // Duration distribution chart
    const durationEl = document.getElementById('durationChart');
    if (durationEl && agentNames.length > 0) {
      const under5 = agentNames.map(n => agentMap[n].durations.filter(d => d < 300).length);
      const from5to10 = agentNames.map(n => agentMap[n].durations.filter(d => d >= 300 && d < 600).length);
      const from10to15 = agentNames.map(n => agentMap[n].durations.filter(d => d >= 600 && d < 900).length);
      const over15 = agentNames.map(n => agentMap[n].durations.filter(d => d >= 900).length);

      new ApexCharts(durationEl, {
        chart: { type: 'bar', height: 280, background: 'transparent', foreColor: '#9ca3b4', fontFamily: 'Inter', toolbar: { show: false }, stacked: true },
        theme: { mode: 'dark' },
        colors: ['#f87171', '#fbbf24', '#4f8cff', '#34d399'],
        series: [
          { name: '< 5 min', data: under5 },
          { name: '5-10 min', data: from5to10 },
          { name: '10-15 min', data: from10to15 },
          { name: '> 15 min', data: over15 },
        ],
        xaxis: { categories: agentNames, axisBorder: { show: false }, axisTicks: { show: false } },
        plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
        grid: { borderColor: 'rgba(255,255,255,0.06)', strokeDashArray: 4 },
        dataLabels: { enabled: false },
        tooltip: { theme: 'dark' },
        legend: { position: 'top', fontSize: '12px', labels: { colors: '#9ca3b4' } },
      }).render();
    } else if (durationEl) {
      durationEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Pas de donn\u00e9es</div>';
    }
  }

  function getDateRange(period) {
    const now = new Date();
    let from;

    switch (period) {
      case 'week': {
        const dow = now.getDay() || 7;
        from = new Date(now);
        from.setDate(from.getDate() - dow + 1);
        from.setHours(0, 0, 0, 0);
        break;
      }
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last30':
        from = new Date(now);
        from.setDate(from.getDate() - 30);
        from.setHours(0, 0, 0, 0);
        break;
      default: // today
        from = new Date(now);
        from.setHours(0, 0, 0, 0);
    }

    return {
      from: Math.floor(from.getTime() / 1000),
      to: Math.floor(now.getTime() / 1000),
    };
  }

  async function loadData() {
    // Show loading
    app.innerHTML = `
      <div class="dashboard-layout">
        ${renderSidebar(profile)}
        <div class="dashboard-main">
          ${renderHeader('Analytics Appels')}
          <div class="dashboard-content">
            <div style="text-align:center;padding:60px 0;color:var(--text-muted);">Chargement des appels...</div>
          </div>
        </div>
      </div>
    `;
    bindSidebarEvents();
    bindHeaderEvents(
      (period) => { currentPeriod = period; loadData(); },
      () => loadData()
    );

    try {
      const { from, to } = getDateRange(currentPeriod);
      const data = await apiGet('aircall-calls', { from, to, source: 'db' });
      renderPage(data.calls || [], []);
    } catch (err) {
      console.error('Calls load error:', err);
      const content = document.querySelector('.dashboard-content');
      if (content) {
        content.innerHTML = `
          <div class="card" style="text-align:center;padding:40px;">
            <p style="color:var(--accent-red);margin-bottom:12px;">Erreur de chargement</p>
            <p style="color:var(--text-muted);font-size:0.875rem;">${err.message}</p>
            <button class="btn btn-primary" style="margin-top:16px;" onclick="location.reload()">R\u00e9essayer</button>
          </div>
        `;
      }
    }
  }

  loadData();
}
