app.controller('sourceCtrl', function($scope, $rootScope, $http, $translate, $location) {

	/* Final format expected
	{
		source : {
			name: "/r/earthporn",
			label: "Reddit Earthporn",
			icon: "mdi-reddit",
			wallpapers:[
				{
					id: 01021457,
					label: "Lorem ipsum",
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


	$scope.gallery = {
		uri: "https://www.artstation.com/projects.json?page=1&sorting=trending",
		wallpapers: []
	};
});
