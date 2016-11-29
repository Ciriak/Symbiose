app.controller('sourceCtrl', function($scope, $rootScope, $http, $translate, $location) {
	$scope.source = {

	}
	$scope.gallery = {
		uri: "https://www.artstation.com/projects.json?page=1&sorting=trending",
		wallpapers: []
	};

	$http({
	  method: 'GET',
	  url: $scope.gallery.url
	}).then(function successCallback(response) {
		console.log(response);
  }, function errorCallback(response) {
		console.log("Error");
		console.log(response);
  });

});
