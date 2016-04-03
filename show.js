const express = require("express");
const async = require("async");

const ShowProvider = require("./ShowProvider");
const models = require("./models");

module.exports = function(config) {
    var show = express.Router();
    
    var showProvider = new ShowProvider(config.provider, models);
    
    function errorHandler(res, err) {
        console.warn(err);
        res.json({ status: 'ERR', err: err, msg: err.message });
    }
    
    //get all shows of user
    show.get('/', function(req, res) {
        if(!req.session.user) return res.json({status: 'ERR', msg: "Not logged in"});
        models.Show.findAll({
            include: [{
                model: models.User,
                where: {id: req.session.user.id}
            }/*, { //including episodes is to slow
                model: models.Episode,
                as: 'episodes'
            }*/]
        }).then(function(userShows) {
            async.map(userShows, function(show, callback) {
                var tmp = show.get({plain: true});
                tmp.last_season = tmp.Users[0].UserShow.last_season;
                tmp.last_episode = tmp.Users[0].UserShow.last_episode;
                tmp.enabled = tmp.Users[0].UserShow.enabled;
                tmp.favourite = tmp.Users[0].UserShow.favourite;
                delete tmp.Users;
                callback(null, tmp);
            }, function(err, shows) {
                if(err) return errorHandler(res, err);
                res.json({status: 'OK', shows: shows});
            });

        }, errorHandler.bind(this, res));
    });
    
    show.get('/repair', function(req, res) {
        models.sequelize.query("SELECT us.show_id show_id FROM user_shows us WHERE NOT EXISTS (SELECT id FROM shows s WHERE us.show_id = s.id)", {
            type: models.sequelize.QueryTypes.SELECT
        }).then(function(results) {
            console.log("Repairing: ",results);
            async.each(results, function(elem, cb) {
                showProvider.get(elem.show_id, cb);
            }, function(err) {
                if(err) return errorHandler(res, err);
                res.json({status: 'OK', count: results.length});
            });
        }, errorHandler.bind(this, res));
    });
    
    //get show info, optionaly including user info if logged in
    show.get('/:id', function(req, res) {
        showProvider.get(req.params.id, req.session.user, function(err, show) {
            if(err) return errorHandler(res, err);
            res.json({status: 'OK', show: show});
        });
    });
    
    //add show to user
    show.put('/:id', function(req, res) {
        //if(!req.session.user) return res.json({status: 'ERR', msg: "Not logged in"});
        showProvider.get({id: req.params.id, type: "imdb"}, req.session.user, function(err, show) {
            if(err) return errorHandler(res, err);
            if(req.session.user) {
                models.UserShow.create({
                    user_id: req.session.user.id,
                    show_id: show.id
                }).then(function(userShow) {
                    res.json({status: 'OK', show: show});
                }, errorHandler.bind(this, res));
            } else {
                res.json({status: 'OK', show: show});
            }
        });

    });
    
    //update show on user
    show.post('/:id', function(req, res) {
        models.UserShow.update({
            last_season: req.body.last_season,
            last_episode: req.body.last_episode,
            enabled: req.body.enabled,
            favourite: req.body.favourite
        }, {
            where: {
                user_id: req.session.user.id, 
                show_id: req.params.id
            }
        }).then(function(userShow) {
            res.json({status: 'OK'});
        }, errorHandler.bind(this, res));
    });
    
    //delete show from user
    show.delete('/:id', function(req, res) {
        models.UserShow.destroy({
            where: {
                user_id: req.session.user.id, 
                show_id: req.params.id
            }
        }).then(function() {
            res.json({status: 'OK'}); 
        }, errorHandler.bind(this, res));
    });
    
    //refresh db of show async
    show.put('/:id/refresh', function(req, res) {
        showProvider.refresh(req.params.id);
        res.json({status: 'OK'});
    });

    //refresh db of show sync
    show.post('/:id/refresh', function(req, res) {
        showProvider.refresh(req.params.id, function(err, show) {
            if(err) return errorHandler(res, err);
            res.json({status: 'OK', show: show});
        });
    });
    
    //get status of episode
    show.get('/episode/:id', function(req, res) {
        showProvider.status(req.params.id, function (err, status) {
            if(err) return errorHandler(res, err);
            var result = {};
            for(var i in status) {
                if(status[i]) {
                    result[status[i].provider] = {};
                    for(var key in status[i]) {
                        if(key != "episode_id")
                            result[status[i].provider][key] = status[i][key];
                    }
                }
            }
            res.json({status: 'OK', res: result});
        });
    });
    
    //refresh status of episode
    show.post('/episode/:id/refresh', function(req, res) {
        showProvider.refreshStatus(req.params.id, function (err, status) {
            if(err) return errorHandler(res, err);
            var result = {};
            for(var i in status) {
                if(status[i]) {
                    result[status[i].provider] = {};
                    for(var key in status[i]) {
                        if(key != "episode_id")
                            result[status[i].provider][key] = status[i][key];
                    }
                }
            }
            res.json({status: 'OK', res: result});
        });
    });
    
    //search for show
    show.get('/search/:name', function(req, res) {
        showProvider.search(req.params.name, function(err, shows) {
            if(err) return errorHandler(res, err);
            res.json({status: 'OK', shows: shows});
        });
    });
    
    return show;
};


