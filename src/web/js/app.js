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

app.controller('mainCtrl', ['$scope', '$http','$rootScope','$translate','$window','$location', function($scope, $http,$rootScope,$translate,$window,$location)
{
  $scope.page = "wallpapers";   //default page

  $rootScope.remote = require('electron').remote;
  $rootScope.ipc = $rootScope.remote.ipcMain;

  //player logged
  $rootScope.ipc.on("updateDownloading", function(update){
    $rootScope.updateDownloading = true;
    if(!$scope.$$phase) {
      $scope.$apply();
    }
  });

  $rootScope.ipc.on("updateAvailable", function(){
    $rootScope.updateAvailable = true;
    if(!$scope.$$phase) {
      $scope.$apply();
    }
  });

  $rootScope.installUpdate = function(){
    $rootScope.ipc.emit("installUpdate");
  }

}]);
