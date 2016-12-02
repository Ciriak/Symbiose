app.controller('sourceCtrl', function($scope, $rootScope, $http, $translate, $location) {

	$scope.gallery = {
		source: null,
		preview: {
			set: function(wallpaper){
				console.log('set');
				$scope.gallery.preview.wallpaper = wallpaper;
				console.log($scope.gallery.preview.wallpaper);
				if(!$scope.$$phase) {
		      $scope.$apply();
		    }
			},
			close: function(){
				$scope.gallery.preview.wallpaper = null;
			}
		}
	};

	/* Final format expected
  {
    source : {
      name: "/r/earthporn",
      label: "Reddit Earthporn",
      icon: "mdi-reddit",
      wallpapers:[
        {
          id: 01021457,
          title: "Lorem ipsum",
          description: "Lorem ipsum",
          format: {
            width: 550,
            height: 300
          },
          url: "http://lorempisum.com/15521.jpg"
        }
      ]
    }
  }

  */


  /*
  Retreive data from available sources below
  */

  $scope.retreive = {
		"artStation": function(){
			console.log("retreiving wallpapers...");
			$http({
			  method: 'GET',
			  url: 'https://www.artstation.com/projects.json?page=1&sorting=picks'
			}).then(function successCallback(response) {
        var r = {
          name: "artStation",
          label: "Art Station",
          icon: "mdi-buffer",
          wallpapers: []
        };

        for (var i = 0; i < response.data.data.length; i++) {
          var wd = response.data.data[i];
          var wallpaper = {
            title: wd.title,
            description: wd.description,
            author: wd.user.username
          }

					if(!wd.cover.small_image_url){
						continue;
					}
					wallpaper.url = wd.cover.medium_image_url.replace("/medium/", "/large/");

          r.wallpapers.push(wallpaper);
        }
				$scope.gallery.source = r;
				console.log($scope.gallery);

			  }, function errorCallback(response) {
					console.log("error");
			  });
		}
	};

	$scope.retreive[$rootScope.source]();

});
