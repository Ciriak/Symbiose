app.controller('sourceCtrl', function($scope, $rootScope, $http, $translate, $location) {

	$scope.gallery = {
		source: null,
		loading: true,
		preview: {
			show: false,
			set: function(wallpaper){
				$scope.gallery.preview.wallpaper = wallpaper;
				$scope.gallery.preview.show = true;
				if(!$scope.$$phase) {
		      $scope.$apply();
		    }
			},
			close: function(){
				$scope.gallery.preview.wallpaper = null;
				$scope.gallery.preview.show = false;
			}
		},
		retreive: function(sourceName){
			this.loading = true;
			//Create wallpaper object
			if(!$scope.sources[sourceName].wallpapers){
				$scope.sources[sourceName].wallpapers = [];
			}
			//don't redo the request if already done
			if($scope.sources[sourceName].wallpapers.length > 0){
				$scope.gallery.source = $scope.sources[sourceName];
				return;
			}

			var s = $scope.sources[sourceName];

			//Start the request
			$http({
			  method: 'GET',
			  url: s.api.base
			}).then(function successCallback(response) {
				var wp = objectPath.get(response.data, s.api.wallpapers.path);
				for (var i = 0; i < wp.length; i++) {
					var w = {};
					w.title = objectPath.get(wp[i], s.api.wallpapers.title);
					//pass through all properties and assign them following the model
					for (var prop in s.api.wallpapers) {
						if (s.api.wallpapers.hasOwnProperty(prop)) {
							if(prop !== "path"){
								w[prop] = objectPath.get(wp[i], s.api.wallpapers[prop]);
							}
						}
					}
					$scope.sources[$rootScope.currentSource].wallpapers.push(w);
		    }

				$scope.gallery.loading = false;
		  }, function errorCallback(response) {
		    console.log("Error while retreiving data !");
		  });

		}
	};

	$scope.gallery.retreive($rootScope.currentSource);

});
