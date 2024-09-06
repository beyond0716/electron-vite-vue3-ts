import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
// import { updateElectronApp } from 'update-electron-app';
import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import type { MessageBoxOptions, OpenDialogOptions } from 'electron';
import Store from 'electron-store';
import electronUpdater, { type AppUpdater, type UpdateInfo } from 'electron-updater';
import * as AnyProxy from 'anyproxy';
import * as os from 'os';
import path from 'path';
import { Worker } from 'worker_threads';
import * as child_process from 'child_process';
import * as iconv from 'iconv-lite';
import * as mysql from 'mysql2';
import { NodeWorkerResponse, DlEventEnum, NwrEnum, DownloadOption } from './service.js';
import log from './log.js';
import type { IUpdateMessage } from './types.js';

// updateElectronApp();

export function getAutoUpdater(): AppUpdater {
  // Using destructuring to access autoUpdater due to the CommonJS module of 'electron-updater'.
  // It is a workaround for ESM compatibility issues, see https://github.com/electron-userland/electron-builder/issues/7976.
  const { autoUpdater } = electronUpdater;
  return autoUpdater;
}
const autoUpdater = getAutoUpdater();

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

  // 打开日志文件夹
  ipcMain.on('open-logs-dir', () => {
    shell.openPath(path.join(app.getPath('appData'), 'wechatDownload', 'logs'));
  });

  // electron-store的api
  ipcMain.on('electron-store-get', (event, val) => {
    event.returnValue = store.get(val);
  });

  ipcMain.on('electron-store-set', async (_event, key, val) => {
    // logger.info('change setting', key, val);
    store.set(key, val);
  });

  // 选择路径
  ipcMain.on('show-open-dialog', (event, options: OpenDialogOptions, callbackMsg: string) => {
    const _win = BrowserWindow.fromWebContents(event.sender);
    if (_win) {
      dialog
        .showOpenDialog(_win, options)
        .then((result) => {
          if (!result.canceled) {
            // 路径信息回调
            event.sender.send('open-dialog-callback', callbackMsg, result.filePaths[0]);
            store.set(callbackMsg, result.filePaths[0]);
          }
        })
        .catch((err) => {
          log.error(err);
        });
    }
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

  // 测试数据库连接
  ipcMain.on('test-connect', async () => testMysqlConnection());

  // 检查更新
  ipcMain.on('check-for-update', () => {
    log.info('触发检查更新');
    autoUpdater.checkForUpdates();
  });

  // 返回初始化页面需要的信息
  ipcMain.on('load-init-info', (event) => {
    // 暂时只需要版本号
    event.returnValue = app.getVersion();
  });
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
 * 测试mysql数据库连接
 */
async function testMysqlConnection() {
  if (1 != store.get('dlMysql') && 'db' != store.get('dlSource')) return;

  const CONNECTION = mysql.createConnection({
    host: <string>store.get('mysqlHost'),
    port: <number>store.get('mysqlPort'),
    user: <string>store.get('mysqlUser'),
    password: <string>store.get('mysqlPassword'),
    database: <string>store.get('mysqlDatabase'),
    charset: 'utf8mb4'
  });
  const sql = 'show tables';
  CONNECTION.query(sql, (err) => {
    if (err) {
      log.error('mysql连接失败', err);
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        message: '连接失败，请检查参数'
      });
    } else {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        message: '连接成功'
      });
    }
    return CONNECTION;
  });
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

// 定义返回给渲染层的相关提示文案
const updateMessage = {
  error: { code: 1, msg: '检查更新出错' },
  checking: { code: 2, msg: '正在检查更新……' },
  updateAva: { code: 3, msg: '检测到新版本，正在下载……' },
  updateNotAva: { code: 4, msg: '现在使用的就是最新版本，不用更新' }
};

function sendUpdateMessage(msg: IUpdateMessage) {
  mainWindow.webContents.send('update-msg', msg);
}

// 设置自动下载为false，也就是说不开始自动下载
autoUpdater.autoDownload = false;

// 检测下载错误
autoUpdater.on('error', (error) => {
  log.error('更新异常', error);
  sendUpdateMessage(updateMessage.error);
});

// 检测是否需要更新
autoUpdater.on('checking-for-update', () => {
  log.info(updateMessage.checking);
  sendUpdateMessage(updateMessage.checking);
});

// 检测到可以更新时
autoUpdater.on('update-available', (releaseInfo: UpdateInfo) => {
  const releaseNotes = releaseInfo.releaseNotes;
  let releaseContent = '';
  if (releaseNotes) {
    if (typeof releaseNotes === 'string') {
      releaseContent = <string>releaseNotes;
    } else if (releaseNotes instanceof Array) {
      releaseNotes.forEach((releaseNote) => {
        releaseContent += `${releaseNote}\n`;
      });
    }
  } else {
    releaseContent = '暂无更新说明';
  }
  dialog
    .showMessageBox({
      type: 'info',
      title: '应用有新的更新',
      detail: releaseContent,
      message: '发现新版本，是否现在更新？',
      buttons: ['否', '是']
    })
    .then(({ response }) => {
      if (response === 1) {
        sendUpdateMessage(updateMessage.updateAva);
        // 下载更新
        autoUpdater.downloadUpdate();
      }
    });
});

// 检测到不需要更新时
autoUpdater.on('update-not-available', () => {
  log.info(updateMessage.updateNotAva);
  sendUpdateMessage(updateMessage.updateNotAva);
});

// 更新下载进度
autoUpdater.on('download-progress', (progress) => {
  mainWindow.webContents.send('download-progress', progress);
});

// 当需要更新的内容下载完成后
autoUpdater.on('update-downloaded', () => {
  log.info('下载完成，准备更新');
  dialog
    .showMessageBox({
      title: '安装更新',
      message: '更新下载完毕，应用将重启并进行安装'
    })
    .then(() => {
      // 退出并安装应用
      setImmediate(() => autoUpdater.quitAndInstall());
    });
});
