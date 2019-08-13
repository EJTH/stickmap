const { app, BrowserWindow, ipcMain, ipcRenderer, dialog } = require('electron');
let logQueue = [];
const JoystickMapper = require('./src/mapper/JoystickMapper');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function log(str, obj){
  if(win) win.webContents.send('log', {str: str, obj:obj});
  else logQueue.push({str:str,obj:obj});
}

log("Starting StickMap...");

let mapper = new JoystickMapper(function(id){
  if(win) win.webContents.send('activeProfile', id);
}, log);

// This is used for serializing configs for the front end.
Function.prototype.toJSON = function(){return this.toString()}

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({ width: 800, height: 600 });
  win.setMenu(null);
  // and load the index.html of the app.
  win.loadFile('./src/ui/index.html');

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('devicesInfo', mapper.getDevices());
    logQueue.forEach(function(l){
      win.webContents.send('log', l);
    });
    logQueue = [];
  });

  ipcMain.on('getDeviceStates', (event, arg) => {
     event.sender.send('deviceStates', {
       device: arg,
       axisStates: mapper.getAxisStates(),
       buttonStates: mapper.getButtonStates()
     });
  });

  ipcMain.on('getProfiles', (event, arg) => {
    event.sender.send('profiles', /* Ensure JSON stringification is used. Electron uses its own serializer it seems */ JSON.parse(JSON.stringify(mapper.getConfigs())));
    event.sender.send('defaultProfile', mapper.getDefaultConfig())
  });

  ipcMain.on('getActiveProfile', (event, arg) => {
    event.sender.send('activeProfile', mapper.getActiveConfig())
  });

  ipcMain.on('saveConfig', (event, config) => {
    mapper.saveConfig(config);
    mapper.loadConfigs();
    event.sender.send('profiles', /* Ensure JSON stringification is used. Electron uses its own serializer it seems */ JSON.parse(JSON.stringify(mapper.getConfigs())));
  });

  ipcMain.on('deleteConfig', (event, fn) => {
    var del = dialog.showMessageBox({
      type: 'question',
      title: 'Delete Profile?',
      message: 'Are you sure?',
      buttons: ['Cancel','Delete'],
    })
    if(del) mapper.deleteConfig(fn);
    mapper.loadConfigs();
    event.sender.send('profiles', /* Ensure JSON stringification is used. Electron uses its own serializer it seems */ JSON.parse(JSON.stringify(mapper.getConfigs())));
  });

  ipcMain.on('setActiveConfigById', (event, id) => {
    mapper.setActiveConfigById(id);
  });

  ipcMain.on('setEnabled', (event, enabled) => {
    mapper.setEnabled(enabled);
  });

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
  console.log(process.argv)
  if(process.argv.indexOf('--dev') > -1) win.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
