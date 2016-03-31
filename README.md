Tv Show Manager
===============

This is a nice and simple Web UI that allows you to keep track of your TV shows. 
It is useful if you are watching multiple shows at the same time and cannot remember at which episode you stopped watching.
Also, it shows you if a new episode is available or when the next comes online.

![Screenshot](http://i.imgur.com/popX3Xz.png)



## Usage
You can either use my site at https://www.waeco-soft.com/TvShowManager or setup your own homepage.

You can try it without creating an account. But keep in mind your shows won't be saved unless you create an account.

## Installation

By using Docker this is very simple.

1. Clone this repository
2. Adapt the [config](#config)
3. inside the repository directory run:
```
docker run -d --name tvshowmanager -p 3000:80 node:5.9-onbuild
```

### Advaced
Alternatively you can run this by your self.

1. Clone this repository
2. Install Node.JS and NPM
3. Run `npm install`
4. Adapt the [config](#config)
5. You can set `PORT` and `IP` environment variables to control ip and port
6. Start the server with `node server.js`

##### Database
You can chose any database server you want as long there is a adapter for [node-orm](https://github.com/dresende/node-orm2)

By default it uses a SQLlite database which requires no further setup. But you probably want to change that.
The connection string looks like: protocol://username:password@host/database



## Config
1. Get a API key from http://thetvdb.com/?tab=apiregister
2. Rename `config.js.template` to `config.js`
3. Modify the settings to match your Database server and your API key


## TODO:
- Show updates should be queued and run in background
- Archiv insted of disable
- Refactor front end
- Color from selected primary status provider
- Netflix status provider