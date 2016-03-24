<?php
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache'); // HTTP 1.0.
header('Expires: 0'); // Proxies.
require('config.inc.php');
require('functions.inc.php');
session_start();

$db = new mysqli($mysql_host, $mysql_user, $mysql_pw, $mysql_db);

$user = 0;
$name = '';
if(isset($_SESSION['userid'])) {
	$user = $_SESSION['userid'];
	$name = $_SESSION['username'];
} elseif(isset($_COOKIE['usertoken'])) {
	$res = login2($_COOKIE['usertoken']);
    if($res['msg'] == 'OK') {
    	$user = $_SESSION['userid'];
	    $name = $_SESSION['username'];
    }
}

?>
<!DOCTYPE html>
<html ng-app="TVShowManager">
<head>
	<title>TV Show Manager</title>
	
	<meta charset="utf-8">
	
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.1/css/bootstrap.min.css">
	<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.1/css/bootstrap-theme.min.css">
	<link rel="stylesheet" href="style.css">
	<script type="text/javascript">
		var userid, username, usershows = [];
		<?php if($user != 0) {
			echo "userid = $user;"; 
			echo "username = '$name';"; 
			echo 'usershows = '.json_encode(getUserShows()).';';
		} ?>
	</script>
</head>
<body ng-controller="GlobalController">
	<div class="container">
		<div class="panel panel-default">
			<nav class="navbar navbar-default" role="navigation">
			<div class="navbar-header">
				<span class="navbar-brand">TV Show Manager</span>
			</div>
			
			<div class="collapse navbar-collapse">
				<ul class="nav navbar-nav navbar-right">
					<li ng-if="!user.loggedin">
						<a href="#" ng-click="openLogin()">Login or Register</a>
						<script type="text/ng-template" id="loginModal.html">
						<div class="modal-header">
							<h3 class="modal-title">Login</h3>
						</div>
						<div class="modal-body">
						   <form ng-submit="user_login(login_username, login_password, login_stay)">
							  <div ng-if="success" class="alert alert-success" role="alert">{{success}}</div>
							  <div ng-if="error" class="alert alert-danger" role="alert">{{error}}</div>
							  <div class="form-group">
							    <label for="username">Username</label>
							    <input type="text" class="form-control" ng-model="login_username" id="username" placeholder="Username">
							  </div>
							  <div class="form-group">
							    <label for="password">Password</label>
							    <input type="password" class="form-control" ng-model="login_password" id="password" placeholder="Password">
							  </div>
							  <div class="checkbox">
								<label>
								  <input type="checkbox" ng-model="login_stay"> Remember Me
								</label>
							  </div>
							  <input type="submit" style="display: none"/>
						   </form>
						</div>
						<div class="modal-footer">
            				<button class="btn btn-primary" ng-click="user_login(login_username, login_password, login_stay)">Login</button>
            				<button class="btn btn-warning" ng-click="user_register(login_username, login_password)">Register</button>
            				<button class="btn btn-danger" ng-click="closeLogin()">Cancel</button>
       					</div>
						</script>
					</li>
					<li ng-if="user.loggedin"><a href="#" ng-click="user_logout();">Logout</a></li>
				</ul>
				<ul ng-if="user.loggedin" class="nav nav-justified">
					<li><a class="navbar-brand" style="float: none; padding-top: 15px;">{{user.name}}</a></li>
				</ul>
			</div>
				
			</nav>
		
			<div class="panel-body">
                <?php if(isset($res['msg']) && $res['msg'] != 'OK') echo '<div class="alert alert-danger">'.$res['msg'].'</div>'; ?>
				<div class="alert alert-success" ng-show="last_added_show"><a href="#" class="close" ng-click="last_added_show=''" aria-label="close">&times;</a>Added {{last_added_show}} to your list</div>
				<!--<div class="alert alert-danger" ng-if="search.new_error"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>Something went wrong while adding the show</div>-->
				<div class="navbar navbar-default">
					<form class="navbar-form navbar-left" role="search">
						<div class="form-group" dropdown is-open="search.open" ng-class="{'has-error': new_error}">
                            <div class="input-group">
                                <input type="text" ng-model="new_name" ng-change="show_search(new_name)" ng-focus="show_search(new_name)" class="form-control" placeholder="Search for new TV Shows" style="width: 300px;">
                                <span class="input-group-addon">
                                    <i ng-if="!search.searching" class="glyphicon glyphicon-search"></i>
                                    <i ng-if="search.searching"  class="glyphicon glyphicon-refresh gly-spin"></i>
                                </span>
                            </div>
							<div class="dropdown-menu" style="left: initial">
                                <span ng-show="search.results.length==0" style="margin-left: 5px"><i class="glyphicon glyphicon-info-sign"></i> Sorry nothing found</span>
								<table class="table table-default">
								<tr><th>Name</th><th>Year</th></tr>
								<tr ng-repeat="show in search.results | limitTo:5">
									<td><a ng-click="show_add(show.imdb_id, show.name)" href="#">{{show.name}}</a></td>
                                    <!-- TODO: Add popup for image on mouse over -->
									<td>{{show.year}}</td>
								</tr>
								</table>
							</div>
						</div>
						<!--<button ng-click="show_add()" class="btn btn-success"><span class="glyphicon glyphicon-plus"></span> Add</button>-->
					</form>
				</div>
			
				<div class="panel panel-default">
					<table class="table table-default" style="table-layout: fixed">
						<tr>
							<th style="width: 24px">
								<a style="color: #333;" href="#" ng-click="show_predicate='favourite';show_reverse=!show_reverse;">
									<span class="glyphicon glyphicon-star{{show_reverse?'':'-empty'}}"></span>
								</a>
							</th>
							<th style="width: 30%">
								<a style="color: #333;" href="#" ng-click="show_predicate='name';show_reverse=!show_reverse;">Name</a> 
								<small ng-if="show_predicate=='name'" class="glyphicon glyphicon-chevron-{{show_reverse?'down':'up'}}"></small>
							</th>
							<th style="width: 16%">Next Episode</th>
							<th style="width: 12%">
								<a style="color: #333;" href="#" ng-click="show_predicate='status';show_reverse=!show_reverse;">Status</a> 
								<small ng-if="show_predicate=='status'" class="glyphicon glyphicon-chevron-{{show_reverse?'down':'up'}}"></small>
							</th>
							<th style="width: 30%">Episode Name</th>
                            <th style="width: 110px">Date</th>
							<th style="width: 96px"></th>
						</tr>
						<tr ng-repeat="show in shows | orderBy:get_show_predicate():show_reverse" class="{{show.class}}">
							<td><a href="#" ng-click="show.setFavourite()">
								<span style="color: #333;" class="glyphicon glyphicon-star{{show.favourite?'':'-empty'}}"></span></a>
							</td>
							<td>{{show.name}}</td>
							<td>
								<span style="width: 62px; display: inline-block;">{{show.next_ep}}</span>
								<button ng-if="!show.disabled" ng-disabled="show.first" ng-mousedown="show_start_dec(show)" class="btn btn-xs btn-primary"><span class="glyphicon glyphicon-chevron-left"></span></button>
								<button ng-if="!show.disabled" ng-disabled="show.ended" ng-mousedown="show_start_inc(show)" class="btn btn-xs btn-primary"><span class="glyphicon glyphicon-chevron-right"></span></button>
							</td>
							<td>{{show.status}}</td>
							<td>{{show.next_ep_name}}</td>
                            <td>{{show.next_ep_date}}</td>
							<td>
								<button tooltip="Refresh" ng-click="show.refresh(true)" class="btn btn-xs btn-primary"><span class="glyphicon glyphicon-refresh {{show.loading?'gly-spin':''}}"></span></button>
								<button tooltip="Enable" ng-if="show.done"  ng-disabled="show.ended" ng-click="show.activate()" class="btn btn-xs btn-success"><span class="glyphicon glyphicon-new-window"></span></button>
								<button tooltip="Disable"  ng-if="!show.done" ng-disabled="show.ended" ng-click="show.activate()" class="btn btn-xs btn-success"><span class="glyphicon glyphicon-check"></span></button>
								<button tooltip="Delete"   ng-click="show_delete(show)" class="btn btn-xs btn-danger"><span class="glyphicon glyphicon-trash"></span></button>
							</td>
						</tr>
					</table>
				</div>
			</div>
			
			<div class="panel-footer">
    			<div style="position: absolute;">&copy; WaeCo-Soft 2015</div>
    		    <div style="text-align: center;">Powerd by <a href="http://thetvdb.com/">TheTVDB.com</a></div>
			</div>
		</div>
	</div>
	
	
	<script	src="https://ajax.googleapis.com/ajax/libs/angularjs/1.3.14/angular.js"></script>
	<script	src="https://ajax.googleapis.com/ajax/libs/angularjs/1.3.14/angular-route.js"></script>
	<script	src="https://ajax.googleapis.com/ajax/libs/angularjs/1.3.14/angular-resource.min.js"></script>
	<script src="app.js"></script>	
	
	<!-- <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.1/js/bootstrap.min.js"></script>  -->
	<script src="//angular-ui.github.io/bootstrap/ui-bootstrap-tpls-0.12.1.js"></script>
</body>
</html>
