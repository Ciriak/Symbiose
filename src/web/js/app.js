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

  $scope.setPage = function(page){
    $scope.page = page;
    if(!$scope.$$phase) {
      $scope.$apply();
    }
  };

  $scope.setSource = function(source){
    $rootScope.source = source;
    $scope.setPage(source);
  };

  //player logged
  ipcRenderer.on("updateDownloading", function(update){
    $rootScope.updateDownloading = true;
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

}]);
