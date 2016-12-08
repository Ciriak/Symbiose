app.controller('exploreCtrl', function($scope, $rootScope, $http, $translate, $location, ipcRenderer) {

	$scope.explore = {
		source: null,
		loading: true,
		search: "",
		wallpapers: [],
		retreive: function(uriType){
			this.wallpapers = [];
			this.loading = true;
			//tell the server to send Data
			ipcRenderer.send("retreiveData", uriType, $scope.explore.search);
		},
		setWallpaper: function(wallpapers){
			ipcRenderer.sendSync("setWallpaper", wallpapers);
		}
	};

	ipcRenderer.on("wallpaper", function(event, wallpaper){
		$scope.explore.wallpapers.push(wallpaper);
		if(!$scope.$$phase) {
			$scope.$apply();
		}
	});

	ipcRenderer.on("queryEnd", function(event){
		$scope.explore.loading = false;
	});

	$scope.random = function() {
    return 0.5 - Math.random();
  };

	//retreive data
	$scope.explore.retreive();

});
