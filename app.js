var app = angular.module('TVShowManager', ['ngRoute', 'ui.bootstrap']);
app.config(['$compileProvider', function ($compileProvider) {
	$compileProvider.debugInfoEnabled(true);
}]);

app.factory('ShowQuery', ['$http', '$timeout', function($http, $timeout) {
	return new function() {
		this.search = function(name) {
				return $http.get("query.php", {params: {search: name}});
		}; 
		
		this.showinfo = function(id, force) {
			if(force)
				return $http.get("query.php", {params: {show: id, force: true}});
			else
				return $http.get("query.php", {params: {show: id}});
		};
		
		this.user_add_show = function(id) {
			return $http.post("query.php", {addshow: id});
		};
		
		this.user_del_show = function(show) {
			return $http.post("query.php", {delshow: show.id});
		};
		
		this.user_del_show = function(show) {
			return $http.post("query.php", {delshow: show.id});
		};
		
		this.login = function(user, pw, stay) {
			return $http.post("query.php", {username: user, password: pw, stay: !!stay});
		};
		
		this.login_token = function(user, token) {
			return $http.post("query.php", {username: user, token: token});
		};
		
		this.logout = function() {
			return $http.post("query.php", {logout: true});
		};
		
		this.register = function(user, pw) {
			return $http.post("query.php", {registername: user, password: pw});
		};
		
		var timer;
		this.user_show_update = function(show) {
			if(timer)
				$timeout.cancel(timer);
			timer = $timeout(function(){
				$http.post("query.php", {
					updateshow: show.id, 
					last_season: show.last_season, 
					last_episode: show.last_episode, 
					enabled: !show.done,
					favourite: show.favourite
				}, {headers : {'Content-Type': 'application/x-www-form-urlencoded'}});
			}, 500);
		};
	};
}]);

app.factory('TVShow', ['ShowQuery', function (ShowQuery) {
	return function(id, name) {
		this.id = id;
		this.name = name || 'Unknown Show';
		this.__defineGetter__('class', function() {
			switch(this.status) {
			case 'Available':
				return 'success';
			case 'Unavailable':
				return 'danger';
			case 'Disabled':
			case 'Ended':
			case 'Canceled':
				return 'active';
            case 'Undetermined':
			case 'Error':
				return 'warning';
			default:
				return '';
			};
		});
		this.status = '?';
		this.show_status = '';
		this.__defineGetter__('done', function() { 
			return this.status == 'Disabled' || this.ended;
		});
        this.__defineGetter__('disabled', function() {
            return this.status == 'Disabled';
        });
        this.__defineGetter__('first', function() {
            return this.last_episode == 1 && this.last_season == 1;
        });
		this.__defineGetter__('ended', function() { 
			return this.status == 'Ended' || this.status == 'Canceled';
		});
		this.__defineGetter__('last_ep', function() { 
			return 'S' + pad(this.last_season, 2) + ' E' + pad(this.last_episode, 2); 
		});
		this.next_ep = '';
		
		this.last_season = 1;
		this.last_episode = 1;
		this.favourite = false;
		
		this.loading = false;
		this.image = '';
		
		this.seasons = {};
		
		/* Functions */
		
		this.inc = function() {
			if(this.loading) return;
			this.last_episode++;
			if(this.last_episode > this.seasons[this.last_season].length) {
				if(this.last_season < this.seasons.length) {
					this.last_season++;
					this.last_episode = 1;
				} else
					this.last_episode--;
			}
			this.update_status();
			ShowQuery.user_show_update(this);
		};
		
		this.dec = function() {
			if(this.loading) return;
			this.last_episode--;
			if(this.last_episode == 0) {
				this.last_episode = 1;
				if(this.last_season > 1) {
					this.last_season--;
					this.last_episode = this.seasons[this.last_season].length;
				}
			}
			this.update_status();
			ShowQuery.user_show_update(this);
		};
		
		this.activate = function() {
			if(this.status != 'Disabled') {
				this.status = 'Disabled';
				this.next_ep = '';
			} else
				this.update_status();
			ShowQuery.user_show_update(this);
		};
		
		this.setFavourite = function() {
			this.favourite = !this.favourite;
			ShowQuery.user_show_update(this);
		}
		
		this.update_status = function(data) {
			if(data) {
				this.seasons = data.seasons;
				var max = 0;
				for(var i in data.seasons)
					max = parseInt(i) > max ? parseInt(i) : max;
				this.seasons.length = max;
				this.image = data.image;
				this.name = data.name;
				this.show_status = data.status == 'Canceled/Ended' ? 'Ended' : data.status;
				if((data.enabled != null && !data.enabled) && !(this.show_status == 'Ended' || this.show_status == 'Canceled'))
					this.status = 'Disabled';
				
				this.last_season = data.last_season || 1;
				this.last_episode = data.last_episode || 1;
				this.favourite = data.favourite;
				
				if(this.status == 'Disabled') return;
			}
			
			if(this.seasons.length == this.last_season && this.last_episode >= this.seasons[this.last_season].length) {
				if(this.show_status == 'Ended' || this.show_status == 'Canceled') {
					this.status = this.show_status;
					this.next_ep = '';
				} else {
					this.status = 'Unavailable';
					this.next_ep = this.show_status;
				}
			} else if(this.seasons.length >= this.last_season) {
				var nextep = {};
				if(this.last_episode < this.seasons[this.last_season].length)
					nextep = this.seasons[this.last_season][this.last_episode];
				else
					nextep = this.seasons[this.last_season+1][0];
				
				var now = new Date();
				var next = nextep.airdate.split('-');
				var nextdate = new Date(next[0], next[1]-1, next[2]);
                if(nextdate.getTime() < 0) {
                    this.status = 'Undetermined';
                } else if(nextdate <= now) {
					this.status = 'Available';
                } else {
					this.status = 'Unavailable';
                }
                this.next_ep = nextep.title + ' (' + nextep.airdate + ')';
			} else {
                this.status = 'Error';
                console.error('Last season is greater then total seasons', this);
            }
			
			if(data && (data.enabled != null && !data.enabled) && !(this.status == 'Ended' || this.status == 'Canceled')) {
				this.status = 'Disabled';
				this.next_ep = '';
			}
		};
		
		this.refresh = function(force) {
			//console.log("Refreshing Show ", this.name, this.id);

			this.loading = true;
			var me = this;
			ShowQuery.showinfo(this.id, force).
				success(function(data, status, headers, config) {
					//console.log(data);
					me.update_status(data);
					
					me.loading = false;
				}).error(function() {
					me.status = 'Error';
					me.loading = false;
				});
		};
		if(typeof id == 'object') {
			this.id = id.show_id;
			this.update_status(id);
		} else
			this.refresh();
		
		this.delete = function() {
			//console.log("Deleting Show", this.name);
			ShowQuery.user_del_show(this);
		}
	};
}]);

app.controller('GlobalController', [ 
	'$scope', 'ShowQuery', '$timeout', '$interval', 'TVShow', '$modal' ,
	function($scope, ShowQuery, $timeout, $interval, TVShow, $modal) 
	{
		$scope.show_predicate = 'favourite';
		$scope.show_reverse = true;
		$scope.get_show_predicate = function() {
			function order_status(elem) {
				switch(elem.status) {
				case 'Available':
					return 100;
				case 'Unavailable':
					return 90;
				case 'Done':
				case 'Ended':
				case 'Canceled':
					return 50;
				case 'Error':
					return 10;
				default:
					return 1;
				}
			};
			return [$scope.show_predicate=='status' ? order_status : $scope.show_predicate, '+favourite', '-name', order_status];
		};
		
		$scope.user = {
			loggedin: userid ? true : false,
			id: userid,
			name: username
		};
		
		
		$scope.shows = [];
		for(var i = 0; i < usershows.length; i++)
			$scope.shows.push(new TVShow(usershows[i]));
	 
	
		var old_search = '';
		var timer = 0;
		$scope.show_search = function(name) {
			$scope.new_error = false;
			if(!name || name == '') return;
			
			if(timer){
				$timeout.cancel(timer);
			}	
			timer = $timeout(function(){
				if(old_search == name)
					$scope.search.open = true;
				else {
					$scope.search.results = [];
					ShowQuery.search(name)
						.success(function(data) {
							//console.log("Seach open", data);
							old_search = name;
							$scope.search.results = Array.isArray(data.show) ? data.show : [data.show];
							$scope.search.open = true;
						});
				}
			},500);
		};
		
		$scope.show_add = function(sid, name) {
			var id = 0;
			if(sid)
				id=sid;
			else if($scope.search.results && $scope.search.results.length > 0)
				id=$scope.search.results[0].imdb_id;
			
			if(id) {
				if(find_array($scope.shows, function(elem) { return elem.id == id; }))
					alert("Show is already in list");
				else {
					ShowQuery.user_add_show(id).
                        success(function(data,status) {
    					    $scope.shows.push(new TVShow(data, name));
	    			    }).
                        error(function() {
                            alert("Something when wrong. Please try again");
                        });

                    $scope.new_name = '';
		    		$scope.search.open = false;
				}
			} else {
				//console.log("No ID set");
				$scope.new_error = true;
			}
		};
	
		$scope.show_delete = function(show) {
			for(var i = 0; i < $scope.shows.length; i++) {
				if($scope.shows[i].id == show.id) {
					$scope.shows.splice(i,1);
					break;
				}
			}
			show.delete();
		};
		
		var inc_interval, inc_timeout;
		document.querySelector("body").
				addEventListener("mouseup", function() {
					if(inc_timeout) {
						$timeout.cancel(inc_timeout);
						inc_timeout = null;
					}
					if(inc_interval) {
						$interval.cancel(inc_interval);
						inc_interval = null;
					}
				});
		$scope.show_start_inc = function(show) {
			show.inc();
			if(inc_timeout) 
				$timeout.cancel(inc_timeout);
			inc_timeout = $timeout(function(){
				if(inc_interval)
					$interval.cancel(inc_interval);
				inc_interval = $interval(function() {
					show.inc();
				}, 100);
			}, 250);
		}
		
		$scope.show_start_dec = function(show) {
			show.dec();
			if(inc_timeout) 
				$timeout.cancel(inc_timeout);
			inc_timeout = $timeout(function(){
				if(inc_interval)
					$interval.cancel(inc_interval);
				inc_interval = $interval(function() {
					show.dec();
				}, 100);
			}, 250);
		}
		
		$scope.openLogin = function() {
			$modal.open({
				templateUrl: 'loginModal.html',
				controller: 'LoginModal'
			});
		};
		
		$scope.user_logout = function() {
			ShowQuery.logout().
				success(function(data) {
				window.location.reload();
			});
		};
}]);

app.controller('LoginModal', [ 
	'$scope', 'ShowQuery', '$modalInstance',
	function($scope, ShowQuery, $modalInstance) 
	{
		$scope.error = null;
		$scope.success = null;
		
		$scope.closeLogin = function(a1) {
			$modalInstance.dismiss('close');
		};
		
		$scope.user_login = function(user, pw, stay) {
			$scope.error = null;
			$scope.success = null;
			
			ShowQuery.login(user, pw, stay).
				success(function(data) {
					//console.log("Login: ",data);
					if(data.msg == "OK") {
						$scope.success = "Login Successful";
						window.location.reload();
					} else {
						$scope.error = data.msg;
					}
				});
			return false;
		};
		
		$scope.user_register = function(user, pw) {
			$scope.error = null;
			$scope.success = null;
			
			ShowQuery.register(user, pw).
				success(function(data) {
					//console.log("Register: ",data);
					if(data.msg == "OK") {
						$scope.success = "Registration Successful. You can login now";
					} else {
						$scope.error = data.msg;
					}
				});
			return false;
		};
}]);

function find_array(array, compare) {
	if(!Array.isArray(array)) return false;
	for(var i = 0; i < array.length; i++)
		if(compare(array[i])) return true;
	return false;
}
function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
