import { app, BrowserWindow, Menu, dialog, shell } from 'electron';
import { join } from 'node:path';
import { spawnServer, waitForHealth } from './spawnServer';
import { readConfig, writeConfig } from './config';

const isDev = !app.isPackaged;

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: '虚拟人物对话',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    await win.loadURL('http://127.0.0.1:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    await win.loadFile(join(__dirname, '../../web/dist/index.html'));
  }

  return win;
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: [
        { label: '设置', accelerator: 'CmdOrCtrl+,', click: (_, w) => w?.webContents.send('nav:settings') },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  // 引导：缺少 API Key 时弹窗
  const cfg = readConfig();
  if (!cfg.apiKey) {
    dialog.showMessageBox({
      type: 'info',
      message: '首次启动引导',
      detail: '请在「设置」中填写 MINIMAX API Key 与 baseUrl。',
    });
  }

  // 启动后端（prod 走 sqlite，不需要 docker）
  if (!isDev) {
    const child = spawnServer();
    try {
      await waitForHealth({ url: 'http://127.0.0.1:7001/health', timeoutMs: 30_000 });
    } catch (err) {
      dialog.showErrorBox('后端启动失败', (err as Error).message);
      child.kill();
      app.quit();
      return;
    }
  }

  buildMenu();
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 暴露给 preload 的简单 IPC
import { ipcMain } from 'electron';
ipcMain.handle('config:get', () => readConfig());
ipcMain.handle('config:set', (_, partial: Record<string, unknown>) => {
  const cur = readConfig();
  writeConfig({ ...cur, ...partial });
  return readConfig();
});
ipcMain.handle('app:dataDir', () => app.getPath('userData'));
