app.controller('wallpaperCtrl', function($scope, $rootScope, $http, $translate, $location, ipcRenderer, shell) {
	//request the screen info to the main process
	$rootScope.ipc.emit("screensInfos");
});
