app.controller('assistantCtrl', function($scope, $rootScope, $http, $translate, $location, app, ipcRenderer, dialog) {

  $rootScope.settings.settingsFile = {
    valid: false,
    select: function(){
      var path = dialog.showOpenDialog({properties: ['createDirectory', 'openDirectory'], filters: [{name: 'Custom File Type', extensions: ['json']}]});
      //if a path has been selected
      if(path){
        //check if the file exist
        $rootScope.settings.values.local.syncedPath = path[0];
        var rsf = path[0]+"\\symbiose.json";
        if(ipcRenderer.sendSync("exist", rsf)){
          this.valid = true;
          $rootScope.settings.values = ipcRenderer.sendSync("getJson", $rootScope.settings.values.local.localSettingsFile);
          $rootScope.settings.values.local.syncedPath = path[0];
          $rootScope.settings.save();
        }
        else{
          if(ipcRenderer.sendSync("createFile", rsf)){
            $rootScope.settings.values = ipcRenderer.sendSync("getJson", $rootScope.settings.values.local.localSettingsFile);
            $rootScope.settings.values.local.syncedPath = path[0];
            $rootScope.settings.save();
          }
          else{
            //can't create here
            //todo handle error
          }
        }
  		}
    }
  };
});
