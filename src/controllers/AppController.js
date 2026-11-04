/** Coordinates UI events and services. It owns no MQTT or localization algorithms. */
export class AppController {
  constructor({ view, connectionService, localizationService, messageLogService }) {
    this.view = view;
    this.connectionService = connectionService;
    this.localizationService = localizationService;
    this.messageLogService = messageLogService;
    this.searchQuery = '';

    this.connectionService.setHandlers({
      onStatus: (status, detail) => this.view.showConnection(status, detail),
      onTopic: (topic) => this.view.showSavedTopic(topic),
      onMessage: (topic, payload) => this.onIncomingMessage(topic, payload),
      onError: (error) => this.view.showToast(`MQTT error: ${error.message}`)
    });

    this.view.bindActions({
      onOpenSettings: () => this.view.showSettings(this.connectionService.getSavedConfig()),
      onCloseSettings: () => this.view.hideSettings(),
      onConnect: (config) => this.connect(config),
      onConnectButton: () => this.toggleConnection(),
      onSearch: (query) => { this.searchQuery = query; this.renderLogs(); },
      onClearLogs: () => this.clearLogs(),
      onDownloadLogs: () => this.view.downloadJson(this.messageLogService.exportMessages()),
      onResetMap: () => this.resetMap()
    });

    this.view.showSavedTopic(this.connectionService.getSavedConfig()?.topic);
    this.renderLogs();
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
    const update = this.localizationService.processPayload(payload);
    if (update) this.view.renderPosition(update.position, update.points, update.displayPayload, message.receivedAt);
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
    this.localizationService.reset();
    this.view.resetMap();
    this.view.showToast('Map position and path reset.');
  }
}
