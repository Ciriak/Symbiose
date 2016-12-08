var app = angular.module('symbiose', [
'ui.bootstrap',
'ngSanitize',
'pascalprecht.translate',
'angular-electron'
    ]);

app.config(['$translateProvider', function($translateProvider) {
  $translateProvider.useStaticFilesLoader({
    prefix: 'locales/',
    suffix: '.json'
  });
  var remote = require('electron').remote;
  var lang = remote.app.getLocale();
  $translateProvider.preferredLanguage(lang).fallbackLanguage('en');
}]);

app.filter("trustUrl", ['$sce', function ($sce) { //used by media player
    return function (recordingUrl) {
        return $sce.trustAsResourceUrl(recordingUrl);
    };
}]);

app.controller('mainCtrl', ['$scope', '$http', '$rootScope', '$translate' ,'$window', '$location', 'ipcRenderer', function($scope, $http, $rootScope, $translate, $window, $location, ipcRenderer)
{
  $scope.page = "wallpapers";   //default page

  ipcRenderer.send("retreiveLocalGallery");

  $scope.setPage = function(page){
    console.log("Setting page "+page);
    $scope.page = page;
    if(!$scope.$$phase) {
      $scope.$apply();
    }
  };

  //player logged
  ipcRenderer.on("updateDownloading", function(update){
    $rootScope.updateDownloading = true;
    if(!$scope.$$phase) {
      $scope.$apply();
    }
  });

  ipcRenderer.on("gallery", function(gallery){
    $rootScope.gallery = gallery;
    if(!$scope.$$phase) {
      $scope.$apply();
    }
  });

  ipcRenderer.on("updateAvailable", function(){
    $rootScope.updateAvailable = true;
    if(!$scope.$$phase) {
      $scope.$apply();
    }
  });

  $rootScope.installUpdate = function(){
    ipcRenderer.send("installUpdate");
  }

  $rootScope.sources = ipcRenderer.sendSync('sources');
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
  };

  //retreive the settings
  $rootScope.settings = {};
  $rootScope.settings.values = ipcRenderer.sendSync('getSettings');
  if(!$scope.$$phase) {
    $scope.$apply();
  }

}]);
