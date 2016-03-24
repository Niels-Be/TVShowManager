Tv Show Manager
===============

This is a nice and simple Web UI that allows you to keep track of your TV shows. 
It is useful if you are watching multiple shows at the same time and cannot remember at which episode you stopped watching.
Also, it shows you if a new episode is available or when the next comes online.

![Screenshot](http://i.imgur.com/HfCwj2K.png)



## Usage
You can either use my site at https://www.waeco-soft.com/TvShowManager or setup your own homepage.

When using my site you can try it out without creating an account. But keep in mind your shows won't be saved unless you create an account.

## Installation
Clone this repository

#### Database
1. Install a MySQL server
2. Create a database `tvshowmanager`
3. Create a user `tvshowmanager` and set a password
4. Import `tvshowmanager.sql` into that database

#### Webserver
1. Install a Webserver and setup PHP
2. Copy all files from `public` into a directory in your webroot

#### Config
1. Get a API key from http://thetvdb.com/?tab=apiregister
2. Rename `config.inc.php.template` to `config.inc.php`
3. Modify the settings to match your MySQL server and your API key
