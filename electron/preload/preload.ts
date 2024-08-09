import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('shell', {
  open: () => ipcRenderer.send('shell:open'),
})
