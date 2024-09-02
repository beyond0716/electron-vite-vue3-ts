import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
// import { updateElectronApp } from 'update-electron-app';
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import type { MessageBoxOptions } from 'electron';
import Store from 'electron-store';
import * as AnyProxy from 'anyproxy';
import * as os from 'os';
import path from 'path';
import { Worker } from 'worker_threads';
import * as child_process from 'child_process';
import * as iconv from 'iconv-lite';
import { NodeWorkerResponse, DlEventEnum, NwrEnum, DownloadOption } from './service.js';
import log from './log.js';

// updateElectronApp();

const __dirname = dirname(fileURLToPath(import.meta.url));

const exec = child_process.exec;
const store = new Store();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require('electron-squirrel-startup')) {
//   app.quit();
// }

let mainWindow: BrowserWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1800,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
      // sandbox: false
      // nodeIntegration: true
    }
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    console.log('🚀 ~ createWindow ~ MAIN_WINDOW_VITE_DEV_SERVER_URL:', MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
  setDefaultSetting();

  createWindow();

  // CA证书处理
  createCAFile();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // 安装证书
  ipcMain.on('install-licence', () => {
    installCAFile(path.join(<string>store.get('caPath'), 'rootCA.crt'));
  });

  // electron-store的api
  ipcMain.on('electron-store-get', (event, val) => {
    event.returnValue = store.get(val);
  });

  ipcMain.on('electron-store-set', async (_event, key, val) => {
    // logger.info('change setting', key, val);
    store.set(key, val);
  });

  // 消息弹框
  ipcMain.on('show-message-box', (event, options: MessageBoxOptions) => {
    const _win = BrowserWindow.fromWebContents(event.sender);
    if (_win) {
      dialog.showMessageBox(_win, options);
    }
  });

  // 根据url下载单篇文章
  ipcMain.on('download-one', (_event, url: string) => downloadOne(url));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/*
 * 创建CA证书
 * 如果没有创建ca证书，则创建，默认目录在C:\Users\xxx\.anyproxy\certificates
 */
function createCAFile() {
  if (!AnyProxy.utils.certMgr.ifRootCAFileExists()) {
    AnyProxy.utils.certMgr.generateRootCA((error, keyPath) => {
      if (!error) {
        const certDir = path.dirname(keyPath);
        log.info('CA证书创建成功，路径：', certDir);
        // 安装证书
        installCAFile(path.join(certDir, 'rootCA.crt'));
      } else {
        log.error('CA证书创建失败', error);
        dialog.showMessageBox(mainWindow, {
          type: 'error',
          message: '证书创建失败'
        });
      }
    });
  }
}

/**
 * 安装ca证书
 * @param filePath 证书路径
 */
function installCAFile(filePath: string) {
  // 如果是window系统，则自动安装证书
  if (process.platform === 'win32') {
    exec(`certutil -addstore root ${filePath}`, { encoding: 'buffer' }, (err, _stdout, stderr) => {
      if (err) {
        log.error('CA证书安装失败-stderr', iconv.decode(stderr, 'cp936'));
        log.error('CA证书安装失败-err', err);
        dialog.showMessageBox(mainWindow, {
          type: 'error',
          message: '证书安装失败，请以管理员身份运行本软件重新安装证书或手动安装'
        });
      } else {
        log.info('CA证书安装成功');
        dialog
          .showMessageBox(mainWindow, {
            type: 'info',
            message: '证书安装成功，准备重启软件'
          })
          .then(() => {
            app.relaunch();
            app.exit();
          });
      }
    });
  } else {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      message: '不是window系统，请手动安装'
    });
  }
}

/*
 * 下载单个页面
 */
async function downloadOne(url: string) {
  outputLog(`正在下载文章，url：${url}`);
  // 开启线程下载
  createDlWorker(DlEventEnum.ONE, url);
}

/*
 * 创建下载文章的线程
 */
let worker;
function createDlWorker(dlEvent: DlEventEnum, data?) {
  worker = new Worker(path.join(__dirname, './downloadWorker.js'), { workerData: loadWorkerData(dlEvent, data) });

  worker.on('message', (message) => {
    const nwResp: NodeWorkerResponse = message;
    switch (nwResp.code) {
      case NwrEnum.SUCCESS:
      case NwrEnum.FAIL:
        outputLog(nwResp.message, true);
        break;
      case NwrEnum.ONE_FINISH:
        if (nwResp.message) outputLog(nwResp.message, true);
        outputLog('<hr />', true, true);
        break;
      case NwrEnum.BATCH_FINISH:
        if (nwResp.message) outputLog(nwResp.message, true);
        outputLog('<hr />', true, true);
        mainWindow.webContents.send('download-fnish');
        break;
      case NwrEnum.CLOSE:
        // 关闭线程
        worker.terminate();
        break;
      case NwrEnum.PDF:
      // html2Pdf(nwResp.data);
    }
  });

  worker.on('error', (error) => {
    console.log(error);
  });

  worker.on('exit', (exitCode) => {
    console.log(`It exited with code ${exitCode}`);
  });

  console.log('Execution in main thread');

  worker.postMessage(new NodeWorkerResponse(NwrEnum.START, ''));
}

/*
 * 获取设置中心页面的配置
 */
function loadDownloadOption(): DownloadOption {
  const downloadOption = new DownloadOption();
  for (const key in downloadOption) {
    downloadOption[key] = store.get(key);
  }
  return downloadOption;
}

// 获取nodeWorker的配置
function loadWorkerData(dlEvent: DlEventEnum, data?) {
  const connectionConfig = {
    host: <string>store.get('mysqlHost'),
    port: <number>store.get('mysqlPort'),
    user: <string>store.get('mysqlUser'),
    password: <string>store.get('mysqlPassword'),
    database: <string>store.get('mysqlDatabase'),
    charset: 'utf8mb4'
  };
  return {
    connectionConfig: connectionConfig,
    downloadOption: loadDownloadOption(),
    tableName: store.get('tableName') || 'wx_article',
    dlEvent: dlEvent,
    data: data
  };
}

/*
 * 输出日志到主页面
 * msg：输出的消息
 * append：是否追加
 * flgHtml：消息是否是html
 */
async function outputLog(msg: string, append = false, flgHtml = false) {
  mainWindow.webContents.send('output-log', msg, append, flgHtml);
}

/*
 * 第一次运行，默认设置
 */
function setDefaultSetting() {
  const default_setting: DownloadOption = {
    firstRun: false,
    // 下载来源
    dlSource: 'web',
    // 线程类型
    threadType: 'multi',
    // 下载间隔
    dlInterval: 500,
    // 单批数量
    batchLimit: 10,
    // 下载为html
    dlHtml: 1,
    // 下载为markdown
    dlMarkdown: 1,
    // 下载为pdf
    dlPdf: 0,
    // 保存至mysql
    dlMysql: 0,
    // 下载音频到本地
    dlAudio: 0,
    // 下载图片到本地
    dlImg: 0,
    // 跳过现有文章
    skinExist: 1,
    // 是否保存元数据
    saveMeta: 1,
    // 按公号名字分类
    classifyDir: 1,
    // 添加原文链接
    sourceUrl: 1,
    // 是否下载评论
    dlComment: 0,
    // 是否下载评论回复
    dlCommentReply: 0,
    // 下载范围-7天内
    dlScpoe: 'seven',
    // 缓存目录
    tmpPath: path.join(os.tmpdir(), 'wechatDownload'),
    // 在安装目录下创建文章的保存路径
    savePath: path.join(app.getPath('userData'), 'savePath'),
    // CA证书路径
    caPath: (AnyProxy as any).utils.certMgr.getRootDirPath(),
    // mysql配置-端口
    mysqlHost: 'localhost',
    mysqlPort: 3306
  };

  for (const i in default_setting) {
    sotreSetNotExit(i, default_setting[i]);
  }
}

function sotreSetNotExit(key, value): boolean {
  const oldValue = store.get(key);
  if (oldValue === '' || oldValue === null || oldValue === undefined) {
    store.set(key, value);
    log.info('setting', key, value);
    return true;
  }
  log.info('setting', key, oldValue);
  return false;
}
