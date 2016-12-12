var electron = require('electron');
var {app} = require('electron');
var Menu = electron.Menu;
var BrowserWindow = electron.BrowserWindow;
var GhReleases = require('electron-gh-releases');
var ipc = electron.ipcMain;
var ChildProcess = require('child_process');
var path = require('path');
var appFolder = path.resolve(process.execPath, '..');
var rootAtomFolder = path.resolve(appFolder, '..');
var updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
var exeName = "Symbiose.exe";
var nodeWallpaper = require('wallpaper');
require('electron-debug')({showDevTools: true});
var regedit = require('regedit');
var mainWindow;
//retreive package.json properties
var pjson = require('./package.json');
var sources = require('./sources.json');
//local settings file (default)
var settings = {
  local: {
    localSettingsFile: app.getPath("appData")+"\\"+pjson.name+"\\"+pjson.name+".json",
    syncedPath: null,
    tempDir: app.getPath("temp")+"\\"+pjson.name+"\\",
    localDir: app.getPath("appData")+"\\"+pjson.name+"\\",
    gallery: {
      wallpapers: []
    }
  }
};
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
var Jimp = require("jimp");
var async = require('async');
var schedule = require('node-schedule');
//img buffer keys
var magic = {
    jpg: 'ffd8ffe0',
    png: '89504e47',
    gif: '47494638'
};

var wallpaperJob;

console.log("Symbiose V."+pjson.version);

//Define updater options
var options = {
  repo: 'Cyriaqu3/Symbiose',
  currentVersion: pjson.version
}
var updater = new GhReleases(options);

// create the "temp" folder
var tempDir = app.getPath("temp")+"\\"+pjson.name+"\\";
var localDir = app.getPath("appData")+"\\"+pjson.name+"\\";
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

  var spawn = function(command, args) {
    let spawnedProcess, error;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
    } catch (error) {}

    return spawnedProcess;
  };

  var spawnUpdate = function(args) {
    return spawn(updateDotExe, args);
  };

  var squirrelEvent = process.argv[1];

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
          if(fs.existsSync(lnkPath[i])){
            fs.unlinkSync(lnkPath[i]);
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
          fs.access(lnkPath[i], fs.F_OK, function(err) {
              if (!err) {
                fs.unlink(lnkPath[i]);
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
  mainWindow = new BrowserWindow({
    show: false,
    center: true,
    resizable : true,
    icon: __dirname + '/web/img/tgf/icon_circle.png'
  });
  mainWindow.loadURL('file://${__dirname}/web/index.html');
  //display the main app and close the
  mainWindow.once('ready-to-show', function(){
    //hide menu bar
    mainWindow.setMenu(null);
     //clear cache
    mainWindow.webContents.session.clearCache(function(){
      mainWindow.show();
      mainWindow.focus();
      initApp(function(){
        checkUpdates();
      });

    });
  });
}

function initApp(callback){
  checkSettings(function(openAssistant){

    // open the app with the assistant
    if(openAssistant === true){
      return callback();
    }

    //scan the wallpapers then open the app and start wallpaper job
    checkWallpapers(function(){
      launchWallpaperJob();
      return callback();
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

//return the converted localUri to the client
ipc.on('getLocalUri', function(event, uri){
  var u = uri.replace('%localDir%', localDir);
  var r = url.parse(u).href;
  event.returnValue = r;
});

ipc.on('getJson', function(event, path) {
  fs.readJson(path, function (err, result) {
    if(err){
      event.returnValue = false;
      return;
    }
    event.returnValue = result;
  });
});

ipc.on('createFile', function(event, file, data) {
  //to complete -> write data in created file
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
  fs.writeJson(settings.local.localSettingsFile, data, function(err){
    if(err){
      console.log(err);
    }
    if(settings.local.syncedPath){
      var syncedData = {};
      for (var prop in data) {
        if(prop !== "local"){
          syncedData[prop] = data[prop];
        }
      }
      fs.writeJson(settings.local.syncedPath+"\\symbiose.json", syncedData, function (err) {
        event.sender.send('settingsSaved');
        console.log("Settings saved syncedly");
      });
    }
    else{
      event.sender.send('settingsSaved');
      console.log("Settings saved locally");
    }
  });
});

ipc.on('setFullScreen', function(event, setFullScreen){
  mainWindow.setFullScreen(setFullScreen);
  mainWindow.setAlwaysOnTop(setFullScreen);
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

ipc.on('setWallpaper', function(event, wallpapers){
  var screens = electron.screen.getAllDisplays();
  createWallpaper(wallpapers, screens, function(image){
    console.log("created");
    event.returnValue = true;
  });
});

//save a wallpaper to the user gallery
ipc.on('saveWallpaper', function(event, wallpaper){
  var lUri = settings.local.syncedPath+"\\"+wallpaper.id+"."+wallpaper.type;

  fs.copy(wallpaper.localUri, url.parse(lUri).href, function(err){
    if(err){
      console.log(err);
      event.returnValue = false;
      return;
    }
    console.log("Wallpaper downloaded");

    wallpaper.localUri = url.parse(lUri).href;
    event.sender.send('wallpaperSaved', wallpaper);
  });
});

ipc.on('removeWallpaper', function(event, wallpaper){
  fs.remove(url.parse(wallpaper.localUri).href, function (err) {
    if (err){
      console.log(err);
    }
    console.log('success!');
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
    if (error || response.statusCode !== 200 || body === undefined || body === "") {
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

function checkSettings(callback){
  //create local settings file if not exist
  fs.ensureFile(settings.local.localSettingsFile, function (err) {
    if(err){
      settings.enableAssistant = true;
      return callback(true);
    }
    var sd = fs.readJsonSync(settings.local.localSettingsFile, {throws: false});
    if(sd === null){
      fs.writeJsonSync(settings.local.localSettingsFile, settings);
      console.log("Local settings file created");
    }
    else{
      console.log("Local settings loaded");
      settings = sd;
    }
    //if syncedSettings file is available
    if(settings.local.syncedPath){
      console.log("syncedSettings file available");
      // read the synced file and override params
      sd = fs.readJsonSync(settings.local.syncedPath+"\\symbiose.json", {throws: false});

      //can't read the defined json file
      if(!sd || sd === null){
        console.log("not readable");
        settings.enableAssistant = true;
        fs.writeJsonSync(settings.local.localSettingsFile, settings);
        return callback(true);
      }

      for (var param in sd) {
        //ignore local params
        if(param === "local"){
          continue;
        }
        settings[param] = sd[param];
      }
      settings.enableAssistant = false;
      fs.writeJsonSync(settings.local.localSettingsFile, settings);
      console.log("synced settings loaded and applied");
      return callback();

    }
    //json file not defined
    else{
      console.log("not defined");
      settings.enableAssistant = true;
      fs.writeJsonSync(settings.local.localSettingsFile, settings);
      return callback(true);
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

function launchWallpaperJob(){
  var screens = electron.screen.getAllDisplays();
  if(!settings.wallpaper){
    return;
  }
  if(settings.wallpaper.changeOnStartup === true){
    console.log("Setting wallpaper (on launch)");
    createWallpaper(settings.local.gallery.wallpapers, screens, function(){
      return;
    });
  }

  var rule = new schedule.RecurrenceRule();
  rule.minute = new schedule.Range(0, 59, settings.wallpaper.changeDelay);

  wallpaperJob = schedule.scheduleJob(rule, function(){
    console.log("Setting wallpaper (timer)");
    createWallpaper(settings.local.gallery.wallpapers, screens, function(){
      //done();
    });
  });
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

function createWallpaper(wallpapers, screens, callback){
  var stacks = [];
  var frame = {
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0
  };
  //define the size of the "final" image
  var oOffsetX = frame.offsetX;
  var oOffsetY = frame.offsetY;
  for (var i = 0; i < screens.length; i++) {
    frame.width += screens[i].size.width;
    if(screens[i].size.height > frame.height){
      frame.height = screens[i].size.height;
    }
    if(screens[i].bounds.x < oOffsetX){
      frame.offsetX = Math.abs(screens[i].bounds.x);
    }
    if(screens[i].bounds.y < oOffsetY){
      frame.offsetY = Math.abs(screens[i].bounds.y);
    }
  }

  for (var i = 0; i < screens.length; i++) {
    var wIndex = Math.floor(Math.random() * wallpapers.length)
    stacks.push(createWallpaperFrame(screens[i], wallpapers[wIndex]));
  }

  async.parallel(stacks, function(err, images) {
    if(err){
      console.log(err);
      return callback(err);
    }

    var generated = new Jimp(frame.width, frame.height, function (err, generated) {
      if(err){
        console.log(err);
        return callback(err);
      }
      for (var i = 0; i < images.length; i++) {
        var x = screens[i].bounds.x+frame.offsetX;
        var y = screens[i].bounds.y+frame.offsetY;
        console.log(y);
        generated.composite( images[i], x, y );
      }
      generated.write(localDir+"\\wallpaper.jpg");
      nodeWallpaper.set(localDir+"\\wallpaper.jpg", function(){
        return callback();
      });

    });

  });
}

var createWallpaperFrame = function(screen, wallpaper, callback){
  var u = wallpaper.localUri.replace('%localDir%', localDir);
  var r = url.parse(u).href;
  return function(callback){
    Jimp.read(r, function (err, image) {
      if(err){
        console.log(err);
        return callback(err, null);
      }
      image.cover(screen.size.width, screen.size.height);
      console.log("Frame ready");
      return callback(null, image);
    });
  };
};

function rmDir(dirPath, removeSelf) {
  if (removeSelf === undefined)
    removeSelf = true;
  try { var files = fs.readdirSync(dirPath); }
  catch(e) { return; }
  if (files.length > 0)
    for (var i = 0; i < files.length; i++) {
      var filePath = dirPath + '/' + files[i];
      if (fs.statSync(filePath).isFile())
        fs.remove(filePath);
      else
        rmDir(filePath);
    }
  if (removeSelf)
    fs.rmdirSync(dirPath);
}

rmDir(tempDir, false);
console.log("Temp files cleaned");
