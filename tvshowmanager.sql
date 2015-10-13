SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;


CREATE TABLE IF NOT EXISTS `episode` (
  `show_id` int(11) NOT NULL,
  `season` smallint(6) NOT NULL,
  `episode` smallint(6) NOT NULL,
  `title` text NOT NULL,
  `airdate` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `show` (
  `show_id` int(11) NOT NULL,
  `imdb_id` varchar(12) NOT NULL,
  `name` varchar(255) NOT NULL,
  `started` date NOT NULL,
  `ended` date NOT NULL,
  `air_day` varchar(12) NOT NULL,
  `air_time` varchar(12) NOT NULL,
  `status` varchar(32) NOT NULL,
  `image` text NOT NULL,
  `seasons` int(11) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `user` (
  `user_id` int(11) NOT NULL,
  `name` varchar(64) NOT NULL,
  `password` varchar(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `user_shows` (
  `user_id` int(11) NOT NULL,
  `show_id` int(11) NOT NULL,
  `last_season` int(11) NOT NULL DEFAULT '1',
  `last_episode` int(11) NOT NULL DEFAULT '1',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `favourite` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `user_token` (
  `user_id` int(11) NOT NULL,
  `token` varchar(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


ALTER TABLE `episode`
  ADD PRIMARY KEY (`show_id`,`episode`,`season`);

ALTER TABLE `show`
  ADD PRIMARY KEY (`show_id`),
  ADD UNIQUE KEY `imdb_id` (`imdb_id`),
  ADD KEY `name` (`name`);

ALTER TABLE `user`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `name` (`name`);

ALTER TABLE `user_shows`
  ADD PRIMARY KEY (`user_id`,`show_id`) USING BTREE,
  ADD KEY `show_id` (`show_id`);

ALTER TABLE `user_token`
  ADD PRIMARY KEY (`user_id`,`token`);


ALTER TABLE `user`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `user_shows`
  ADD CONSTRAINT `user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `user_token`
  ADD CONSTRAINT `user_token_user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
