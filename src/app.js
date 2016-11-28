const electron = require('electron');
const {app} = require('electron');
const Menu = electron.Menu;
const BrowserWindow = electron.BrowserWindow;
const GhReleases = require('electron-gh-releases');
const ipc = electron.ipcMain;
const ChildProcess = require('child_process');
const path = require('path');
const appFolder = path.resolve(process.execPath, '..');
const rootAtomFolder = path.resolve(appFolder, '..');
const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
const exeName = "Symbiose.exe";
require('electron-debug')({showDevTools: true});
var regedit = require('regedit');
let mainWindow
//retreive package.json properties
var pjson = require('./package.json');
var ofs = require('fs');  // old fs
var util = require('util');
var port = 80;
var request = require('request');
var os = require('os');
var _ = require('lodash');
var bodyParser = require('body-parser');
var ws = require('windows-shortcuts');

console.log("Symbiose V."+pjson.version);

  //Define updater options
  let options = {
    repo: 'Cyriaqu3/Symbiose',
    currentVersion: pjson.version
  }
  const updater = new GhReleases(options);


// Hook the squirrel update events
if (handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

function handleSquirrelEvent() {
  if (process.argv.length === 1) {
    return false;
  }

  const spawn = function(command, args) {
    let spawnedProcess, error;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
    } catch (error) {}

    return spawnedProcess;
  };

  const spawnUpdate = function(args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];

  var exePath = app.getPath("exe");
  var lnkPath = ["%APPDATA%/Microsoft/Windows/Start Menu/Programs/Symbiose.lnk",
  "%UserProfile%/Desktop/Symbiose.lnk"];

  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      //write in the registry if windows OS
      if(process.platform === 'win32') {
        registerRegistry();
      }

      // Install desktop and start menu shortcuts


      //create windows shortcuts (remove previous if existing)
      if(process.platform === 'win32') {
        for (var i = 0; i < lnkPath.length; i++) {

          //remove shortcut if exist
          if(ofs.existsSync(lnkPath[i])){
            ofs.unlinkSync(lnkPath[i]);
          }

          //create new shortcut
          ws.create(lnkPath[i], {
              target : exePath,
              desc : pjson.description
          });
        }
      }
      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers
      spawnUpdate(['--removeShortcut', exeName]);

      // Remove desktop and start menu shortcuts
      if(process.platform === 'win32') {
        for (var i = 0; i < lnkPath.length; i++) {
          ofs.access(lnkPath[i], ofs.F_OK, function(err) {
              if (!err) {
                ofs.unlink(lnkPath[i]);
              }
          });
        }
      }

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      app.quit();
      return true;
  }
};

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});



app.on('ready', () => {
  openApp();
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    openApp();
  }
});

//open the tagifier main process
function openApp(){
  var mainWindow = new BrowserWindow({
    show: false,
    skipTaskbar : true,
    center: true,
    resizable : true,
    icon: __dirname + '/web/img/tgf/icon_circle.png'
  });
  mainWindow.loadURL(`file://${__dirname}/web/index.html`);
  //display the main app and close the
  mainWindow.once('ready-to-show', () => {
    //hide menu bar
    mainWindow.setMenu(null);
    mainWindow.show();
    mainWindow.focus();
    checkUpdates();
  });
}

var fidOpt = {
  TIMEOUT : 2000, // timeout in ms
  ALLOWED_TYPES : ['jpg', 'png'] // allowed image types
};

// create the "exports" folder
var p = app.getPath("temp")+"/tagifier";
if (!ofs.existsSync(p)){
    ofs.mkdirSync(p);
}

function checkUpdates(){

  // Check for updates
  // `status` returns true if there is a new update available
  console.log("Looking for update");
  updater.check((err, status) => {
    if(err){
      console.log("No new version / unable to check");
      console.log("details :");
      console.log(err);
    }
    //update available
    else{
      // Download the update
      updater.download();
      ipc.emit("updateDownloading");
    }
  });

  // When an update has been downloaded
  updater.on('update-downloaded', (info) => {
    console.log(info);
    ipc.emit("updateAvailable", info);
  })
}

function checkScreens(){

}

// client request update instalation
ipc.on('installUpdate', function (fileData) {
  updater.install();
});

//client request screen infos
ipc.on('screensInfos', function(){
  var screens = electron.screen.getAllDisplays();
  console.log("Sending screen info to the client");
  console.log(screens);
  ipc.emit("screens", screens);
});
