<?php

//http://stackoverflow.com/questions/1966503/does-imdb-provide-an-api
function search($str) {
    $str = strtolower($str);
	$str = str_replace(array(" "), "_", $str);
    $str = str_replace(array("(",")","-",":",".",";",",","'",'"',"+","#"), "", $str);
    
    if(strlen($str) <= 1)
        return FALSE;

    $str = urlencode($str);

	$data = @file_get_contents("http://sg.media-imdb.com/suggests/".substr($str, 0, 1)."/$str.json");
	if($data === FALSE) {
		http_response_code(404);
#       echo "Nope";
		return FALSE;
	}
	
    $json = substr($data, 5+strlen($str)+1, -1);
	$obj = json_decode($json,TRUE);
	
#	print_r($obj);
	
	$res = array('show' => array());
	if(isset($obj['d'])) {
		foreach ($obj['d'] as $show) {
            if(isset($show['q']) && $show['q'] == "TV series") {
    			$res['show'][] = array(
	    			'imdb_id' => $show['id'],
		    		'name' => 	 $show['l'],
			    	'year' => $show['y'],
                    'img' => isset($show['i']) ? $show['i'][0] : ''
			    );
            }
		}
	}
	return $res;
}

//http://thetvdb.com/wiki/index.php?title=Programmers_API
function getShow($sid, $force, $quiet) {
	global $db, $user, $apikey;
	
	$stm = $db->prepare('
				SELECT s.*, us.last_season, us.last_episode, us.enabled, us.favourite
				FROM `show` as s
				LEFT JOIN user_shows as us
				ON s.show_id = us.show_id AND us.user_id = ?
				WHERE s.show_id = ?
			');
	$stmEpisodes = $db->prepare('SELECT season,episode,title,airdate FROM episode WHERE show_id = ?');
	
	if(!$force) {
		$res = doOutput($stm, $stmEpisodes, $sid, $user, 'local', $quiet);
		if($res)
			return $res;
	}
	
	$data = @file_get_contents("http://thetvdb.com/api/$apikey/series/$sid/all");
	if($data === FALSE) {
		http_response_code(502);
		return "API Error";
	}
	
	$xml = simplexml_load_string($data);
	$json = json_encode($xml);
	$obj = json_decode($json,TRUE);

	if(!isset($obj['Series'])) {
		http_response_code(404);
		return "Show '$sid' not found";
	}
	
	#print_r($obj);
    $series = $obj['Series'];
	$episodes = $obj['Episode'];

    #Inster Show
	$stmShow = $db->prepare('REPLACE INTO `show` (show_id, imdb_id, name, started, air_day, air_time, status, image, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, NOW())') or die($db->error);
	$stmEp = $db->prepare('INSERT INTO episode (show_id, season, episode, title, airdate) VALUES(?, ?, ?, ?, ?)') or die($db->error);
	
	$db->query("DELETE FROM episode WHERE show_id = $sid") or die($db->error);
	
    $img = empty($series['poster']) ? '' : 'http://thetvdb.com/banners/_cache/'.$series['poster'];
	$stmShow->bind_param('isssssss', $series['id'], $series['IMDB_ID'], $series['SeriesName'], $series['FirstAired'], $series['Airs_DayOfWeek'], $series['Airs_Time'], $series['Status'], $img);
	$stmShow->execute() or die($db->error);
	
    #Inster Episodes
	if(isset($episodes['EpisodeName'])) {
		$episode = $episodes;
		$stmEp->bind_param('iiiss', $sid, $episode['SeasonNumber'], $episode['EpisodeNumber'], $episode['EpisodeName'], empty($episode['FirstAired']) ? '0000-00-00' : $episode['FirstAired']);
		$stmEp->execute();
    } else {
		foreach($episodes as $episode) {
           $stmEp->bind_param('iiiss', $sid, $episode['SeasonNumber'], $episode['EpisodeNumber'], $episode['EpisodeName'], empty($episode['FirstAired']) ? '0000-00-00' : $episode['FirstAired']);
	    	$stmEp->execute();
		}
	}
	
	$res = doOutput($stm, $stmEpisodes, $sid, $user, 'remote', $quiet);
	if($res)
		return $res;
	else {
		http_response_code(404);
		return "Some Error";
	}
}

function getUserShows() {
	global $db, $user;
	
	$stm = $db->prepare('
				SELECT 
					s.*, 
					us.last_season, us.last_episode, us.enabled, us.favourite
				FROM user_shows as us
				LEFT JOIN `show` as s
				USING(show_id)
				WHERE us.user_id = ? AND 0 = ?
			');
	$stmEpisodes = $db->prepare('SELECT season,episode,title,airdate FROM episode WHERE show_id = ?');
	$res = doOutput($stm, $stmEpisodes, 0, $user, 'local');
	if(isset($res['show_id']))
		$res = array($res);
	return $res;
}

function doOutput($stm, $stmEpisodes, $sid, $user, $type, $quiet = false) {
	$stm->bind_param('ii', $user, $sid);
	
	if($stm->execute()) {
		$res = $stm->get_result();
		$result = array();
		while($obj = $res->fetch_assoc()) {
			$obj['request_type'] = $type;
			$obj['seasons'] = array();
			if($obj['name']) {
				$stmEpisodes->bind_param('i', $obj['show_id']);
				if($stmEpisodes->execute()) {
					$res2 = $stmEpisodes->get_result();
					while ($row = $res2->fetch_assoc()) {
                        if($row['season'] == 0) continue;
						if(isset($obj['seasons'][$row['season']]))
							$obj['seasons'][$row['season']][] = $row;
						else
							$obj['seasons'][$row['season']] = array($row);
					}
				}
			} else 
				$obj = $obj['show_id'];
			if($res->num_rows == 1)
				$result = $obj;
			else
				$result[] = $obj;
		}
		if($quiet)
			return "OK";
		else
			return $result;
	}
	return false;
}


function addShow($id) {
	global $db, $user;
    $id = $db->escape_string($id);
    $res = $db->query("SELECT show_id FROM `show` WHERE imdb_id = '$id'");
    if($res->num_rows == 1) {
        $show_id = $res->fetch_assoc()['show_id'];
    } else {
        $data = @file_get_contents("http://thetvdb.com/api/GetSeriesByRemoteID.php?imdbid=$id");
        if($data === FALSE) {
            http_response_code(502);
            return "API Error";
        }

        $xml = simplexml_load_string($data);
        $json = json_encode($xml);
        $obj = json_decode($json,TRUE);
        
        if(!isset($obj['Series'])) {
            http_response_code(404);
            return "Show not found";
        }
        $show_id = $obj['Series']['seriesid'];
        getShow($show_id, TRUE, TRUE);
    }
	$stm = $db->prepare('INSERT INTO user_shows (user_id, show_id) VALUES(?,?)');
	$stm->bind_param('ii', $user, $show_id);
	$stm->execute();
    return $show_id;
}

function delShow($id) {
	global $db, $user;
	$stm = $db->prepare('DELETE FROM user_shows WHERE user_id = ? AND show_id = ?');
	$stm->bind_param('ii', $user, $id);
	return $stm->execute();
}

function updateShow($id) {
	global $db, $user;
	$stm = $db->prepare('UPDATE user_shows SET last_season = ?, last_episode = ?, enabled = ?, favourite = ? WHERE user_id = ? AND show_id = ?');
	$stm->bind_param('iiiiii', $_POST['last_season'], $_POST['last_episode'], $_POST['enabled'], $_POST['favourite'], $user, $id);
	return $stm->execute();
}

function login($user, $pw, $stay = false) {
	global $db;
	$user = $db->escape_string($user);
	$pw = $db->escape_string($pw);
	$res = $db->query("SELECT user_id,name FROM `user` WHERE `name` = '$user' AND `password` = PASSWORD('$pw')") or die($db->error);
	if($res->num_rows == 1) {
		$row = $res->fetch_assoc();
        $id = $row['user_id'];
		$_SESSION['userid'] = $id;
		$_SESSION['username'] = $row['name'];
		if($stay) {
			$token = md5("$id ## $user " + rand() + date('c'));
			$db->query("INSERT INTO `user_token` VALUES ($id, '$token')") or die($db->error);
			setcookie("usertoken", $token, time()+60*60*24*30, "", "", false, true);
		} else {
			setcookie("usertoken", NULL);
		}
		
		return array('msg' => 'OK');
	} else
		return array('msg' => 'Username or Password invalid');
}
function login2($token) {
	global $db;
	$token = $db->escape_string($token);
	$res = $db->query("SELECT user_id, name FROM `user` JOIN `user_token` USING(user_id) WHERE `token` = '$token'") or die($db->error);
	if($res->num_rows == 1) {
		$row = $res->fetch_assoc();
		$_SESSION['userid'] = $row['user_id'];
		$_SESSION['username'] = $row['name'];
		return array('msg' => 'OK');
	} else
		return array('msg' => 'Session expiered');
}

function logout() {
    global $db;
    $id = $_SESSION['userid'];
    if($id)
        $db->query("DELETE FROM `user_token` WHERE `user_id` = $id");
	unset($_SESSION['userid']);
	unset($_SESSION['username']);
    setcookie("usertoken", NULL);
}

function register($user, $pw) {
	global $db;
	$stm = $db->prepare('INSERT INTO user (name, password) VALUES(?,PASSWORD(?))');
	$stm->bind_param('ss', $user, $pw);
	if($stm->execute())
		echo json_encode(array('msg' => 'OK'));
	else
		echo json_encode(array('msg' => 'Username already exists'));
	exit;
}
