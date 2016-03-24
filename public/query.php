<?php
require('config.inc.php');
require('functions.inc.php');

session_start();

$db = new mysqli($mysql_host, $mysql_user, $mysql_pw, $mysql_db) or die($db->error);

$user = 0;
if(isset($_SESSION['userid']))
	$user = $_SESSION['userid'];
elseif(isset($_COOKIE['usertoken'])) {
    $res = login2($_COOKIE['usertoken']);
    if($res['msg'] == 'OK')
        $user = $_SESSION['userid'];
}

$postdata = file_get_contents("php://input");
if(!empty($postdata))
	$_POST = json_decode($postdata,TRUE);

if(!empty($_GET['search']))
	$res = search(urldecode($_GET['search']));

elseif(!empty($_GET['show']))
	$res = getShow($_GET['show'], isset($_GET['force']), isset($_GET['q']));
	
elseif(isset($_GET['usershows']))
	$res = getUserShows();

elseif(!empty($_POST['addshow']))
	$res = addShow($_POST['addshow']);

elseif(!empty($_POST['delshow']))
	$res = delShow($_POST['delshow']);

elseif(!empty($_POST['updateshow']))
	$res = updateShow($_POST['updateshow']);

elseif(!empty($_POST['username']) && !empty($_POST['password']))
	$res = login($_POST['username'], $_POST['password'], isset($_POST['stay']) && $_POST['stay']);

elseif(!empty($_POST['token']))
	$res = login2($_POST['password']);

elseif(isset($_POST['logout']))
	$res = logout();
	
elseif(!empty($_POST['registername']) && !empty($_POST['password']))
	$res = register($_POST['registername'], $_POST['password']);
	
else {
	$res =  array('msg' => 'Command not set', 'post' => $_POST, 'get' => $_GET);
}

header("Content-type: application/json");
echo json_encode($res);

?>
