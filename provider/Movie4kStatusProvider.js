'use strict';
/*var jsdom = require("jsdom");

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
    
};

*/

const SimpleStatusProvider = require("./StatusProvider").SimpleStatusProvider;

module.exports = class Movie4kStatusProvider extends SimpleStatusProvider {
    constructor(config) {
        super(config);
        this.name = "movie4k";
    }
    

    buildSearchUrl(show) { 
        var name = Movie4kStatusProvider.escapeShowName(show.name);
        return "https://www.movie4k.to/movies.php?list=search&search="+encodeURI(name);
    }

    findShowUrl(window, $, show) {
        return new Promise(function(resolve, reject) {
            var showName = Movie4kStatusProvider.escapeShowName(show.name);
            var res = [];
            $("#tablemoviesindex td > a").each(function(index, elem) {
                var url = $(elem).attr('href');
                var match =/^([\w\-]+)-watch-tvshow-(\d+)\.html$/.exec(url);
                if(match) {
                    if(showName == Movie4kStatusProvider.escapeShowName(match[1]))
                        res.push({name: match[1], url: url});
                }
            });
            if(res.length > 1) 
                console.log("Multiple Shows found", res);
            if(res.length == 0) return resolve(false);
            //console.log(show.name, res[0].url);
            resolve("https://www.movie4k.to/" + res[0].url);
        });
    }

    findEpisodeUrl(window, $, show, season, episode) {
        return new Promise(function(resolve, reject) {
            var found = false;
            $("#episodediv"+season+" option").each(function(index, elem) {
                elem = $(elem);
                 if(elem.text() == 'Episode '+episode) {
                     found = 'https://www.movie4k.to/'+elem.attr('value');
                     return false;
                 }
            });
            //console.log(show.name, found);
            resolve(found);
        });
    }
    
    static escapeShowName(name) {
       return name.
        toLowerCase().
        replace(/\s*\(\w+\)\s*$/, "").
        replace(/ |\-/g, "_").
        replace(/\(|\)|\:|\.|\;|\,|\'\"\+|\#/g, "");
    }
    
};
