app.controller('settingsCtrl', function($scope, $rootScope, $http, $translate, $location, app, ipcRenderer, dialog) {
  $rootScope.settings = {
    values: null,
    save: function(){
      ipcRenderer.send('saveSettings', this.values);
    },
    settingsFile : {
      valid: false,
      select: function(){
        var path = dialog.showOpenDialog({properties: ['createDirectory', 'openDirectory'], filters: [{name: 'Custom File Type', extensions: ['json']}]});
        //if a path has been selected
        if(path){
          //check if the file exist
          $rootScope.settings.values.local.remoteSettingsFile = path[0]+"\\symbiose.json";
          if(ipcRenderer.sendSync("exist", $rootScope.settings.values.local.remoteSettingsFile)){
            this.valid = true;
            $rootScope.settings.values = ipcRenderer.sendSync("getJson", $rootScope.settings.values.local.localSettingsFile);
            $rootScope.settings.save();
          }
          else{
            this.askCreate($rootScope.settings.values.local.remoteSettingsFile);
          }
    		}
      },
      askCreate: function(path){
        console.log(path);
        var resp = dialog.showMessageBox({
          type: "question",
          message: "Lorem ipsum ?",
          buttons: ["Yes", "No"],
          defaultId: 0
        });
        // if user want to create the file
        if(resp === 0){
          if(ipcRenderer.sendSync("createFile", path)){
            this.valid = false;
          }
        }
      }
    }
  }

  $rootScope.settings.values = ipcRenderer.sendSync('getSettings');

  ipcRenderer.on('settingsSaved', function(event, err){
    if(err){
      console.log(err);
    }
    else{
      console.log("settings saved");
    }

  });
});
