/** Browser/UI adapter. It renders state and reports user actions to the controller. */
export class DashboardViewDriver {
  constructor(documentRef = document) {
    this.document = documentRef;
    this.$ = (selector) => this.document.querySelector(selector);
    this.elements = {
      modal: this.$('#settingsModal'), form: this.$('#connectionForm'), status: this.$('#connectionStatus'),
      detail: this.$('#connectionDetail'), topic: this.$('#topicSummary'), last: this.$('#lastUpdate'),
      strip: this.$('.status-strip'), marker: this.$('#positionMarker'), coords: this.$('#markerCoords'),
      x: this.$('#xValue'), y: this.$('#yValue'), path: this.$('#pathLine'), logRows: this.$('#logRows'),
      logCount: this.$('#logCount'), logFoot: this.$('#logFoot'), latest: this.$('#latestData'),
      empty: this.$('#emptyUpdate'), updateCount: this.$('#updateCount'), toast: this.$('#toast'), positionStatus: this.$('#positionStatus')
    };
    this.toastTimer = null;
  }

  bindActions(actions) {
    const e = this.elements;
    this.$('#openSettings').addEventListener('click', () => actions.onOpenSettings());
    this.$('#settingsButton').addEventListener('click', () => actions.onOpenSettings());
    this.$('#closeSettings').addEventListener('click', () => actions.onCloseSettings());
    this.$('#usePublicBroker').addEventListener('click', () => actions.onUsePublicBroker());
    this.$('#cancelSettings').addEventListener('click', () => actions.onCloseSettings());
    e.modal.addEventListener('click', (event) => { if (event.target === e.modal) actions.onCloseSettings(); });
    e.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = new FormData(e.form);
      actions.onConnect({
        url: String(values.get('url')).trim(), topic: String(values.get('topic')).trim(),
        username: String(values.get('username')).trim(), password: String(values.get('password'))
      });
    });
    this.$('#connectButton').addEventListener('click', () => actions.onConnectButton());
    this.$('#logSearch').addEventListener('input', (event) => actions.onSearch(event.target.value));
    this.$('#clearLogs').addEventListener('click', () => actions.onClearLogs());
    this.$('#downloadLogs').addEventListener('click', () => actions.onDownloadLogs());
    this.$('#downloadAll').addEventListener('click', () => actions.onDownloadLogs());
    this.$('#runSimulation').addEventListener('click', () => actions.onToggleSimulation());
    this.$('#resetMap').addEventListener('click', () => actions.onResetMap());
  }

  showSettings(config = null) {
    const form = this.elements.form;
    form.elements.url.value = config?.url || '';
    form.elements.topic.value = config?.topic || '';
    form.elements.username.value = config?.username || '';
    form.elements.password.value = '';
    this.elements.modal.classList.remove('hidden');
  }

  hideSettings() { this.elements.modal.classList.add('hidden'); }

  showConnection(status, detail = '') {
    const e = this.elements;
    const connected = status === 'connected';
    const pending = status === 'connecting' || status === 'reconnecting';
    e.strip.classList.toggle('connected', connected);
    e.status.textContent = status === 'connected' ? 'Connected to broker'
      : status === 'connecting' ? 'Connecting…'
        : status === 'reconnecting' ? 'Reconnecting…'
          : status === 'failed' ? 'Connection failed' : 'Not connected';
    e.detail.textContent = detail || (connected
      ? 'Receiving live messages from your MQTT topic'
      : 'Configure your MQTT broker to start receiving data');
    this.$('#connectButton').innerHTML = pending ? '<span>×</span> Cancel connection'
      : connected ? '<span>↗</span> Disconnect'
      : '<span>↗</span> Connect broker';
  }

  showSavedTopic(topic) { this.elements.topic.textContent = topic || 'Not configured'; }

  renderMessageReceived(timestamp) {
    this.elements.last.textContent = new Date(timestamp).toLocaleTimeString('id-ID', { hour12: false });
  }

  renderPosition(position, points, latestPayload, timestamp, source = 'cloud') {
    const e = this.elements;
    const px = ((position.x + 2) / 4) * 100;
    const py = ((2 - position.y) / 4) * 100;
    e.marker.classList.remove('hidden');
    const simulated = source === 'simulation';
    e.positionStatus.textContent = simulated ? 'SIMULATION' : 'CLOUD RESULT';
    this.$('#markerSource').textContent = simulated ? 'SIMULATED NODE' : 'CLOUD POSITION';
    this.$('#resultSource').textContent = simulated ? 'Demo preview' : 'Cloud result';
    this.$('#processingLocation').textContent = simulated ? 'Local preview' : 'In cloud';
    e.marker.style.left = `${px}%`;
    e.marker.style.top = `${py}%`;
    e.coords.textContent = `${position.x.toFixed(2)}, ${position.y.toFixed(2)}`;
    e.x.innerHTML = `${position.x.toFixed(2)} <small>m</small>`;
    e.y.innerHTML = `${position.y.toFixed(2)} <small>m</small>`;
    e.path.setAttribute('points', points.map((point) => `${((point.x + 2) / 4) * 100},${((2 - point.y) / 4) * 100}`).join(' '));
    e.updateCount.textContent = `${points.length} update${points.length === 1 ? '' : 's'}`;
    e.empty.classList.add('hidden');
    e.latest.classList.remove('hidden');
    e.latest.innerHTML = '<div class="received-line"></div><pre class="json-preview"></pre>';
    e.latest.querySelector('.received-line').textContent = `${new Date(timestamp).toLocaleTimeString('id-ID', { hour12: false })} · ${simulated ? 'simulated position' : 'position accepted'}`;
    e.latest.querySelector('pre').textContent = latestPayload;
  }

  renderLogs(logs, totalCount) {
    const e = this.elements;
    e.logCount.textContent = totalCount;
    e.logFoot.textContent = `Showing ${logs.length} of ${totalCount} message${totalCount === 1 ? '' : 's'}`;
    if (!logs.length) {
      e.logRows.innerHTML = `<div class="log-empty">${totalCount ? 'No messages match this filter.' : 'No messages received yet. Connect to a broker to receive device telemetry.'}</div>`;
      return;
    }
    e.logRows.replaceChildren(...logs.map((log) => {
      const row = this.document.createElement('div'); row.className = 'log-row log-entry';
      const time = this.document.createElement('span'); time.className = 'log-time';
      time.textContent = new Date(log.receivedAt).toLocaleTimeString('id-ID', { hour12: false });
      const topic = this.document.createElement('span'); topic.className = 'log-topic'; topic.title = log.topic; topic.textContent = log.topic;
      const payload = this.document.createElement('span'); payload.className = 'log-payload'; payload.title = log.payload; payload.textContent = log.payload;
      row.append(time, topic, payload, this.document.createElement('span'));
      return row;
    }));
  }

  resetMap() {
    const e = this.elements;
    e.marker.classList.add('hidden');
    e.positionStatus.textContent = 'AWAITING CLOUD';
    this.$('#resultSource').textContent = 'Not connected';
    this.$('#processingLocation').textContent = 'In cloud';
    e.marker.style.left = '50%'; e.marker.style.top = '50%';
    e.coords.textContent = '—, —'; e.x.innerHTML = '— <small>m</small>'; e.y.innerHTML = '— <small>m</small>';
    e.path.setAttribute('points', ''); e.latest.classList.add('hidden'); e.empty.classList.remove('hidden');
    e.updateCount.textContent = '0 updates';
  }

  showSimulationState(running, paused = false) {
    const button = this.$('#runSimulation');
    button.textContent = running ? 'Ⅱ Pause' : paused ? '▶ Resume' : '▶ Run demo';
    button.setAttribute('aria-pressed', String(running));
    this.$('.map-panel').classList.toggle('simulating', running);
    if (paused) this.elements.positionStatus.textContent = 'DEMO PAUSED';
  }

  showToast(message) {
    this.elements.toast.textContent = message;
    this.elements.toast.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.elements.toast.classList.add('hidden'), 3000);
  }

  downloadJson(data) {
    if (!data.length) { this.showToast('There are no logs to export yet.'); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = this.document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `atlas-mqtt-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click(); URL.revokeObjectURL(link.href);
  }
}
