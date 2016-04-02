var jsdom = require("jsdom");

var DemoStatusProvider = {
    //Arg: show: Show model
    //Returns: Search url as String
    buildSearchUrl: function(show) { return String; },
    //Arg: window: DOM of Search URL
    //     jq: jQuery Object for parsing the DOM eg. jq('#searchId a')
    //     show: Show model
    //     callback: callback(error, [url]) 
    //       url: String, Array<String> or false: Url or possible Urls of that show or false for no match
    findShowUrl: function(window, jq, show, callback) {},
    //Arg: show: Show model
    //     showUrl: show url discoverd by findShowUrl
    //     season: Season number
    //     episode: Episode number
    //Returns: Episode url as String
    //default: just returns showUrl
    buildEpisodeUrl: function(show, showUrl, season, episode) { return String; },
    //Arg: window: DOM of Show URL
    //     jq: jQuery Object for parsing the DOM eg. jq('#searchId a')
    //     show: Show model
    //     season: Season number
    //     episode: Episode number
    //     callback: callback(error, url) 
    //       url: String or false: Url of that episode or false for no match
    findEpisodeUrl: function(window, jq, show, season, episode, callback) {},
    //Disable cache of episode pages. e.g. if not all episodes are on the same URL
    //default: false (use cache)
    disableEpisodePageCache: Boolean
};

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
                provider.findShowUrl(window, window.$, show, function(err, res) {
                    if(err) return callback(err);
                    if(res && !Array.isArray(res)) res = [res];
                    
                    if(!res || res.length == 0) {
                        console.log("No Show found", show.name);
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
            return provider.findEpisodeUrl(cache[show.show_id].page, cache[show.show_id].page.$, show, season, episode, callback);
            
        jsdom.env(
            provider.buildEpisodeUrl(show, cache[show.show_id].url, season, episode),
            ["http://code.jquery.com/jquery.min.js"],
            function (err, window) {
                if(err) return callback(err);
                if(!provider.disableEpisodePageCache)
                    cache[show.show_id].page = window;
                provider.findEpisodeUrl(window, window.$, show, season, episode, callback);
            }
        );
        
    };
};

module.exports = StatusProvider;