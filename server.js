const express = require("express");
const cookieParser = require('cookie-parser')
const session = require("express-session")
const bodyParser = require('body-parser');
const orm = require("orm");
orm.settings.set("properties.primary_key", "{name}_id");
orm.settings.set("properties.association_key", "{field}");
orm.settings.set("properties.required", true);

const show = require("./show.js");
const user = require("./user.js");
const config = require("./config.js");

var app = express();

app.use(cookieParser());
app.use(session(config.session));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(orm.express(config.databaseUrl, {
    define: function (db, models, next) {

        
        models.user = db.define("user", {
            user_id: {type: 'serial', key: true},
            name: {type: 'text', unique: true},
            password: String
        }, {
            validations: {
                name: orm.enforce.security.username({length: 3}, "No valid username")
            }
        });
        
        models.userToken = db.define("user_token", {
            user_id: {type: 'integer', key: true},
            token: String
        });
        //models.userToken.hasOne('user', models.user, { reverse: "tokens", required: true });
        //models.user.hasMany("tokens", {}, {token: {type: 'text', key: true}}, {key: true, required: true, reverse: "user"});
        
        models.show = db.define("show", {
            show_id: {type: 'integer', key: true},
            imdb_id: {type: 'text', unique: true},
            name: String,
            genre: {type: 'text', required: false},
            started: {type: 'date', time: false, required: false},
            ended: {type: 'date', time: false, required: false},
            air_day: {type: 'text', required: false},
            air_time: {type: 'text', required: false},
            status: String,
            image: {type: 'text', required: false},
            seasons: {type: 'integer', required: false},
            updated_at: {type: 'date', time: true}
        });
        
        models.userShows = db.define("user_shows", {
           user_id: {type: 'integer', key: true},
           show_id: {type: 'integer', key: true},
           last_season: {type: 'integer', defaultValue: 0},
           last_episode: {type: 'integer', defaultValue: 0},
           enabled: {type: 'boolean', defaultValue: true},
           favourite: {type: 'boolean', defaultValue: false}
        });
        //models.userShows.hasOne('user', models.user, { reverse: "shows" });
        //models.userShows.hasOne('show', models.show);
        
        /*models.user.hasMany('shows', models.show, {
            last_season: {type: 'integer', defaultValue: 0},
            last_episode: {type: 'integer', defaultValue: 0},
            enabled: {type: 'boolean', defaultValue: true},
            favourite: {type: 'boolean', defaultValue: false}
        }, { reverse: "users", key: true, required: true });*/
        
        models.episode = db.define("episode", {
            episode_id: {type: 'integer', key: true},
            season: {type: 'integer'/*, key: true*/},
            episode: {type: 'integer'/*, key: true*/},
            title: String,
            airdate: {type: 'date', time: false}
        });
        models.episode.hasOne('show', models.show, { reverse: "episodes", required: true});
        
        models.episodeStatus = db.define("episode_status", {
            episode_id: {type: 'integer', key: true},
            provider: {type: 'text', key: true},
            url: {type: 'text', required: false}
        });
        //models.episode.hasOne('episode', models.episode, { reverse: "status" });
        //models.episodeStatus.addProperty({name: "episode_id", type: 'integer', key: true});
        
        db.sync(function(err) {
            if(err) throw err;
            models.episodeStatus.find({url: null}).remove(function() {});
            next();
        });
    }
}));


var api = express.Router();


/*

POST    /user/login         //Login -> returns fail or user settings
POST    /user/token         //Login with Token
POST    /user/register      //Register new user -> auto login
POST    /user/logout        //Logout on all sessions
POST    /user/settings      //Update user settings

GET     /show               //Get all shows for user
GET     /show/:id           //Get show info
PUT     /show/:id           //Add show for user
POST    /show/:id           //Update show for user
DELETE  /show/:id           //Remove show for user

PUT     /show/:id/refresh   //Refresh show async -> Get show info should be called later
POST    /show/:id/refresh   //Refresh show sync -> Same response as Get show info

GET     /show/episode/:id   //Get status of episode

GET     /show/search/:name  //Search for show

*/

api.use('/user/', user(config.user));
api.use('/show/', show(config.show));

app.use('/', express.static('public'));
app.use('/api/v1/', api);

app.listen(process.env.PORT, process.env.IP, function () {
  console.log('Server listen on '+process.env.IP+':'+process.env.PORT);
});