app.controller('galleryCtrl', function($scope, $rootScope, $http, $translate, $location) {

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
			},
			close: function(){
				$scope.gallery.preview.wallpaper = null;
				$scope.gallery.preview.show = false;
			}
		},
		retreive: function(sourceName){
			if(!$scope.sources[sourceName]){
				return;
			}
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
				filterData(s, response, function(){
					$scope.gallery.loading = false;
				});

				$scope.gallery.loading = false;
		  }, function errorCallback(response) {
		    console.log("Error while retreiving data !");
		  });

		}
	};

	$scope.random = function() {
    return 0.5 - Math.random();
  };

	//retreive data for all sources

	for (var source in $scope.sources) {
		if ($scope.sources.hasOwnProperty(source)) {
			$scope.gallery.retreive(source);
		}
	}

	function filterData(sourceProps, data, callback){
		var required = ["id", "title", "url"];
		var wp = objectPath.get(data.data, sourceProps.api.wallpapers.path);
		for (var i = 0; i < wp.length; i++) {
			var w = {};
			//create an unique id for each wallpaper
			w.id = genId(sourceProps, w);

			//stop if the file alreadyExist
			var t = _.findIndex($scope.gallery.wallpapers, { 'id': w.id });
			if(t > -1){
				console.log("Wallpaper "+w.id+" is already in the gallery, abording...");
				continue;
			}


			//pass through all properties and assign them following the model
			var abord = false;
			for (var prop in sourceProps.api.wallpapers) {
				if(prop !== "path"){
					w[prop] = objectPath.get(wp[i], sourceProps.api.wallpapers[prop]);
					//we check if the prop is required
					if(required.indexOf(prop) > -1 && (!w[prop] || w[prop] == "")){
						//one required prop is missing, told the script to not add the wallpaper at the end of the process
						console.log("Propertie "+prop+" is missing for wallpaper "+w.id+" !");
						abord = true;
					}
				}
			}
			if(!abord){
				console.log("Adding image "+w.id+" to the gallery");
				$scope.gallery.wallpapers.push(w);
			}
		}
		callback();
	}

	function genId(source, wallpaper){
		var i = 0;
		for (var s in $scope.sources) {
			if($scope.sources[s].label === source.label){
				break;
			}
			i++;
		}
		return i+"-"+wallpaper.id;
	}

});
