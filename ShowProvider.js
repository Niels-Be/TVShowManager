const async = require("async");

module.exports = function(config, models) {
    var searchProvider = loadProvider("search");
    var metadataProvider = loadProvider("metadata");
    var statusProvider = loadProvider("status");

    
    this.get = function(id, user, callback) {
        //Parameter parsing
        //user is optional
        if(!callback) {
            callback = user;
            user = null;
        }
        //id may be object: {id: String, type: String}
        var type = null;
        if(id.type) {
            type = id.type;
            id = id.id;
        }
        
        
        var idQuery = {id: id};
        if(type == "imdb") 
            idQuery = {imdb_id: id};
            
        var userQuery = null;
        if(user)
            userQuery = {
                model: models.User,
                where: { id: user.id }
            };
            
        models.Show.findOne({
            where: idQuery, 
            include: [
                userQuery,
                {
                    model: models.Episode,
                    as: 'episodes'
                }
            ]
        }).then(function(show) {
            if(show) return callback(null, show);

            refresh(id, type, callback);
            
        }, callback);
    };
    
    var refresh = this.refresh = function(id, type, callback) {
        if(!callback) {
            if(type) {
                callback = type;
                type = null;
            } else //Dummy callback
                callback = function(err) { if(err) console.error("Error:", err.message, "\n", err); };
        }
        
        metadataProvider[0].fetch(id, type, function(err, show) {
            if(err) return callback(err);
            if(show) {
                models.Show.upsert(show).then(function(created) {
                    async.each(show.episodes, function(elem, cb) { 
                        elem.show_id = show.id; 
                        models.Episode.upsert(elem).then(cb.bind(null, null), cb);
                    }, function(err) {
                        callback(err, show);
                    });
                    
                },callback);
            }
            else
                callback(new Error("Show not found"));
        });
    };
    
    this.search = function(name, callback) {
        return searchProvider[0].search(name, callback);
    };
    
    this.status = function(episodeId, callback) {
        models.EpisodeStatus.findAll({where: {episode_id: episodeId}}).then(function(status) {
            if(status && status.length > 0) return callback(null, status);
            
            refreshStatus(episodeId, callback);
        }, callback);
    };
    
    var refreshStatus = this.refreshStatus = function (episodeId, callback) {
        models.Episode.findOne({
            where: { id: episodeId },
            include: [models.Show]
        }).then(function(episode) {
            async.map(statusProvider, function(provider, cb) {
                provider.getUrl(episode.Show, episode.season, episode.episode).then(function(status) {
                    var epStatus = {
                        episode_id: episodeId,
                        provider: provider.name,
                        url: status ? status : null
                    };
                    models.EpisodeStatus.upsert(epStatus).then(function() {
                        cb(null, epStatus);
                    }, cb);
                }, cb);
            }, function(err, res) {
                callback(err, res);
            });
        });
    };
    
    
    function loadProvider(type) {
        var res = [];
        for(var key in config[type]) {
            //disable a Provider by setting it to false
            if(!config[type][key]) continue;
            
            var provider = null;
            try {
                provider = require("./provider/"+key);
            } catch(e) {
                console.log(e, '\n', e.stack.split("\n"));
                try {
                    provider = require(key);
                } catch(e) {
                    console.log(e, '\n', e.stack.split("\n"));
                    provider = global[key];
                } 
            } 
            if(!provider)
                throw new Error("Could not find "+key+"; it may not be installed");
            res.push(new provider(config[type][key]));
        }
        return res;
    }
};