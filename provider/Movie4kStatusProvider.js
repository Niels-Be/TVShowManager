var jsdom = require("jsdom");

module.exports = function(config) {
    this.name ="movie4k";
    
    this.getUrl = function(show, season, episode, callback) {
        getShowUrl(show, function(err, showUrl) {
            if(err) return callback(err);
            getEpisodeUrl(showUrl, season, episode, function(err, url) {
               callback(err, url); 
            });
        });
        
        //callback(null, null);
    };
};

var cache = {};
function getShowUrl(show, callback) {
    var match;
    if(!!(match = /^(.*) \(\d{4}\)$/.exec(show)))
        show = match[1];
    show = escapeShowName(show);
    if(cache[show])
        return callback(null, cache[show]);
    jsdom.env(
        "https://www.movie4k.to/movies.php?list=search&search="+encodeURI(show),
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
                    if(show == escapeShowName(match[1]))
                        res.push({name: match[1], url: url});
                }
            });
            if(res.length == 0) {
                console.log("No Show found", show, mayres);
                return callback(new Error("Show not found"));
            }
            if(res.length > 1) 
                console.log("Multiple Shows found", res);
            cache[show] = res[0].url;
            callback(null, res[0].url);
            window.close();
        }
    );
}

function getEpisodeUrl(showUrl, season, episode, callback) {
    jsdom.env(
        "https://www.movie4k.to/"+showUrl,
        ["http://code.jquery.com/jquery.js"],
        function (err, window) {
            if(err) return callback(err);
            window.$("#episodediv"+season+" option").each(function(index, elem) {
                elem = window.$(elem);
                 if(elem.text() == 'Episode '+episode) {
                     callback(null, {url: 'https://www.movie4k.to/'+elem.attr('value')});
                     callback = null;
                     return false;
                 }
            });
            if(callback) callback();
            window.close();
        }
    );
}

function escapeShowName(name) {
   return name.
    toLowerCase().
    replace(/ |\-/g, "_").
    replace(/\(|\)|\:|\.|\;|\,|\'\"\+|\#/g, "");
}