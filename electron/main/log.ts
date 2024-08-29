import log from 'electron-log';

log.transports.file.level = 'info';
log.transports.file.maxSize = 10485760; // 10M
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}';
const date = new Date();
const fileName = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '.log';
log.transports.file.fileName = fileName;

export default {
  info(...params: any[]) {
    log.info(params);
  },
  warn(...params: any[]) {
    log.warn(params);
  },
  error(...params: any[]) {
    log.error(params);
  },
  debug(...params: any[]) {
    log.debug(params);
  },
  verbose(...params: any[]) {
    log.verbose(params);
  },
  silly(...params: any[]) {
    log.silly(params);
  }
};
