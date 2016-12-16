app.controller('exploreCtrl', function($scope, $rootScope, $http, $translate, $location, ipcRenderer) {

	$scope.explore = {
		queryId: null,
		loading: true,
		search: "",
		wallpapers: [],
		retreive: function(uriType){
			this.queryId = this.makeId();
			this.wallpapers = [];
			this.loading = true;
			//tell the server to send Data
			ipcRenderer.send("retreiveData", $scope.explore.queryId, uriType, $scope.explore.search, $rootScope.settings.values.explore.excludedSources);
		},
		setWallpaper: function(wallpapers){
			ipcRenderer.sendSync("setWallpaper", wallpapers);
		},
		makeId: function(){
			var text = "";
			var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
			for( var i=0; i < 5; i++ )
					text += possible.charAt(Math.floor(Math.random() * possible.length));

			return text;
		}
	};

	ipcRenderer.on("wallpaper", function(event, wallpaper, queryId){
		if(queryId !== $scope.explore.queryId){
			return;
		}
		$scope.explore.wallpapers.push(wallpaper);
		if(!$scope.$$phase) {
			$scope.$apply();
		}
	});

	ipcRenderer.on("queryEnd", function(event, queryId){
		if(queryId !== $scope.explore.queryId){
			return;
		}
		$scope.explore.loading = false;
	});

	$scope.random = function() {
    return 0.5 - Math.random();
  };

	//retreive data
	$scope.explore.retreive();

});
