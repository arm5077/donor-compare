angular.module("donorApp", [])
.controller("donorController", ["$scope", "$http", function($scope, $http){
	
	$scope.Math = Math; 
	$scope.mode = "contributors";
	
	$http.get("data.json").then(function(response){
		console.log(response.data);
		$scope.candidates = response.data;
		
	}, function(err){
		if(err) throw err;
	});
	
	
	$scope.getRed = function(candidate, link){
		if( $scope.mode == "contributors" )
			var ratio = link.count / candidate.contributions_count;
		else 
			var ratio = link.sum / candidate.contributions_sum;
		
		if( ratio == 1 ) return "white";
		else if( ratio > .3 ) return "rgba(255,0,0,1)";
		else if( ratio > .2 ) return "rgba(255,0,0,.5)";
		else if( ratio > .1 ) return "rgba(255,0,0,.25)";
		else if( ratio > .05 ) return "rgba(255,0,0,.1)";
		
	};
	
}]);