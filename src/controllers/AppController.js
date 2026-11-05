/** Coordinates UI events and services. It owns no MQTT or localization algorithms. */
export class AppController {
  constructor({ view, connectionService, localizationService, messageLogService, simulationService }) {
    this.view = view;
    this.connectionService = connectionService;
    this.localizationService = localizationService;
    this.messageLogService = messageLogService;
    this.simulationService = simulationService;
    this.positionSource = null;
    this.searchQuery = '';

    this.connectionService.setHandlers({
      onStatus: (status, detail) => this.view.showConnection(status, detail),
      onTopic: (topic) => this.view.showSavedTopic(topic),
      onMessage: (topic, payload) => this.onIncomingMessage(topic, payload),
      onError: (error) => this.view.showToast(`MQTT error: ${error.message}`)
    });

    this.view.bindActions({
      onOpenSettings: () => this.view.showSettings(this.connectionService.getSavedConfig()),
      onUsePublicBroker: () => this.view.showSettings(this.connectionService.getDefaultConfig()),
      onCloseSettings: () => this.view.hideSettings(),
      onConnect: (config) => this.connect(config),
      onConnectButton: () => this.toggleConnection(),
      onSearch: (query) => { this.searchQuery = query; this.renderLogs(); },
      onClearLogs: () => this.clearLogs(),
      onDownloadLogs: () => this.view.downloadJson(this.messageLogService.exportMessages()),
      onResetMap: () => this.resetMap(),
      onToggleSimulation: () => this.toggleSimulation()
    });

    this.view.showSavedTopic(this.connectionService.getSavedConfig()?.topic);
    this.renderLogs();
    this.view.resetMap();
  }

  connect(config) {
    try {
      this.connectionService.connect(config);
      this.view.hideSettings();
    } catch (error) {
      this.view.showConnection('disconnected');
      this.view.showToast(error.message);
    }
  }

  toggleConnection() {
    if (this.connectionService.isConnected) {
      this.connectionService.disconnect();
      this.view.showConnection('disconnected');
      this.view.showToast('Disconnected from broker.');
      return;
    }
    this.view.showSettings(this.connectionService.getSavedConfig());
  }

  onIncomingMessage(topic, payload) {
    const message = this.messageLogService.record(topic, payload);
    this.view.renderMessageReceived(message.receivedAt);
    this.renderLogs();
  }

  // A future cloud-result adapter calls this explicitly; raw MQTT never calls it.
  onLocalizationResult(result, receivedAt = new Date().toISOString()) {
    if (!result || !Number.isFinite(result.x) || !Number.isFinite(result.y)) return;
    this.simulationService?.pause();
    this.view.showSimulationState(false);
    if (this.positionSource !== 'cloud') this.localizationService.reset();
    this.positionSource = 'cloud';
    this.renderResult(result, receivedAt, 'cloud');
  }

  renderResult(result, receivedAt, source) {
    const update = this.localizationService.processResult(result);
    if (update) this.view.renderPosition(update.position, update.points, update.displayPayload, receivedAt, source);
  }

  toggleSimulation() {
    if (!this.simulationService) return;
    if (this.simulationService.isRunning) {
      this.simulationService.pause();
      this.view.showSimulationState(false, true);
      return;
    }
    if (this.positionSource !== 'simulation') {
      this.localizationService.reset();
      this.simulationService.reset();
      this.positionSource = 'simulation';
      this.renderResult(this.simulationService.position, new Date().toISOString(), 'simulation');
    }
    this.simulationService.run((position) => {
      this.renderResult(position, new Date().toISOString(), 'simulation');
    });
    this.view.showSimulationState(true);
  }

  renderLogs() {
    this.view.renderLogs(this.messageLogService.getMessages(this.searchQuery), this.messageLogService.count);
  }

  clearLogs() {
    this.messageLogService.clear();
    this.renderLogs();
    this.view.showToast('Logs cleared.');
  }

  resetMap() {
    this.simulationService?.reset();
    this.positionSource = null;
    this.view.showSimulationState(false);
    this.localizationService.reset();
    this.view.resetMap();
    this.view.showToast('Map position and path reset.');
  }
}
