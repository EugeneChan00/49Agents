// ─── 49Agents Dev Panel ───────────────────────────────────────────────────
// Activated via ?dev=true URL parameter or Ctrl+Shift+D keyboard shortcut.
// Provides simulation tools for testing every feature without a real agent.

(function() {
  'use strict';

  let panelVisible = false;
  let panelEl = null;
  let dummyPaneCounter = 0;
  let claudeStateInterval = null;
  const DUMMY_AGENT_ID = 'dev-agent-000000';
  const DUMMY_AGENT_NAME = 'DevAgent';

  function shouldActivate() {
    return new URLSearchParams(window.location.search).has('dev');
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      togglePanel();
    }
  });

  // ── Panel UI ──

  function createPanel() {
    const el = document.createElement('div');
    el.id = 'dev-panel';
    el.innerHTML = `
      <style>
        #dev-panel {
          position: fixed;
          bottom: 12px;
          right: 12px;
          width: 340px;
          max-height: 85vh;
          overflow-y: auto;
          background: rgba(20, 22, 30, 0.95);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          padding: 14px;
          z-index: 99999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 12px;
          color: rgba(255,255,255,0.85);
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        #dev-panel::-webkit-scrollbar { width: 4px; }
        #dev-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
        #dev-panel .dp-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px; padding-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        #dev-panel .dp-title { font-weight: 700; font-size: 13px; color: rgba(129,212,250,0.9); }
        #dev-panel .dp-close {
          background: none; border: none; color: rgba(255,255,255,0.4);
          cursor: pointer; font-size: 16px; padding: 2px 6px;
        }
        #dev-panel .dp-close:hover { color: rgba(255,255,255,0.8); }
        #dev-panel .dp-section { margin-bottom: 14px; }
        #dev-panel .dp-section-title {
          font-weight: 600; font-size: 10px; text-transform: uppercase;
          letter-spacing: 0.8px; color: rgba(255,255,255,0.35); margin-bottom: 6px;
        }
        #dev-panel .dp-btn {
          display: block; width: 100%; padding: 6px 10px; margin-bottom: 3px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px; color: rgba(255,255,255,0.8); font-size: 11.5px;
          cursor: pointer; text-align: left; transition: background 0.15s;
        }
        #dev-panel .dp-btn:hover { background: rgba(255,255,255,0.12); }
        #dev-panel .dp-btn:active { background: rgba(255,255,255,0.18); }
        #dev-panel .dp-btn-row { display: flex; gap: 3px; }
        #dev-panel .dp-btn-row .dp-btn { flex: 1; text-align: center; }
        #dev-panel .dp-btn.dp-danger { border-color: rgba(239,154,154,0.3); color: rgba(239,154,154,0.9); }
        #dev-panel .dp-btn.dp-danger:hover { background: rgba(239,154,154,0.15); }
        #dev-panel .dp-btn.dp-success { border-color: rgba(165,214,167,0.3); color: rgba(165,214,167,0.9); }
        #dev-panel .dp-btn.dp-success:hover { background: rgba(165,214,167,0.15); }
        #dev-panel .dp-status {
          font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 2px; padding: 3px 0;
        }
        #dev-panel .dp-select {
          width: 100%; padding: 5px 8px; margin-bottom: 3px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px; color: rgba(255,255,255,0.8); font-size: 11.5px;
        }
        #dev-panel .dp-divider {
          border-top: 1px solid rgba(255,255,255,0.06); margin: 10px 0;
        }
      </style>

      <div class="dp-header">
        <span class="dp-title">Dev Panel</span>
        <button class="dp-close" id="dp-close">x</button>
      </div>

      <!-- Agent -->
      <div class="dp-section">
        <div class="dp-section-title">Agent</div>
        <div class="dp-btn-row">
          <button class="dp-btn dp-success" id="dp-inject-agent">Inject online</button>
          <button class="dp-btn" id="dp-toggle-agent">Toggle on/off</button>
        </div>
        <div class="dp-status" id="dp-agent-status">No dummy agent</div>
      </div>

      <!-- All Pane Types -->
      <div class="dp-section">
        <div class="dp-section-title">Create Panes</div>
        <div class="dp-btn-row">
          <button class="dp-btn" id="dp-add-terminal">Terminal</button>
          <button class="dp-btn" id="dp-add-file">File</button>
          <button class="dp-btn" id="dp-add-note">Note</button>
        </div>
        <div class="dp-btn-row">
          <button class="dp-btn" id="dp-add-git-graph">Git Graph</button>
          <button class="dp-btn" id="dp-add-iframe">iFrame</button>
          <button class="dp-btn" id="dp-add-beads">Beads</button>
        </div>
        <div class="dp-btn-row">
          <button class="dp-btn" id="dp-add-folder">Folder</button>
          <button class="dp-btn" id="dp-add-all">All types</button>
        </div>
        <button class="dp-btn dp-danger" id="dp-clear-panes">Remove all dummy panes</button>
        <div class="dp-status" id="dp-pane-status">0 dummy panes</div>
      </div>

      <!-- Notification Sounds -->
      <div class="dp-section">
        <div class="dp-section-title">Notification Sounds</div>
        <div class="dp-btn-row">
          <button class="dp-btn" id="dp-sound-permission">Permission</button>
          <button class="dp-btn" id="dp-sound-question">Question</button>
          <button class="dp-btn" id="dp-sound-dismiss">Dismiss</button>
        </div>
        <div class="dp-btn-row">
          <button class="dp-btn" id="dp-sound-permission-esc">Perm (loud)</button>
          <button class="dp-btn" id="dp-sound-question-esc">Q (loud)</button>
          <button class="dp-btn" id="dp-sound-generic">Generic</button>
        </div>
      </div>

      <!-- Claude State Simulation -->
      <div class="dp-section">
        <div class="dp-section-title">Claude State Simulation</div>
        <select class="dp-select" id="dp-state-select">
          <option value="">-- Pick a state --</option>
          <option value="working">Working</option>
          <option value="idle">Idle</option>
          <option value="permission">Permission needed</option>
          <option value="question">Question</option>
          <option value="inputNeeded">Input needed</option>
        </select>
        <div class="dp-btn-row">
          <button class="dp-btn" id="dp-fire-state">Fire state</button>
          <button class="dp-btn" id="dp-cycle-states">Auto-cycle</button>
          <button class="dp-btn dp-danger" id="dp-stop-cycle">Stop</button>
        </div>
        <div class="dp-status" id="dp-state-status">Idle</div>
      </div>

      <!-- Toast Notifications -->
      <div class="dp-section">
        <div class="dp-section-title">Toast Notifications</div>
        <div class="dp-btn-row">
          <button class="dp-btn" id="dp-toast-permission">Permission</button>
          <button class="dp-btn" id="dp-toast-question">Input</button>
          <button class="dp-btn" id="dp-toast-complete">Complete</button>
        </div>
        <button class="dp-btn" id="dp-toast-custom">Custom toast...</button>
        <button class="dp-btn" id="dp-toast-flood">Flood 5 toasts</button>
      </div>

      <!-- Canvas Controls -->
      <div class="dp-section">
        <div class="dp-section-title">Canvas</div>
        <div class="dp-btn-row">
          <button class="dp-btn" id="dp-zoom-in">Zoom in</button>
          <button class="dp-btn" id="dp-zoom-out">Zoom out</button>
          <button class="dp-btn" id="dp-zoom-reset">Reset</button>
        </div>
        <div class="dp-btn-row">
          <button class="dp-btn" id="dp-minimap-toggle">Toggle minimap</button>
          <button class="dp-btn" id="dp-fit-all">Fit all panes</button>
        </div>
      </div>

      <!-- Settings & UI -->
      <div class="dp-section">
        <div class="dp-section-title">Settings & UI</div>
        <button class="dp-btn" id="dp-open-settings">Open settings modal</button>
        <button class="dp-btn" id="dp-expand-first">Expand first pane</button>
        <button class="dp-btn" id="dp-collapse">Collapse expanded</button>
      </div>

      <!-- Stress Test -->
      <div class="dp-section">
        <div class="dp-section-title">Stress Test</div>
        <button class="dp-btn" id="dp-stress-10">Create 10 panes</button>
        <button class="dp-btn" id="dp-stress-25">Create 25 panes</button>
        <button class="dp-btn dp-danger" id="dp-stress-clear">Clear all + reset canvas</button>
      </div>
    `;

    document.body.appendChild(el);
    panelEl = el;

    // ── Wire up ALL handlers ──
    const $ = (sel) => el.querySelector(sel);

    // Agent
    $('#dp-close').addEventListener('click', togglePanel);
    $('#dp-inject-agent').addEventListener('click', injectDummyAgent);
    $('#dp-toggle-agent').addEventListener('click', toggleDummyAgent);

    // Panes
    $('#dp-add-terminal').addEventListener('click', () => addDummyPane('terminal'));
    $('#dp-add-file').addEventListener('click', () => addDummyPane('file'));
    $('#dp-add-note').addEventListener('click', () => addDummyPane('note'));
    $('#dp-add-git-graph').addEventListener('click', () => addDummyPane('git-graph'));
    $('#dp-add-iframe').addEventListener('click', () => addDummyPane('iframe'));
    $('#dp-add-beads').addEventListener('click', () => addDummyPane('beads'));
    $('#dp-add-folder').addEventListener('click', () => addDummyPane('folder'));
    $('#dp-add-all').addEventListener('click', addAllPaneTypes);
    $('#dp-clear-panes').addEventListener('click', clearDummyPanes);

    // Sounds
    $('#dp-sound-permission').addEventListener('click', () => dbg().playNotificationSound('permission', 0));
    $('#dp-sound-question').addEventListener('click', () => dbg().playNotificationSound('question', 0));
    $('#dp-sound-dismiss').addEventListener('click', () => dbg().playDismissSound());
    $('#dp-sound-permission-esc').addEventListener('click', () => dbg().playNotificationSound('permission', 5));
    $('#dp-sound-question-esc').addEventListener('click', () => dbg().playNotificationSound('question', 5));
    $('#dp-sound-generic').addEventListener('click', () => dbg().playNotificationSound('other', 0));

    // Claude state
    $('#dp-fire-state').addEventListener('click', fireSelectedState);
    $('#dp-cycle-states').addEventListener('click', startCycleStates);
    $('#dp-stop-cycle').addEventListener('click', stopCycleStates);

    // Toasts
    $('#dp-toast-permission').addEventListener('click', () => showFakeToast('permission'));
    $('#dp-toast-question').addEventListener('click', () => showFakeToast('question'));
    $('#dp-toast-complete').addEventListener('click', () => showFakeToast('idle'));
    $('#dp-toast-custom').addEventListener('click', showCustomToastPrompt);
    $('#dp-toast-flood').addEventListener('click', floodToasts);

    // Canvas
    $('#dp-zoom-in').addEventListener('click', () => dbg().setZoom(dbg().state.zoom * 1.3, window.innerWidth / 2, window.innerHeight / 2));
    $('#dp-zoom-out').addEventListener('click', () => dbg().setZoom(dbg().state.zoom / 1.3, window.innerWidth / 2, window.innerHeight / 2));
    $('#dp-zoom-reset').addEventListener('click', () => { dbg().state.zoom = 1; dbg().state.panX = 0; dbg().state.panY = 0; dbg().updateCanvasTransform(); });
    $('#dp-minimap-toggle').addEventListener('click', toggleMinimap);
    $('#dp-fit-all').addEventListener('click', fitAllPanes);

    // Settings & UI
    $('#dp-open-settings').addEventListener('click', () => dbg().showSettingsModal());
    $('#dp-expand-first').addEventListener('click', expandFirstPane);
    $('#dp-collapse').addEventListener('click', () => { if (dbg().expandedPaneId) dbg().collapsePane(); });

    // Stress test
    $('#dp-stress-10').addEventListener('click', () => stressTest(10));
    $('#dp-stress-25').addEventListener('click', () => stressTest(25));
    $('#dp-stress-clear').addEventListener('click', stressClear);

    return el;
  }

  function togglePanel() {
    if (!panelEl) createPanel();
    panelVisible = !panelVisible;
    panelEl.style.display = panelVisible ? 'block' : 'none';
  }

  // ── Helpers ──

  function dbg() { return window.TC2_DEBUG; }

  function getDummyPanes() {
    return dbg().state.panes.filter(p => p._isDummy);
  }

  function updatePaneStatus() {
    const el = document.getElementById('dp-pane-status');
    if (el) el.textContent = `${getDummyPanes().length} dummy pane(s)`;
  }

  function updateAgentStatus() {
    const el = document.getElementById('dp-agent-status');
    if (!el) return;
    const dummy = dbg().agents.find(a => a.agentId === DUMMY_AGENT_ID);
    el.textContent = dummy ? `${DUMMY_AGENT_NAME}: ${dummy.online ? 'online' : 'offline'}` : 'No dummy agent';
  }

  function genId() {
    return 'dev-' + (++dummyPaneCounter).toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  // ── Fake Agent ──

  function injectDummyAgent() {
    const agents = dbg().agents;
    const existing = agents.find(a => a.agentId === DUMMY_AGENT_ID);
    if (existing) { existing.online = true; updateAgentStatus(); return; }
    agents.push({
      agentId: DUMMY_AGENT_ID, online: true, version: '0.0.0-dev',
      hostname: DUMMY_AGENT_NAME, createdAt: new Date().toISOString(),
    });
    dbg().renderHud();
    updateAgentStatus();
  }

  function toggleDummyAgent() {
    const dummy = dbg().agents.find(a => a.agentId === DUMMY_AGENT_ID);
    if (!dummy) { injectDummyAgent(); return; }
    dummy.online = !dummy.online;
    dbg().renderHud();
    updateAgentStatus();
  }

  // ── Dummy Panes ──

  const SAMPLE_GIT_COMMITS = [
    { hash: 'a1b2c3d', subject: 'feat: add dev panel for testing', author: 'dev', timestamp: Math.floor(Date.now()/1000) - 3600, parents: ['e4f5g6h'], refs: 'HEAD -> main' },
    { hash: 'e4f5g6h', subject: 'fix: resolve WebSocket reconnect loop', author: 'dev', timestamp: Math.floor(Date.now()/1000) - 7200, parents: ['i7j8k9l'], refs: '' },
    { hash: 'i7j8k9l', subject: 'refactor: extract notification module', author: 'dev', timestamp: Math.floor(Date.now()/1000) - 14400, parents: ['m0n1o2p', 'q3r4s5t'], refs: 'origin/main' },
    { hash: 'q3r4s5t', subject: 'feat: add beads issue tracking', author: 'dev', timestamp: Math.floor(Date.now()/1000) - 28800, parents: ['m0n1o2p'], refs: 'feature/beads' },
    { hash: 'm0n1o2p', subject: 'chore: update dependencies', author: 'dev', timestamp: Math.floor(Date.now()/1000) - 43200, parents: ['u5v6w7x'], refs: '' },
    { hash: 'u5v6w7x', subject: 'feat: infinite canvas with pan/zoom', author: 'dev', timestamp: Math.floor(Date.now()/1000) - 86400, parents: ['y8z9a0b'], refs: 'v0.1.0' },
    { hash: 'y8z9a0b', subject: 'initial commit', author: 'dev', timestamp: Math.floor(Date.now()/1000) - 172800, parents: [], refs: '' },
  ];

  const SAMPLE_FILE_CONTENT = `// example.js - Sample file for dev mode
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Hello from 49Agents dev mode' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
`;

  const SAMPLE_NOTE_CONTENT = `# Dev Note

This is a **dummy note** for testing the note pane renderer.

## Features to test
- Markdown rendering
- Live preview toggle
- Font size adjustment
- Image paste support

> "The best way to predict the future is to create it."

\`\`\`javascript
console.log('Hello from dev mode');
\`\`\`
`;

  function addDummyPane(type) {
    const id = genId();
    const defaults = dbg().PANE_DEFAULTS[type] || { width: 500, height: 350 };
    const offset = getDummyPanes().length * 40;

    const paneData = {
      id, type,
      x: 100 + offset + Math.random() * 100,
      y: 100 + offset + Math.random() * 80,
      width: defaults.width,
      height: defaults.height,
      zIndex: dbg().state.nextZIndex++,
      agentId: DUMMY_AGENT_ID,
      _isDummy: true,
    };

    switch (type) {
      case 'terminal':
        paneData.tmuxSession = 'dev-tmux-' + dummyPaneCounter;
        paneData.device = DUMMY_AGENT_NAME;
        break;

      case 'file':
        paneData.fileName = 'example.js';
        paneData.filePath = '/home/dev/projects/example.js';
        paneData.content = SAMPLE_FILE_CONTENT;
        paneData.device = DUMMY_AGENT_NAME;
        break;

      case 'note':
        paneData.content = SAMPLE_NOTE_CONTENT;
        paneData.fontSize = 13;
        paneData.images = [];
        break;

      case 'git-graph':
        paneData.repoPath = '/home/dev/projects/49Agents';
        paneData.repoName = '49Agents';
        paneData.device = DUMMY_AGENT_NAME;
        break;

      case 'iframe':
        paneData.url = 'https://example.com';
        break;

      case 'beads':
        paneData.projectPath = '/home/dev/projects/49Agents';
        paneData.device = DUMMY_AGENT_NAME;
        break;

      case 'folder':
        paneData.folderPath = '/home/dev/projects';
        paneData.device = DUMMY_AGENT_NAME;
        break;
    }

    dbg().state.panes.push(paneData);
    dbg().renderPane(paneData);

    // For git-graph, inject sample data after render
    if (type === 'git-graph') {
      setTimeout(() => injectGitGraphData(id), 300);
    }

    dbg().updateCanvasTransform();
    updatePaneStatus();
  }

  function addAllPaneTypes() {
    const types = ['terminal', 'file', 'note', 'git-graph', 'iframe', 'beads', 'folder'];
    types.forEach((type, i) => {
      setTimeout(() => addDummyPane(type), i * 100);
    });
  }

  function clearDummyPanes() {
    const dummies = getDummyPanes().slice(); // copy since deletePane modifies the array
    for (const pane of dummies) {
      dbg().deletePane(pane.id);
    }
    updatePaneStatus();
  }

  // ── Git Graph Sample Data Injection ──

  function injectGitGraphData(paneId) {
    const paneEl = document.getElementById(`pane-${paneId}`);
    if (!paneEl) return;

    const outputEl = paneEl.querySelector('.git-graph-output');
    const branchEl = paneEl.querySelector('.git-graph-branch');
    const statusEl = paneEl.querySelector('.git-graph-status');

    if (branchEl) branchEl.innerHTML = '<span class="git-graph-branch-name">main</span>';
    if (statusEl) statusEl.innerHTML = '<span class="git-graph-dirty">&#x25cf; 3 uncommitted</span><span class="git-graph-detail"><span class="git-detail-staged">\u2713 1</span> <span class="git-detail-modified">\u270E 2</span></span>';

    // Use the renderSvgGitGraph from TC2_DEBUG if available
    if (outputEl && typeof dbg().renderGitGraphPane === 'function') {
      // The git graph renderer expects the output element and commits array
      try {
        // Call the SVG renderer directly via the global scope
        // Since renderSvgGitGraph might not be exposed, we'll build the HTML ourselves
        buildSampleGitGraph(outputEl);
      } catch (e) {
        outputEl.innerHTML = '<div style="padding: 10px; color: rgba(255,255,255,0.5);">Sample git graph (rendering unavailable in dev mode)</div>';
      }
    }
  }

  function buildSampleGitGraph(outputEl) {
    const commits = SAMPLE_GIT_COMMITS;
    const ROW_H = 28;
    const LANE_W = 16;
    const LEFT_PAD = 12;
    const COLORS = ['#85e89d','#79b8ff','#b392f0','#ffab70','#f97583'];

    const svgWidth = LEFT_PAD + 3 * LANE_W + 8;
    const totalHeight = commits.length * ROW_H;

    // Simple lane assignment
    const lanes = [0, 0, 0, 1, 0, 0, 0]; // main lane + one branch
    const colors = [0, 0, 0, 2, 0, 0, 0];

    let paths = '';
    let nodes = '';

    for (let i = 0; i < commits.length; i++) {
      const lane = lanes[i];
      const cx = LEFT_PAD + lane * LANE_W;
      const cy = i * ROW_H + ROW_H / 2;
      const color = COLORS[colors[i]];

      nodes += `<circle cx="${cx}" cy="${cy}" r="4" fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>`;

      // Connect to parent
      if (i < commits.length - 1) {
        const parentLane = lanes[i + 1];
        const px = LEFT_PAD + parentLane * LANE_W;
        const py = (i + 1) * ROW_H + ROW_H / 2;
        if (lane === parentLane) {
          paths += `<path d="M${cx} ${cy} L${px} ${py}" stroke="${color}" stroke-width="2" fill="none" stroke-opacity="0.7"/>`;
        } else {
          const midY = cy + ROW_H * 0.8;
          paths += `<path d="M${cx} ${cy} C${cx} ${midY}, ${px} ${py - ROW_H * 0.8}, ${px} ${py}" stroke="${COLORS[colors[i+1]]}" stroke-width="2" fill="none" stroke-opacity="0.7"/>`;
        }
      }
      // Merge line from branch
      if (i === 2) {
        const bx = LEFT_PAD + 1 * LANE_W;
        const by = 3 * ROW_H + ROW_H / 2;
        paths += `<path d="M${bx} ${by} C${bx} ${by - ROW_H * 0.8}, ${cx} ${cy + ROW_H * 0.8}, ${cx} ${cy}" stroke="${COLORS[2]}" stroke-width="2" fill="none" stroke-opacity="0.7"/>`;
      }
    }

    function relTime(ts) {
      const diff = Math.floor(Date.now() / 1000) - ts;
      if (diff < 3600) return Math.floor(diff / 60) + 'm';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h';
      return Math.floor(diff / 86400) + 'd';
    }

    const rowsHtml = commits.map((c, i) => {
      let refs = '';
      if (c.refs) {
        c.refs.split(',').map(r => r.trim()).filter(Boolean).forEach(ref => {
          if (ref.startsWith('HEAD -> ')) refs += `<span class="gg-ref gg-ref-head">${ref.replace('HEAD -> ','')}</span>`;
          else if (ref.startsWith('origin/')) refs += `<span class="gg-ref gg-ref-remote">${ref}</span>`;
          else if (ref.startsWith('v')) refs += `<span class="gg-ref gg-ref-tag">${ref}</span>`;
          else refs += `<span class="gg-ref gg-ref-branch">${ref}</span>`;
        });
      }
      return `<div class="gg-row" style="height:${ROW_H}px">
        <div class="gg-graph-spacer" style="width:${svgWidth}px"></div>
        <div class="gg-info">
          <span class="gg-hash" style="color:${COLORS[colors[i]]}">${c.hash}</span>
          <span class="gg-time">${relTime(c.timestamp)}</span>
          ${refs}
          <span class="gg-subject">${c.subject}</span>
          <span class="gg-author">${c.author}</span>
        </div>
      </div>`;
    }).join('');

    outputEl.innerHTML = `
      <div class="gg-scroll-container">
        <svg class="gg-svg" width="${svgWidth}" height="${totalHeight}" viewBox="0 0 ${svgWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">
          ${paths}${nodes}
        </svg>
        <div class="gg-rows">${rowsHtml}</div>
      </div>`;
  }

  // ── Claude State Simulation ──

  function fireSelectedState() {
    const select = document.getElementById('dp-state-select');
    const state = select?.value;
    if (!state) return;
    fireStateOnDummies(state);
  }

  function fireStateOnDummies(claudeState) {
    const dummies = getDummyPanes().filter(p => p.type === 'terminal');
    if (dummies.length === 0) {
      fireSingleState('dev-sim-terminal', claudeState);
      return;
    }
    for (const pane of dummies) fireSingleState(pane.id, claudeState);
    const statusEl = document.getElementById('dp-state-status');
    if (statusEl) statusEl.textContent = `Fired: ${claudeState}`;
  }

  function fireSingleState(terminalId, claudeState) {
    const payload = {};
    payload[terminalId] = {
      isClaude: true, state: claudeState,
      location: { name: '/dev/simulated/project' },
      claudeSessionId: 'dev-session-001',
      claudeSessionName: 'Dev Session',
    };
    dbg().updateClaudeStates(payload);
  }

  const CYCLE_STATES = ['working', 'permission', 'working', 'question', 'working', 'idle'];
  let cycleIndex = 0;

  function startCycleStates() {
    stopCycleStates();
    cycleIndex = 0;
    fireCycleStep();
    claudeStateInterval = setInterval(fireCycleStep, 5000);
    document.getElementById('dp-state-status').textContent = 'Cycling states...';
  }

  function fireCycleStep() {
    fireStateOnDummies(CYCLE_STATES[cycleIndex % CYCLE_STATES.length]);
    cycleIndex++;
  }

  function stopCycleStates() {
    if (claudeStateInterval) { clearInterval(claudeStateInterval); claudeStateInterval = null; }
    const el = document.getElementById('dp-state-status');
    if (el) el.textContent = 'Stopped';
  }

  // ── Toast Notifications ──

  function showFakeToast(claudeState) {
    const dummies = getDummyPanes().filter(p => p.type === 'terminal');
    const termId = dummies.length > 0 ? dummies[0].id : 'dev-toast-' + Date.now();
    const configs = {
      permission: { title: 'Needs permission', icon: '\uD83D\uDD11', priority: 'high' },
      question:   { title: 'Needs input',      icon: '\u2753',       priority: 'high' },
      idle:       { title: 'Task complete',     icon: '\u2705',       priority: 'medium' },
    };
    const cfg = configs[claudeState] || configs.idle;
    dbg().showToast(termId, cfg.title, DUMMY_AGENT_NAME, '/dev/simulated', cfg.icon, cfg.priority, claudeState, { location: { name: '/dev/simulated' } });
  }

  function showCustomToastPrompt() {
    const title = prompt('Toast title:', 'Custom notification');
    if (!title) return;
    const state = prompt('Claude state (working/idle/permission/question):', 'working');
    if (!state) return;
    dbg().showToast('dev-custom-' + Date.now(), title, DUMMY_AGENT_NAME, '/dev/custom', '\uD83D\uDD14', 'medium', state);
  }

  function floodToasts() {
    const states = ['permission', 'question', 'idle', 'permission', 'question'];
    states.forEach((s, i) => {
      setTimeout(() => {
        const id = 'dev-flood-' + Date.now() + '-' + i;
        showFakeToast(s);
      }, i * 400);
    });
  }

  // ── Canvas Controls ──

  function toggleMinimap() {
    // Toggle by hiding/showing
    const minimap = document.getElementById('minimap');
    if (minimap) {
      if (minimap.style.display === 'none') {
        dbg().startMinimapLoop();
      } else {
        dbg().hideMinimap();
      }
    }
  }

  function fitAllPanes() {
    const panes = dbg().state.panes;
    if (panes.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of panes) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x + p.width > maxX) maxX = p.x + p.width;
      if (p.y + p.height > maxY) maxY = p.y + p.height;
    }
    const bw = maxX - minX + 100;
    const bh = maxY - minY + 100;
    const zoom = Math.min(window.innerWidth / bw, window.innerHeight / bh, 1.5);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    dbg().state.zoom = zoom;
    dbg().state.panX = window.innerWidth / 2 - cx * zoom;
    dbg().state.panY = window.innerHeight / 2 - cy * zoom;
    dbg().updateCanvasTransform();
  }

  // ── Expand/Collapse ──

  function expandFirstPane() {
    const panes = dbg().state.panes;
    if (panes.length > 0) dbg().expandPane(panes[0].id);
  }

  // ── Stress Test ──

  function stressTest(count) {
    const types = ['terminal', 'file', 'note', 'git-graph', 'iframe'];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        addDummyPane(types[i % types.length]);
      }, i * 50);
    }
  }

  function stressClear() {
    clearDummyPanes();
    dbg().state.zoom = 1;
    dbg().state.panX = 0;
    dbg().state.panY = 0;
    dbg().updateCanvasTransform();
  }

  // ── Init ──

  if (shouldActivate()) {
    const waitForDebug = setInterval(() => {
      if (window.TC2_DEBUG) {
        clearInterval(waitForDebug);
        createPanel();
        panelVisible = true;
        panelEl.style.display = 'block';
        console.log('[DevPanel] Activated. Press Ctrl+Shift+D to toggle.');
      }
    }, 200);
  }
})();
