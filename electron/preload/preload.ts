import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  startDrag: (fileName: string) => ipcRenderer.send('ondragstart', fileName),
})
