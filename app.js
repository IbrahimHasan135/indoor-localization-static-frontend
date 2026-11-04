import { AppController } from './src/controllers/AppController.js';
import { DashboardViewDriver } from './src/drivers/DashboardViewDriver.js';
import { LocalConfigStorageDriver } from './src/drivers/LocalConfigStorageDriver.js';
import { MqttClientDriver } from './src/drivers/MqttClientDriver.js';
import { LocalizationService } from './src/services/LocalizationService.js';
import { MessageLogService } from './src/services/MessageLogService.js';
import { MqttConnectionService } from './src/services/MqttConnectionService.js';

// Composition root: wire dependencies from low-level drivers to services to controller.
const mqttDriver = new MqttClientDriver(window.mqtt);
const configStorageDriver = new LocalConfigStorageDriver(window.localStorage);
const dashboardViewDriver = new DashboardViewDriver(document);

const mqttConnectionService = new MqttConnectionService(mqttDriver, configStorageDriver);
const localizationService = new LocalizationService({ min: -2, max: 2 });
const messageLogService = new MessageLogService();

new AppController({
  view: dashboardViewDriver,
  connectionService: mqttConnectionService,
  localizationService,
  messageLogService
});
