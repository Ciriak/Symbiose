console.log('Wallpaper process spawned !');

var async = require('async');
var Jimp = require("jimp");
var nodeWallpaper = require('wallpaper');

//parent process order to start the process
process.on('message', function(m){
  createWallpaper(m.options.wallpapers, m.options.screens, m.options.settings, function(){
    console.log("k");
  });
});

function createWallpaper(wallpapers, screens, settings, callback){

  var stacks = [];
  var frame = {
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0
  };

  //error reporting
  process.on('uncaughtException', function (err) {
    console.log(err);
  });

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

  console.log("Creating a wallpaper with "+screens.length+" frames from :");
  for (i = 0; i < screens.length; i++) {
    var tv = wallpapers[0];
    stacks.push(createWallpaperFrame(screens[i], wallpapers[0], i, settings));

    //send the first item to the last position
    wallpapers.splice(0, 1);
    wallpapers.push(tv);
  }

  async.parallel(stacks, function(err, images) {
    if(err){
      console.log(err);
      return callback(err);
    }

    console.log("Assembing...");
    var generated = new Jimp(frame.width, frame.height, function (err, generated) {
      if(err){
        console.log(err);
        return callback(err);
      }
      for (var i = 0; i < images.length; i++) {
        var x = screens[i].bounds.x+frame.offsetX;
        var y = screens[i].bounds.y+frame.offsetY;
        generated.composite( images[i], x, y );
      }
      console.log("Saving the generated image...");
      generated.write(settings.local.tempDir+"\\wallpaper.jpg", function(r){
        console.log(r);
        nodeWallpaper.set(settings.local.tempDir+"\\wallpaper.jpg");
        console.log("...done");
        return callback();
      });
    });

  });
}

var createWallpaperFrame = function(screen, wallpaper, index, settings, callback){
  console.log(wallpaper.localUri);
  var u = wallpaper.localUri.replace('%localDir%', settings.local.syncedPath);
  return function(callback){
    Jimp.read(u, function (err, image) {
      if(err){
        console.log(err);
        return callback(err, null);
      }
      image.cover(screen.size.width, screen.size.height);
      console.log("Frame "+index+" ready.");
      image.write(settings.local.tempDir+"\\frame_"+index+".jpg", function(r, e){
        return callback(null, image);
      });

    });
  };
};
