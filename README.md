Tv Show Manager
===============

This is a nice and simple Web UI that allows you the keep track of your TV shows. 
It is usefull if you are watching multiple shows at the same time and can not remember at witch episode you stoped watching.
Also it shows you if a new episode is available or when the next comes online.

![Screenshot](http://i.imgur.com/NOQi8dO.png)



## Usage
You can either use my site at http://waeco-soft.com/TvShowManager or setup your own homepage.


## Installation
Clone this repository

#### Database
1. Install a MySQL server
2. Create a database `tvshowmanager`
3. Create a user `tvshowmanager` and set a password
4. Import tvshowmanager.sql into that database

#### Webserver
1. Install a Webserver and setup PHP
2. Copy all files into a folder of your webroot

#### Config
1. Get a API key from http://thetvdb.com/?tab=apiregister
2. Rename `config.inc.php.template` to `config.inc.php`
3. Modify the settings to match your MySQL server and your API key
