import electron, {
    app, ipcMain,
} from 'electron'

import fs from 'fs-extra'
import path from 'path';

let root = process.env.LAUNCHER_ROOT;
const appData = app.getPath('appData');
const cfgFile = `${appData}/launcher.json`;

if (app.makeSingleInstance(() => { })) {
    app.quit();
}

function setupRoot(newRoot, oldRoot) {
    if (newRoot === oldRoot) return;
    app.setPath('userData', newRoot);
    ipcMain.emit('reload');
    fs.writeFile(cfgFile, JSON.stringify({ path: newRoot }));
}
ipcMain.on('store-ready', (store) => {
    store.watch(state => state.root, setupRoot)
})

async function setup() {
    try {
        const buf = await fs.readFile(cfgFile);
        const cfg = JSON.parse(buf.toString());
        root = cfg.path || path.join(appData, '.launcher');
    } catch (e) {
        root = path.join(appData, '.launcher');
    }
    app.setPath('userData', root);
    ipcMain.emit('reload');
}
setup();