'use strict';
var jsdom = require("jsdom");

exports.StatusProvider = class StatusProvider {
    constructor(config) {
        this.config = config;
    }
    
    getUrl(show, season, episode) {
        var me = this;
        return me.getShowUrl(show).then(function(url) {
            if(url)
                return me.getEpisodeUrl(show, season, episode);
        });
    }
    //Arg: show: Show model
    //Returns: Promise<String> url of that show
    getShowUrl(show) { throw new TypeError("Cannot call pure virtual methods directly"); }
    //Arg: show: Show model
    //     season: Season number
    //     episode: Episode number
    //Returns: Promise<String> or Promise<false> url of that episode or false for not availabe
    getEpisodeUrl(show, season, episode) { throw new TypeError("Cannot call pure virtual methods directly"); }
};

exports.SimpleStatusProvider = class SimpleStatusProvider extends exports.StatusProvider {

    constructor(config) {
        super(config);
        this.cache = {};
        
        //Disable cache of episode pages. e.g. if not all episodes are on the same URL
        //default: false (use cache)
        this.disableEpisodePageCache = false;
    }
    
    //Arg: show: Show model
    //Returns: Search url as String
    buildSearchUrl(show) { 
        throw new Error("Not Implemented");
    }
    //Arg: window: DOM of Search URL
    //     jq: jQuery Object for parsing the DOM eg. jq('#searchId a')
    //     show: Show model
    //Returns: Promise<String> or Promise<false>: 
    //         Url of that show or false for no match
    findShowUrl(window, jq, show) {
        throw new Error("Not Implemented");
    }
    //Arg: show: Show model
    //     showUrl: show url discoverd by findShowUrl
    //     season: Season number
    //     episode: Episode number
    //Returns: Episode url as String
    //default: just returns showUrl
    buildEpisodeUrl(show, showUrl, season, episode) { 
        return showUrl;
    }
    //Arg: window: DOM of Show URL
    //     jq: jQuery Object for parsing the DOM eg. jq('#searchId a')
    //     show: Show model
    //     season: Season number
    //     episode: Episode number
    //Returns: Promise<String> or Promise<false>: 
    //         Url of that episode or false for not available
    findEpisodeUrl(window, jq, show, season, episode) {
        throw new Error("Not Implemented");
    }

    
    getShowUrl(show) {
        var me = this;
        return new Promise(function(resolve, reject) {
            if(me.cache[show.id])
                return resolve(me.cache[show.id].show_url);
            jsdom.env(
                me.buildSearchUrl(show),
                ["http://code.jquery.com/jquery.min.js"],
                function (err, window) {
                    if(err) return reject(err);
                    me.findShowUrl(window, window.$, show).then(function(res) {
                        window.close();
                        if(!res) {
                            console.log("Show '"+show.name+"' not found for "+me.name);
                            //return reject(new Error("Show '"+show.name+"' not found for "+me.name));
                            me.cache[show.id] = {};
                            return resolve();
                        }
                        me.cache[show.id] = { show_url: res };
                        resolve(res);
                    }, reject);
                    
                }
            );
        });
    }
    
    getEpisodeUrl(show, season, episode) {
        var me = this;
        if(!me.cache[show.id]) {
            return me.getShowUrl(show).then(function(url) { 
                if(url)
                    return me.getEpisodeUrl(show, season, episode);
            });
        }
        var showCache = me.cache[show.id];
        //Refresh cash if older then one day
        if(showCache.page && showCache.updated_at.getTime() > (new Date().getTime() - me.config.cacheTime))
            return me.findEpisodeUrl(showCache.page, showCache.page.$, show, season, episode);
            
        return new Promise(function(resolve, reject) {
            jsdom.env(
                me.buildEpisodeUrl(show, showCache.show_url, season, episode),
                ["http://code.jquery.com/jquery.min.js"],
                function (err, window) {
                    if(err) return reject(err);
                    if(!me.disableEpisodePageCache) {
                        showCache.page = window;
                        showCache.updated_at = new Date();
                    }
                    resolve(me.findEpisodeUrl(window, window.$, show, season, episode));
                }
            );
        });    
    }
    
};
