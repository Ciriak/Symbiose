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
const storage = require('electron-storage');
require('electron-debug')({showDevTools: true});
var regedit = require('regedit');
let mainWindow
//retreive package.json properties
var pjson = require('./package.json');
var sources = require('./sources.json');
var settings = {};
var util = require('util');
var port = 80;
var request = require('request');
var os = require('os');
var _ = require('lodash');
var bodyParser = require('body-parser');
var ws = require('windows-shortcuts');
var objectPath = require("object-path");
var probe = require('probe-image-size');
var fs = require('fs-extra');
var url = require('url');
//img buffer keys
var magic = {
    jpg: 'ffd8ffe0',
    png: '89504e47',
    gif: '47494638'
};

console.log("Symbiose V."+pjson.version);

//Define updater options
let options = {
  repo: 'Cyriaqu3/Symbiose',
  currentVersion: pjson.version
}
const updater = new GhReleases(options);

// create the "temp" folder
var tempDir = app.getPath("temp")+"/symbiose";
if (!fs.existsSync(tempDir)){
  fs.mkdirSync(tempDir);
}


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
    center: true,
    resizable : true,
    icon: __dirname + '/web/img/tgf/icon_circle.png'
  });
  mainWindow.loadURL(`file://${__dirname}/web/index.html`);
  //display the main app and close the
  mainWindow.once('ready-to-show', () => {
    //hide menu bar
    mainWindow.setMenu(null);
    mainWindow.webContents.session.clearCache(function(){ //clear cache
      mainWindow.show();
      mainWindow.focus();
      loadSettings();
      checkUpdates();
    });
  });
}

//send the wallpaper sources to the client when asked
ipc.on('sources', function(event) {
  event.returnValue = sources;
});

ipc.on('getSettings', function(event) {
  event.returnValue = settings;
});

ipc.on('exist', function(event, path) {
  var r = true;
  fs.access(path, fs.constants.R_OK | fs.constants.W_OK, function(err){
    if(err){
      r = false;
    }
    event.returnValue = r;
  });

});

ipc.on('createFile', function(event, file, data) {
  //to complete -> write data in created file
  console.log(file);
  fs.ensureFile(file, function (err) {
    if(err){
      event.returnValue = false;
    }
    else{
      event.returnValue = true;
    }
  });
});

ipc.on('saveSettings', function(event, data){
  settings = data;
  storage.set("settings", data, function(err){
    if (err) {
      console.log(err);
    }
    event.sender.send('settingsSaved', err);
  });
});


//client ask for wallpapers
ipc.on('retreiveData', function(event, uriType, search) {

  var elems = {
    added: [],
    expected: 0
  };
  var sl = [];
  for (var sourceName in sources) {
    sl.push(sources[sourceName]);
  };

  sl.forEach(function(source){
    requestData(event, elems, search, uriType, source, function() {
        console.log("Process done !");
        console.log(elems.added.length + " elements parsed");
        event.sender.send('queryEnd');
    });
  });
});

function requestData(event, elems, search, uriType, source, callback){
  //Set base if uritype is not defined
  if(!uriType){
    uriType = "base";
  }

  var currentSource = source;
  var qUrl = currentSource.api.uris[uriType];

  //apply search pattern if this is a search query
  if(uriType === "search"){
    qUrl = qUrl.replace('%1', search);
  }

  //start the request
  request({url:qUrl}, function (error, response, body) {
    if(error){
      callback(error, null);
    }

    parseData(event, elems, JSON.parse(body), currentSource, function(data){
      callback(null, body);
      return;
    });
  });
}

function parseData(event, elems, data, source, callback){
  var required = ["id", "title", "url"];
  var wp = objectPath.get(data, source.api.wallpapers.path);
  elems.expected +=  wp.length;
  for (var i = 0; i < wp.length; i++) {
    var w = {};
    w.source = source;
    //pass through all properties and assign them following the model
    var abord = false;
    for (var prop in source.api.wallpapers) {
      if(prop !== "path"){
        w[prop] = objectPath.get(wp[i], source.api.wallpapers[prop]);
        // convert / filter urls
        if(prop === "url"){
          w[prop] = filterUrl(w[prop]);
        }
        //we check if the prop is required
        if(required.indexOf(prop) > -1 && (!w[prop] || w[prop] == "")){
          //one required prop is missing, told the script to not add the wallpaper at the end of the process
          console.log("Propertie "+prop+" is missing for wallpaper "+w.id+" , abording...");
          abord = true;
        }
      }
    }

    //create an unique id for each wallpaper
    w.id = genId(source, w);
    //stop if the file alreadyExist
    if(elems.added.indexOf(w.id) > -1){
      continue;
    }

    //send the file to the main process for checking and add advanced properties
    if(!abord){

      //download the image and add additionals informations
      processWallpaper(event, w, function(err, wallpaper){
        elems.added.push(wallpaper.id);
        if(err){
          console.log(err);
        }

        //if this is the last element : callback
        if(elems.added.length === elems.expected){
          callback();
        }
      });
    }
  }
}

//filter specifics url (like imgur)
function filterUrl(url){
  //convert imgur links
  var x = /https?:\/\/imgur\.com\/(.*?)(?:[#\/].*|$)/.exec(url);
  if(x){
    url = "http://i.imgur.com/%1.jpg".replace("%1", x[1]);
  }

  //convert artstation links
  if(url.indexOf() > -1){
    url.replace("/medium/", "/large/");
  }

  return url;
}

//download wallpaper and retreive additional informations
function processWallpaper(event, wallpaper, callback){
  request({
    url : wallpaper.url,
    encoding : null
  }, function(error, response, body) {
    if (error || response.statusCode !== 200 || body === undefined) {
      console.log(error);
      callback("REQUEST_ERROR" , wallpaper);
    }

    //check if the file is an image
    var bb = body.toString('hex',0,4);
    if (bb != magic.jpg &&
        bb != magic.png &&
        bb != magic.gif) {

        callback("INVALID_FORMAT", wallpaper);
    }

    // obtain the size /type of the image
    probe(wallpaper.url).then(function (result) {
      for (var prop in result) {
        wallpaper[prop] = result[prop];
      }

      var uri = url.parse(tempDir+"/"+wallpaper.id+"."+wallpaper.type).href;
      //write the image to the disk
      fs.writeFile(uri, body, {
          encoding : null
      }, function(err) {

        if(err){

          console.log(err);

          callback("WRITE_ERROR" , wallpaper);

        }

        //save the image into the local temp folder
        wallpaper.localUri = uri;
        //send the wallpaper to the rende process
        event.sender.send('wallpaper', wallpaper);

        callback(null, wallpaper);

      });
    });
  });
}

function loadSettings(){
  var sp = "settings";
  storage.isPathExists(sp, function(exist){
    if(exist){
      storage.get(filePath, function(err, data){
        if (err) {
          console.log(err);
          return;
        }
        console.log("Settings file loaded");
        settings = data;
      });
    }
    else{
      storage.set(sp, "", function(err) {
        if (err) {
          console.error(err);
          return;
        }
        console.log("New settings file created");
        settings = {};
      });
    }
  });
}

//generate an unique id for each wallpaper
function genId(source, wallpaper){
  var i = 0;
  for (var s in sources) {
    if(sources[s].label === source.label){
      break;
    }
    i++;
  }
  return i+"-"+wallpaper.id;
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

// client request update instalation
ipc.on('installUpdate', function (fileData) {
  updater.install();
});

function rmDir(dirPath, removeSelf) {
  if (removeSelf === undefined)
    removeSelf = true;
  try { var files = ofs.readdirSync(dirPath); }
  catch(e) { return; }
  if (files.length > 0)
    for (var i = 0; i < files.length; i++) {
      var filePath = dirPath + '/' + files[i];
      if (ofs.statSync(filePath).isFile())
        fs.remove(filePath);
      else
        rmDir(filePath);
    }
  if (removeSelf)
    ofs.rmdirSync(dirPath);
}

rmDir(tempDir, false);
console.log("Temp files cleaned");
