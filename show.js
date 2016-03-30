const express = require("express");
const async = require("async");

const ShowProvider = require("./ShowProvider")

module.exports = function(config) {
    var show = express.Router();
    
    var showProvider = null;
    
    show.use(function(req, res, next) {
        if(!showProvider) showProvider = new ShowProvider(config.provider, req.models);
        req.showProvider = showProvider;
        next();
    });

    //get all shows of user
    show.get('/', function(req, res) {
        if(!req.session.user) return res.json({status: 'ERR', msg: "Not logged in"});
        req.models.userShows.find({user_id: req.session.user.user_id}, function(err, userShows) {
            if(err) return res.json({status: 'ERR', err: err, msg: err.message});
        
            var shows = [];
            async.each(userShows, function(show, callback) {
                req.showProvider.get(show.show_id, req.session.user, function(err, show) {
                    if(err) return callback(err);
                    shows.push(show);
                    callback();
                });
            }, function(err) {
                if(err) return res.json({status: 'ERR', err: err, msg: err.message});
                res.json({status: 'OK', shows: shows});
            });
        });
    });
    
    //get show info, optionaly including user info if logged in
    show.get('/:id', function(req, res) {
        req.showProvider.get(req.params.id, req.session.user, function(err, show) {
            if(err) return res.json({status: 'ERR', err: err, msg: err.message});
            res.json({status: 'OK', show: show});
        });
    });
    
    //add show to user
    show.put('/:id', function(req, res) {
        if(!req.session.user) return res.json({status: 'ERR', msg: "Not logged in"});
        req.showProvider.get({id: req.params.id, type: "imdb"}, req.session.user, function(err, show) {
            if(err) return res.json({status: 'ERR', err: err, msg: err.message});
            req.models.userShows.create({
                user_id: req.session.user.user_id,
                show_id: show.show_id
            }, function(err) {
                if(err) return res.json({status: 'ERR', err: err, msg: err.message});
                res.json({status: 'OK', show: show});
            });
        });

    });
    
    //update show on user
    show.post('/:id', function(req, res) {
        req.models.userShows.one({user_id: req.session.user.user_id, show_id: req.params.id}, function(err, userShow) {
            if(err) return res.json({status: 'ERR', err: err, msg: err.message});
            userShow.last_season = req.body.last_season;
            userShow.last_episode = req.body.last_episode;
            userShow.enabled = req.body.enabled;
            userShow.favourite = req.body.favourite;
            userShow.save(function(err) {
                if(err) return res.json({status: 'ERR', err: err, msg: err.message});
                res.json({status: 'OK'});
            });
        })
    });
    
    //delete show from user
    show.delete('/:id', function(req, res) {
        req.models.userShows.find({user_id: req.session.user.user_id, show_id: req.params.id}).remove(function(err) {
            if(err) return res.json({status: 'ERR', err: err, msg: err.message});
            res.json({status: 'OK'}); 
        });
    });
    
    //refresh db of show async
    show.put('/:id/refresh', function(req, res) {
        req.showProvider.refresh(req.params.id);
        res.json({status: 'OK'});
    });

    //refresh db of show sync
    show.post('/:id/refresh', function(req, res) {
        req.showProvider.refresh(req.params.id, function(err, show) {
            if(err) return res.json({status: 'ERR', err: err, msg: err.message});
            res.json({status: 'OK', show: show});
        });
    });
    
    //search for show
    show.get('/search/:name', function(req, res) {
        req.showProvider.search(req.params.name, function(err, shows) {
            if(err) return res.json({status: 'ERR', err: err, msg: err.message});
            res.json({status: 'OK', shows: shows});
        });
    });
    
    return show;
};


