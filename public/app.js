var app = angular.module('TVShowManager', ['ngRoute', 'ui.bootstrap']);
app.config(['$compileProvider', function($compileProvider) {
	$compileProvider.debugInfoEnabled(true);
}]);

app.factory('ShowQuery', ['$http', '$timeout', '$q', function($http, $timeout, $q) {
	return new function() {
		this.search = function(name) {
			return $http.get("/api/v1/show/search/" + encodeURI(name));
		};

		this.allShows = function() {
			return $http.get("/api/v1/show");
		};

		this.showinfo = function(id) {
			return $http.get("/api/v1/show/" + id);
		};

		this.refreshShow = function(id) {
			return $http.post("/api/v1/show/" + id + "/refresh");
		};

		this.showStatus = function(episodeId) {
			return $http.get("/api/v1/show/episode/" + episodeId);
		};

		this.user_add_show = function(id) {
			return $http.put("/api/v1/show/" + id);
		};

		this.user_del_show = function(show) {
			return $http.delete("/api/v1/show/" + show.id);
		};

		this.login = function(user, pw, stay) {
			return $http.post("/api/v1/user/login", {
				username: user,
				password: pw,
				stay: !!stay
			});
		};

		this.login_token = function(user, token) {
			return $http.post("/api/v1/user/token", {
				username: user,
				token: token
			});
		};

		this.logout = function() {
			return $http.post("/api/v1/user/logout");
		};

		this.register = function(user, pw) {
			return $http.post("/api/v1/user/register", {
				username: user,
				password: pw
			});
		};

		var timer;
		this.user_show_update = function(show) {
			if (timer)
				$timeout.cancel(timer);
			timer = $timeout(function() {
				$http.post("/api/v1/show/" + show.id, {
					show: show.id,
					last_season: show.last_season,
					last_episode: show.last_episode,
					enabled: !show.disabled,
					favourite: show.favourite
				});
			}, 500);
		};
	};
}]);

app.factory('TVShow', ['ShowQuery', '$timeout', function(ShowQuery, $timeout) {
	return function(id, name) {
		this.id = id;
		this.name = name || 'Unknown Show';
		this.__defineGetter__('class', function() {
			switch (this.status) {
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
			}
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
			return this.last_season == 0;
		});
		this.__defineGetter__('ended', function() {
			return this.status == 'Ended' || this.status == 'Canceled';
		});
		this.__defineGetter__('next_ep', function() {
			var next = this.getNext();
			if (next)
				return 'S' + pad(next.season, 2) + ' E' + pad(next.episode, 2);
			if (this.ended)
				return 'End';
			//Fallback
			return 'S' + pad(this.last_season, 2) + ' E' + pad(this.last_episode, 2) + "+";
			//return 'Next';          
		});
		this.__defineGetter__('next_ep_name', function() {
			var next = this.getNext();
			return next ? next.title : this.show_status;
		});
		this.__defineGetter__('next_ep_date', function() {
			var next = this.getNext();
			return next ? (next.airdate == "0000-00-00" ? "TBA" : new Date(next.airdate).toLocaleDateString()) : '';
		});
		this.__defineGetter__('next_ep_status', function() {
			var next = this.getNext();
			return next ? next.status : {};
		});

		this.last_season = 0;
		this.last_episode = 0;
		this.favourite = false;

		this.loading = false;
		this.image = '';

		this.seasons = {};

		/* Functions */

		this.inc = function() {
			if (this.loading) return;
			this.last_episode++;
			if (this.last_season == 0 || this.last_episode >= this.seasons[this.last_season].length) {
				if (this.last_season + 1 < this.seasons.length) {
					this.last_season++;
					this.last_episode = 1;
				}
				else
					this.last_episode--;
			}
			this.update_status();
			ShowQuery.user_show_update(this);
		};

		this.dec = function() {
			if (this.loading) return;
			this.last_episode--;
			if (this.last_episode == 0) {
				this.last_episode = 1;
				if (this.last_season > 1) {
					this.last_season--;
					this.last_episode = this.seasons[this.last_season].length - 1;
				}
				else {
					this.last_episode = 0;
					this.last_season = 0;
				}
			}
			this.update_status();
			ShowQuery.user_show_update(this);
		};

		this.activate = function() {
			if (this.status != 'Disabled') {
				this.status = 'Disabled';
			}
			else
				this.update_status();
			ShowQuery.user_show_update(this);
			console.log(this);
		};

		this.setFavourite = function() {
			this.favourite = !this.favourite;
			ShowQuery.user_show_update(this);
		};

		this.getNext = function() {
			if (this.last_season > 0 && this.seasons.length > this.last_season && this.seasons[this.last_season].length > this.last_episode + 1)
				return this.seasons[this.last_season][this.last_episode + 1];
			if (this.seasons.length > this.last_season + 1)
				return this.seasons[this.last_season + 1][1];
			return null;
		};

		var statusTimer;
		this.update_status = function(data) {
			if (data) {
				this.seasons = [];
				for (var i in data.episodes) {
					if (!this.seasons[data.episodes[i].season])
						this.seasons[data.episodes[i].season] = [];
					this.seasons[data.episodes[i].season][data.episodes[i].episode] = data.episodes[i];
				}

				this.image = data.image;
				this.name = data.name;
				this.show_status = data.status == 'Canceled/Ended' ? 'Ended' : data.status;

				if (data.enabled === false && !(this.show_status == 'Ended' || this.show_status == 'Canceled'))
					this.status = 'Disabled';
				if (data.last_season)
					this.last_season = data.last_season;
				if (data.last_episode)
					this.last_episode = data.last_episode;
				if (data.favourite)
					this.favourite = !!data.favourite;

				if (this.status == 'Disabled') return;
			}

			var nextep = this.getNext();
			if (nextep) {
				var now = new Date();
				var nextdate = new Date(nextep.airdate);
				if (nextdate.getTime() < 0) {
					this.status = 'Undetermined';
				}
				else if (nextdate <= now) {
					this.status = 'Available';
					if (!nextep.status) {
							if (statusTimer)
								$timeout.cancel(statusTimer);
							statusTimer = $timeout(function() {
								ShowQuery.showStatus(nextep.episode_id).then(function(data) {
									data = data.data;
									if (data.status == "OK")
										nextep.status = data.res;
									else
										console.error(data.msg, data.err);
								});
							}, 750);
					}
				}
				else {
					this.status = 'Unavailable';
				}
			}
			else {
				if (this.show_status == 'Ended' || this.show_status == 'Canceled') {
					this.status = this.show_status;
				}
				else {
					this.status = 'Unavailable';
				}
			}

			if (data && (data.enabled != null && !data.enabled) && !(this.status == 'Ended' || this.status == 'Canceled')) {
				this.status = 'Disabled';
			}
		};

		this.refresh = function(force) {
			//console.log("Refreshing Show ", this.name, this.id);

			this.loading = true;
			var me = this;
			ShowQuery.refreshShow(this.id, force).
			success(function(data, status, headers, config) {
				//console.log(data);
				if (data.status == "OK")
					me.update_status(data.show);
				else
					console.error(data.msg, data.err);

				me.loading = false;
			}).error(function() {
				me.status = 'Error';
				me.loading = false;
			});
		};
		if (typeof id == 'object') {
			this.id = id.show_id;
			this.update_status(id);
		}
		else
			this.refresh();

		this.delete = function() {
			//console.log("Deleting Show", this.name);
			ShowQuery.user_del_show(this);
		};
	};
}]);

app.value('user', {
	loggedin: false,
	id: 0,
	name: ''
});

app.controller('GlobalController', [
	'$scope', 'user', 'ShowQuery', '$timeout', '$interval', 'TVShow', '$uibModal',
	function($scope, user, ShowQuery, $timeout, $interval, TVShow, $modal) {
		$scope.show_predicate = 'favourite';
		$scope.show_reverse = true;
		$scope.get_show_predicate = function() {
			function order_status(elem) {
				switch (elem.status) {
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
			}
			return [$scope.show_predicate == 'status' ? order_status : $scope.show_predicate, '+favourite', '-name', order_status];
		};

		$scope.user = user;
		$scope.shows = [];

		ShowQuery.login_token().
		success(function(data) {
			//console.log("Login: ",data);
			if (data.status == "OK") {
				user.loggedin = true;
				user.name = data.username;
				ShowQuery.allShows().success(function(data) {
					if (data.status == "OK") {
						for (var i in data.shows) {
							$scope.shows.push(new TVShow(data.shows[i]));
						}
					}
					else
						console.error(data.msg, data.err);
				});
			}
		});

		//for(var i = 0; i < usershows.length; i++)
		//	$scope.shows.push(new TVShow(usershows[i]));

		var old_search = '';
		var timer = 0;
		$scope.show_search = function(name) {
			$scope.new_error = false;
			if (!name || name == '') return;
			$scope.search.searching = true;
			if (timer) {
				$timeout.cancel(timer);
			}
			timer = $timeout(function() {
				if (old_search == name)
					$scope.search.open = true;
				else {
					$scope.search.results = [];
					ShowQuery.search(name)
						.success(function(data) {
							//console.log("Seach open", data);
							old_search = name;
							if (data.status == "OK")
								$scope.search.results = data.shows;
							else {
								$scope.search.results = [];
								$scope.search.new_error = true;
								console.error(data.msg, data.err);
							}
							$scope.search.open = true;
							$scope.search.searching = false;
						});
				}
			}, 500);
		};

		$scope.show_add = function(sid, name) {
			var id = 0;
			if (sid)
				id = sid;
			else if ($scope.search.results && $scope.search.results.length > 0)
				id = $scope.search.results[0].imdb_id;

			if (id) {
				if (find_array($scope.shows, function(elem) {
						return elem.id == id;
					}))
					alert("Show is already in list");
				else {
					ShowQuery.user_add_show(id).
					success(function(data, status) {
						$scope.shows.push(new TVShow(data.show, name));
						$scope.last_added_show = name;
					}).
					error(function() {
						alert("Something went wrong. Please try again");
					});

					$scope.new_name = '';
					$scope.search.open = false;
					$scope.search.searching = false;
				}
			}
			else {
				//console.log("No ID set");
				$scope.new_error = true;
			}
		};

		$scope.show_delete = function(show) {
			for (var i = 0; i < $scope.shows.length; i++) {
				if ($scope.shows[i].id == show.id) {
					$scope.shows.splice(i, 1);
					break;
				}
			}
			show.delete();
		};

		var inc_interval, inc_timeout;
		document.querySelector("body").
		addEventListener("mouseup", function() {
			if (inc_timeout) {
				$timeout.cancel(inc_timeout);
				inc_timeout = null;
			}
			if (inc_interval) {
				$interval.cancel(inc_interval);
				inc_interval = null;
			}
		});
		$scope.show_start_inc = function(show) {
			show.inc();
			if (inc_timeout)
				$timeout.cancel(inc_timeout);
			inc_timeout = $timeout(function() {
				if (inc_interval)
					$interval.cancel(inc_interval);
				inc_interval = $interval(function() {
					show.inc();
				}, 100);
			}, 250);
		};

		$scope.show_start_dec = function(show) {
			show.dec();
			if (inc_timeout)
				$timeout.cancel(inc_timeout);
			inc_timeout = $timeout(function() {
				if (inc_interval)
					$interval.cancel(inc_interval);
				inc_interval = $interval(function() {
					show.dec();
				}, 100);
			}, 250);
		};

		$scope.openLogin = function() {
			$modal.open({
				templateUrl: 'loginModal.html',
				controller: 'LoginModal'
			});
		};

		$scope.user_logout = function() {
			ShowQuery.logout().success(function(data) {
				if (data.status == 'OK') {
					user.loggedin = false;
					user.name = '';
					$scope.shows = [];
				}
				else
					console.error(data.msg, data.err);
			});
		};
	}
]);

app.controller('LoginModal', [
	'$scope', 'user', 'ShowQuery', '$uibModalInstance',
	function($scope, user, ShowQuery, $modalInstance) {
		$scope.error = null;
		$scope.success = null;

		$scope.closeLogin = function(a1) {
			$modalInstance.dismiss('close');
		};

		$scope.user_login = function(username, pw, stay) {
			$scope.error = null;
			$scope.success = null;

			ShowQuery.login(username, pw, stay).
			success(function(data) {
				//console.log("Login: ",data);
				if (data.status == "OK") {
					$scope.success = "Login Successful";
					user.loggedin = true;
					user.name = data.username;
					window.location.reload();
				}
				else {
					$scope.error = data.msg;
				}
			});
			return false;
		};

		$scope.user_register = function(username, pw) {
			$scope.error = null;
			$scope.success = null;

			ShowQuery.register(username, pw).
			success(function(data) {
				//console.log("Register: ",data);
				if (data.status == "OK") {
					$scope.success = "Registration Successful";
					user.loggedin = true;
					user.name = data.username;
					window.location.reload();
				}
				else {
					$scope.error = data.msg;
				}
			});
			return false;
		};
	}
]);

function find_array(array, compare) {
	if (!Array.isArray(array)) return false;
	for (var i = 0; i < array.length; i++)
		if (compare(array[i])) return true;
	return false;
}

function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
