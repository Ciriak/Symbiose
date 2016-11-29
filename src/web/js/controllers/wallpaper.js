app.controller('wallpaperCtrl', function($scope, $rootScope, $http, $translate, $location, screen) {
	$scope.screens = {};
	$scope.screens.displays = screen.getAllDisplays();
	$scope.screens.dimensions = {
		totalWidth: 0,
		maxHeight: 0
	};
	for (var i = 0; i < $scope.screens.displays.length; i++) {

		$scope.screens.dimensions.totalWidth += $scope.screens.displays[i].size.width;
		if($scope.screens.displays[i].size.height > $scope.screens.dimensions.maxHeight){
			$scope.screens.dimensions.maxHeight = $scope.screens.displays[i].size.height;
		}

		$scope.screens.displays[i].wallpaper = {
			uri: "http://lorempixel.com/"+$scope.screens.displays[i].size.width+"/"+$scope.screens.displays[i].size.height+"/abstract/"
		};
	};

	for (var i = 0; i < $scope.screens.displays.length; i++) {
		var width = ($scope.screens.displays[i].size.width / $scope.screens.dimensions.totalWidth)*80;
		var ratio =	$scope.screens.displays[i].size.height / $scope.screens.displays[i].size.width;
		$scope.screens.displays[i].container = {
			width: width,
			ratio: ratio
		};
	}

	$(window).on('resize', function(){

		for (var i = 0; i < $scope.screens.displays.length; i++) {
			var item = $("#screen-"+$scope.screens.displays[i].id);
			var nw = item.width();
			var r = nw / $scope.screens.displays[i].size.width;
			var height = $scope.screens.displays[i].size.height*r;
			item.css("height", height);
		}
	});
});
