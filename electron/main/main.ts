import { updateElectronApp } from 'update-electron-app'
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  MenuItem,
  globalShortcut,
} from 'electron'
import path from 'path'

updateElectronApp()

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    )
  }

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'i') {
      console.log('Pressed Control+I')
      event.preventDefault()
    }
  })

  mainWindow.webContents.openDevTools()
}

const menu = new Menu()
menu.append(
  new MenuItem({
    label: 'Electron',
    submenu: [
      {
        role: 'help',
        accelerator:
          process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Alt+Shift+I',
        click: () => {
          console.log('Electron rocks!')
        },
      },
    ],
  })
)

Menu.setApplicationMenu(menu)

app
  .whenReady()
  .then(() => {
    globalShortcut.register('Alt+CommandOrControl+J', () => {
      console.log('Electron loves global shortcuts!')
    })
  })
  .then(() => {
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
