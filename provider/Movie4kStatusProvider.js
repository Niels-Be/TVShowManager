var jsdom = require("jsdom");

var StatusProvider = function(config, provider) {
    
    var cache = {};
    var me = this;
    this.getShowUrl = function(show, callback) {
        if(cache[show.show_id])
            return callback(null, cache[show.show_id].show_url);
        jsdom.env(
            provider.buildSearchUrl(show),
            ["http://code.jquery.com/jquery.min.js"],
            function (err, window) {
                if(err) return callback(err);
                provider.findShowUrl(window, window.$, function(err, res, mayres) {
                    if(err) return callback(err);
                    if(!Array.isArray(res)) res = [res];
                    
                    if(res.length == 0) {
                        console.log("No Show found", show.name, mayres);
                        return callback(new Error("Show '"+show.name+"' not found"));
                    }
                    if(res.length > 1) 
                        console.log("Multiple Shows found", res);
                    cache[show.show_id] = { url: res[0] };
                    callback(null, res[0]);
                    window.close();
                });
                
            }
        );
    };
    
    this.getEpisodeUrl = function(show, season, episode, callback) {
        if(!cache[show.show_id]) {
            return me.getShowUrl(show, function(err) { 
                if(err) return callback(err); 
                me.getEpisodeUrl(show, season, episode, callback);
            });
        }
        if(cache[show.show_id].page) 
            return provider.findEpisode(show.page, show.page.$, callback);
            
        jsdom.env(
            "https://www.movie4k.to/"+cache[show.show_id].url,
            ["http://code.jquery.com/jquery.min.js"],
            function (err, window) {
                if(err) return callback(err);
                if(!provider.disableEpisodePageCache)
                    cache[show.show_id].page = window;
                provider.findEpisode(window, window.$, callback);
            }
        );
        
    };
};


module.exports = function(config) {
    this.name ="movie4k";
    
    this.getUrl = function(showName, season, episode, callback) {
        var match;
        if(!!(match = /^(.*) \(\d{4}\)$/.exec(showName)))
            showName = match[1];
        showName = escapeShowName(showName);
        
        getShowUrl(showName, function(err, show) {
            if(err) return callback(err);
            getEpisodeUrl(show, season, episode, function(err, url) {
               callback(err, url); 
            });
        });
        
        //callback(null, null);
    };
    
    var cache = {};
    function getShowUrl(showName, callback) {
        if(cache[showName])
            return callback(null, cache[showName]);
        jsdom.env(
            "https://www.movie4k.to/movies.php?list=search&search="+encodeURI(showName),
            ["http://code.jquery.com/jquery.js"],
            function (err, window) {
                if(err) return callback(err);
                var res = [];
                var mayres = [];
                window.$("#tablemoviesindex td > a").each(function(index, elem) {
                    var url = window.$(elem).attr('href');
                    var match =/^([\w\-]+)-watch-tvshow-(\d+)\.html$/.exec(url);
                    if(match) {
                        mayres.push({name: match[1], url: url});
                        if(showName == escapeShowName(match[1]))
                            res.push({name: match[1], url: url});
                    }
                });
                if(res.length == 0) {
                    console.log("No Show found", showName, mayres);
                    return callback(Error("Show '"+showName+"' not found"));
                }
                if(res.length > 1) 
                    console.log("Multiple Shows found", res);
                cache[showName] = { url: res[0].url };
                callback(null, cache[showName]);
                window.close();
            }
        );
    }
    
    function getEpisodeUrl(show, season, episode, callback) {
        if(show.page) return processPage(show.page);
        jsdom.env(
            "https://www.movie4k.to/"+show.url,
            ["http://code.jquery.com/jquery.js"],
            function (err, window) {
                if(err) return callback(err);
                show.page = window;
                processPage(window);
            }
        );
        
        function processPage(window) {
            window.$("#episodediv"+season+" option").each(function(index, elem) {
                elem = window.$(elem);
                 if(elem.text() == 'Episode '+episode) {
                     callback(null, {url: 'https://www.movie4k.to/'+elem.attr('value')});
                     callback = null;
                     return false;
                 }
            });
            if(callback) callback();
        }
    }
    
    function escapeShowName(name) {
       return name.
        toLowerCase().
        replace(/ |\-/g, "_").
        replace(/\(|\)|\:|\.|\;|\,|\'\"\+|\#/g, "");
    }
    
};