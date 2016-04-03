'use strict';
/*var jsdom = require("jsdom");
var request = require("request")

//Kinox: check:   http://kinox.to/aGET/MirrorByEpisode/?Addr=Arrow-1&Season=1&Episode=15
//       search:  http://kinox.to/Search.html?q=arrow
//       showUrl: $("#RsltTableStatic tr").each((index, elem) => {if($("img[alt=type]", elem).attr("src") == "/cs/themes/default/types/series.png" && $("img[alt=language]", elem).attr("src") == "/gr/sys/lng/2.png") console.log($(".Title a",elem).attr("href"));});

module.exports = function(config) {
    this.name ="kinox";
    
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
        "http://kinox.to/Search.html?q="+encodeURI(show),
        ["http://code.jquery.com/jquery.js"],
        function (err, window) {
            if(err) return callback(err);
            var res = [];
            var mayres = [];
            window.$("#RsltTableStatic tr").each(function(index, elem) {
                if(window.$("img[alt=type]", elem).attr("src") == "/cs/themes/default/types/series.png" && window.$("img[alt=language]", elem).attr("src") == "/gr/sys/lng/2.png") {
                    var showElem = window.$(".Title a",elem);
                    mayres.push({name: showElem.text(), url: showElem.attr("href")})
                    if(show == escapeShowName(showElem.text()))
                        res.push({name: showElem.text(), url: showElem.attr("href")})
                }
            });
            if(res.length == 0) {
                console.log("No Show found", show, mayres);
                return callback(Error("Show '"+show+"' not found"));
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
    var match = /^.*\/(.*)\.html$/.exec(showUrl);
    if(!match) return callback(new Error("Corrupted Show Url"));
    
    var name = match[1];
    request("http://kinox.to/aGET/MirrorByEpisode/?Addr="+name+"&Season="+season+"&Episode="+episode, function(err, responde, body) {
        if(err) return callback(err);
        if(body.length > 0)
            return callback(null, {url: "http://kinox.to"+showUrl});
        return callback();
    });
}


function escapeShowName(name) {
   return name.
    toLowerCase().
    replace(/ |\-/g, "_").
    replace(/\(|\)|\:|\.|\;|\,|\'\"\+|\#/g, "");
}*/


const request = require("request");
const SimpleStatusProvider = require("./StatusProvider").SimpleStatusProvider;

module.exports = class KinoxStatusProvider extends SimpleStatusProvider {
    constructor(config) {
        super(config);
        this.name = "kinox";
    }
    

    buildSearchUrl(show) { 
        return "http://kinox.to/Search.html?q="+encodeURI(show.name);
    }

    findShowUrl(window, $, show) {
        return new Promise(function(resolve, reject) {
            var showName = KinoxStatusProvider.escapeShowName(show.name);
            var res = [];
            $("#RsltTableStatic tr").each(function(index, elem) {
                if($("img[alt=type]", elem).attr("src") == "/cs/themes/default/types/series.png" && $("img[alt=language]", elem).attr("src") == "/gr/sys/lng/2.png") {
                    var showElem = $(".Title a",elem);
                    if(showName == KinoxStatusProvider.escapeShowName(showElem.text()))
                        res.push({name: showElem.text(), url: showElem.attr("href")});
                }
            });
            if(res.length > 1) 
                console.log("Multiple Shows found", res);
            if(res.length > 0) resolve("http://kinox.to"+res[0].url);
            else resolve(false);
        });
    }

    getEpisodeUrl(show, season, episode) {
        var me = this;
        if(!me.cache[show.id]) {
            return me.getShowUrl(show).then(function() { 
                return me.getEpisodeUrl(show, season, episode);
            });
        }
        
        return new Promise(function(resolve, reject) {
            var match = /^.*\/(.*)\.html$/.exec(me.cache[show.id].url);
            if(!match) return reject(new Error("Corrupted Show Url"));
            
            var name = match[1];
            request("http://kinox.to/aGET/MirrorByEpisode/?Addr="+name+"&Season="+season+"&Episode="+episode, function(err, responde, body) {
                if(err) return reject(err);
                if(body.length > 0)
                    return resolve(me.cache[show.id].url);
                return resolve(false);
            });
        });
    }
    
    static escapeShowName(name) {
       return name.
        toLowerCase().
        replace(/ |\-/g, "_").
        replace(/\(|\)|\:|\.|\;|\,|\'\"\+|\#/g, "");
    }
    
};