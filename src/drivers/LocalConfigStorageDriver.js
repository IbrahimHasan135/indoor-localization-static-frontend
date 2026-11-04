/** Persists non-secret connection settings in this browser. */
export class LocalConfigStorageDriver {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.key = 'atlas.mqtt.config.v1';
  }

  load() {
    try {
      const config = JSON.parse(this.storage.getItem(this.key) || 'null');
      return config?.url && config?.topic ? config : null;
    } catch {
      this.storage.removeItem(this.key);
      return null;
    }
  }

  save(config) {
    const { url, topic, username = '' } = config;
    this.storage.setItem(this.key, JSON.stringify({ url, topic, username }));
  }
}
