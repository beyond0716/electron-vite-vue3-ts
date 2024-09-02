import { contextBridge, ipcRenderer, shell } from 'electron';
import type { MessageBoxOptions } from 'electron';
// import { electronAPI } from '@electron-toolkit/preload';

const api = {
  // 安装证书
  installLicence: () => ipcRenderer.send('install-licence'),
  // 以桌面的默认方式打开给定的文件
  openPath: (path: string) => shell.openPath(path),
  // electron-store的api
  store: {
    get(key) {
      return ipcRenderer.sendSync('electron-store-get', key);
    },
    set(property, val) {
      ipcRenderer.send('electron-store-set', property, val);
    }
    // Other method you want to add like has(), reset(), etc.
  },
  // 下载详情页数据
  downloadOne: (url: string) => ipcRenderer.send('download-one', url),
  // 消息弹框
  showMessageBox: (options: MessageBoxOptions) => ipcRenderer.send('show-message-box', options),
  // 输出日志
  outputLog: (callback) => ipcRenderer.on('output-log', callback)
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    // contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
