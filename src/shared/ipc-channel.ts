export enum IpcChannelMapper {
  SCHEDULING_GET_INFO = 'scheduling:get-info',
  SETTINGS_GET = 'settings:get',
  SETTINGS_SAVE = 'settings:save',
  TRIGGER_CLEAR_RUN_LOGS = 'trigger:clear-run-logs',
  TRIGGER_GET_RUN_LOGS = 'trigger:get-run-logs',
  TRIGGER_OS_INSPECT = 'trigger:os-inspect',
  TRIGGER_SET_ENABLED = 'trigger:set-enabled',
  USAGE_GET_SNAPSHOT = 'usage:get-snapshot',
  USAGE_REFRESH = 'usage:refresh',
  USAGE_REFRESH_TRACKER = 'usage:refresh-tracker',
  USAGE_SET_TRACKER_PAUSED = 'usage:set-tracker-paused',
  USAGE_UPDATE = 'usage:update',
}
