app.controller('galleryCtrl', function($scope, $rootScope, $http, $translate, $location, ipcRenderer) {

	$scope.gallery = {
		source: null,
		loading: true,
		search: "",
		wallpapers: [],
		preview: {
			show: false,
			set: function(wallpaper){
				console.log(wallpaper);
				$scope.gallery.preview.wallpaper = wallpaper;
				$scope.gallery.preview.show = true;
				if(!$scope.$$phase) {
		      $scope.$apply();
		    }
				ipcRenderer.sendSync("setWallpaper", wallpaper);
			},
			close: function(){
				$scope.gallery.preview.wallpaper = null;
				$scope.gallery.preview.show = false;
			}
		},
		retreive: function(uriType){
			this.wallpapers = [];
			this.loading = true;
			//tell the server to send Data
			ipcRenderer.send("retreiveData", uriType, $scope.gallery.search);
		}
	};

	ipcRenderer.on("wallpaper", function(event, wallpaper){
		$scope.gallery.wallpapers.push(wallpaper);
		if(!$scope.$$phase) {
			$scope.$apply();
		}
	});

	ipcRenderer.on("queryEnd", function(event){
		$scope.gallery.loading = false;
	});

	$scope.random = function() {
    return 0.5 - Math.random();
  };

	//retreive data
	$scope.gallery.retreive();

});
