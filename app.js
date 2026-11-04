(() => {
  const $ = (selector) => document.querySelector(selector);
  const els = {
    modal: $('#settingsModal'), form: $('#connectionForm'), status: $('#connectionStatus'), detail: $('#connectionDetail'),
    topic: $('#topicSummary'), last: $('#lastUpdate'), strip: $('.status-strip'), marker: $('#positionMarker'), coords: $('#markerCoords'),
    x: $('#xValue'), y: $('#yValue'), path: $('#pathLine'), logRows: $('#logRows'), logCount: $('#logCount'), logFoot: $('#logFoot'),
    latest: $('#latestData'), empty: $('#emptyUpdate'), updateCount: $('#updateCount'), toast: $('#toast')
  };
  const state = { client: null, config: null, logs: [], points: [], updateCount: 0, toastTimer: null };
  const storageKey = 'atlas.mqtt.config.v1';

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.remove('hidden');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 3000);
  }
  function setConnected(connected, message) {
    els.strip.classList.toggle('connected', connected);
    els.status.textContent = connected ? 'Connected to broker' : (message || 'Not connected');
    els.detail.textContent = connected ? 'Receiving live messages from your MQTT topic' : 'Configure your MQTT broker to start receiving data';
    $('#connectButton').innerHTML = connected ? '<span>↗</span> Disconnect' : '<span>↗</span> Connect broker';
  }
  function openModal() {
    els.modal.classList.remove('hidden');
    if (state.config) {
      els.form.elements.url.value = state.config.url || '';
      els.form.elements.topic.value = state.config.topic || '';
      els.form.elements.username.value = state.config.username || '';
      els.form.elements.password.value = '';
    }
  }
  function closeModal() { els.modal.classList.add('hidden'); }
  function connect(config) {
    if (!window.mqtt) { toast('MQTT client failed to load. Check your internet connection.'); return; }
    if (state.client) { state.client.end(true); state.client = null; }
    const options = { clean: true, connectTimeout: 10000, reconnectPeriod: 3000 };
    if (config.username) options.username = config.username;
    if (config.password) options.password = config.password;
    setConnected(false, 'Connecting…');
    els.detail.textContent = `Connecting to ${config.url}`;
    try {
      const client = mqtt.connect(config.url, options);
      state.client = client;
      client.on('connect', () => {
        client.subscribe(config.topic, { qos: 0 }, (error) => {
          if (error) { toast(`Subscribe failed: ${error.message}`); return; }
          setConnected(true);
          els.topic.textContent = config.topic;
          toast('Broker connected and topic subscribed.');
        });
      });
      client.on('message', (topic, payload) => receiveMessage(topic, payload.toString()));
      client.on('reconnect', () => setConnected(false, 'Reconnecting…'));
      client.on('close', () => { if (state.client === client) setConnected(false); });
      client.on('error', (error) => toast(`MQTT error: ${error.message}`));
    } catch (error) {
      setConnected(false);
      toast(`Could not connect: ${error.message}`);
    }
  }
  function parsePosition(payload) {
    let data;
    try { data = JSON.parse(payload); } catch (_) { return null; }
    // Accept {x,y}, {position:{x,y}}, or {location:{x,y}}. The positioning algorithm
    // is intentionally outside this frontend; it only consumes reported coordinates.
    const candidate = data.position || data.location || data;
    const x = Number(candidate.x), y = Number(candidate.y);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  }
  function receiveMessage(topic, payload) {
    const log = { receivedAt: new Date().toISOString(), topic, payload };
    state.logs.unshift(log);
    renderLogs();
    els.last.textContent = new Date(log.receivedAt).toLocaleTimeString('id-ID', { hour12: false });
    const position = parsePosition(payload);
    if (position) renderPosition(position, payload, log.receivedAt);
  }
  function renderPosition(point, payload, receivedAt = new Date().toISOString()) {
    const bound = (n) => Math.max(-2, Math.min(2, n));
    point = { x: bound(point.x), y: bound(point.y) };
    state.points.push(point);
    state.updateCount++;
    // Map local XY coordinates: origin is center, +Y points toward the top edge.
    const px = ((point.x + 2) / 4) * 100;
    const py = ((2 - point.y) / 4) * 100;
    els.marker.style.left = `${px}%`;
    els.marker.style.top = `${py}%`;
    els.coords.textContent = `${point.x.toFixed(2)}, ${point.y.toFixed(2)}`;
    els.x.innerHTML = `${point.x.toFixed(2)} <small>m</small>`;
    els.y.innerHTML = `${point.y.toFixed(2)} <small>m</small>`;
    els.path.setAttribute('points', state.points.map(p => `${((p.x + 2) / 4) * 100},${((2 - p.y) / 4) * 100}`).join(' '));
    els.updateCount.textContent = `${state.updateCount} update${state.updateCount === 1 ? '' : 's'}`;
    els.empty.classList.add('hidden');
    els.latest.classList.remove('hidden');
    let pretty = payload;
    try { pretty = JSON.stringify(JSON.parse(payload), null, 2); } catch (_) { /* display raw payload */ }
    els.latest.innerHTML = `<div class="received-line">${new Date(receivedAt).toLocaleTimeString('id-ID', { hour12: false })} · position accepted</div><pre class="json-preview"></pre>`;
    els.latest.querySelector('pre').textContent = pretty;
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function renderLogs() {
    const filter = $('#logSearch').value.trim().toLowerCase();
    const visible = state.logs.filter(log => !filter || `${log.topic} ${log.payload}`.toLowerCase().includes(filter));
    els.logCount.textContent = state.logs.length;
    els.logFoot.textContent = `Showing ${visible.length} of ${state.logs.length} message${state.logs.length === 1 ? '' : 's'}`;
    if (!visible.length) {
      els.logRows.innerHTML = `<div class="log-empty">${state.logs.length ? 'No messages match this filter.' : 'No messages received yet. Connect to a broker or send a test update.'}</div>`;
      return;
    }
    els.logRows.innerHTML = visible.map(log => `<div class="log-row log-entry"><span class="log-time">${escapeHtml(new Date(log.receivedAt).toLocaleTimeString('id-ID', { hour12: false }))}</span><span class="log-topic" title="${escapeHtml(log.topic)}">${escapeHtml(log.topic)}</span><span class="log-payload" title="${escapeHtml(log.payload)}">${escapeHtml(log.payload)}</span><span></span></div>`).join('');
  }
  function downloadLogs() {
    if (!state.logs.length) { toast('There are no logs to export yet.'); return; }
    const blob = new Blob([JSON.stringify(state.logs.map(log => ({ received_at: log.receivedAt, topic: log.topic, payload: parseJsonOrText(log.payload) })), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `atlas-mqtt-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click(); URL.revokeObjectURL(link.href);
  }
  function parseJsonOrText(text) { try { return JSON.parse(text); } catch (_) { return text; } }

  $('#openSettings').addEventListener('click', openModal);
  $('#settingsButton').addEventListener('click', openModal);
  $('#closeSettings').addEventListener('click', closeModal);
  $('#cancelSettings').addEventListener('click', closeModal);
  els.modal.addEventListener('click', e => { if (e.target === els.modal) closeModal(); });
  $('#connectButton').addEventListener('click', () => {
    if (state.client && state.client.connected) { state.client.end(true); state.client = null; setConnected(false); toast('Disconnected from broker.'); }
    else if (state.config) openModal(); else openModal();
  });
  els.form.addEventListener('submit', e => {
    e.preventDefault();
    const form = new FormData(els.form);
    const config = { url: String(form.get('url')).trim(), topic: String(form.get('topic')).trim(), username: String(form.get('username')).trim() };
    const password = String(form.get('password'));
    if (!/^wss?:\/\//i.test(config.url)) { toast('Broker URL must start with ws:// or wss://'); return; }
    if (!config.topic) { toast('Enter a topic to subscribe to.'); return; }
    state.config = config;
    localStorage.setItem(storageKey, JSON.stringify(config));
    closeModal(); connect({ ...config, password });
  });
  $('#logSearch').addEventListener('input', renderLogs);
  $('#clearLogs').addEventListener('click', () => { state.logs = []; renderLogs(); toast('Logs cleared.'); });
  $('#downloadLogs').addEventListener('click', downloadLogs);
  $('#downloadAll').addEventListener('click', downloadLogs);
  $('#resetMap').addEventListener('click', () => {
    state.points = []; state.updateCount = 0;
    els.marker.style.left = '50%'; els.marker.style.top = '50%';
    els.coords.textContent = '0.00, 0.00'; els.x.innerHTML = '0.00 <small>m</small>'; els.y.innerHTML = '0.00 <small>m</small>';
    els.path.setAttribute('points', ''); els.latest.classList.add('hidden'); els.empty.classList.remove('hidden');
    els.updateCount.textContent = '0 updates'; toast('Map position and path reset.');
  });

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && saved.url && saved.topic) { state.config = saved; els.topic.textContent = saved.topic; }
  } catch (_) { localStorage.removeItem(storageKey); }
  renderLogs();
})();
