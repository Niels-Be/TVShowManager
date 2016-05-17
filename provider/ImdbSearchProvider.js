const request = require('request');
const async = require("async");

module.exports = function(config) {
    this.name = "IMDB";
    
    this.search = function(name, callback) {
        name = escapeShowName(name);
        if(name.length <= 2)
            return callback(null, []);
    
        var encodedNameOrg = encodeURI(name);
        var encodedName = encodedNameOrg + " ";
        var shows = [];
      
        async.whilst(() => {
            return shows.length <= 0 && encodedName.length > 2;
        } , (cb) => {
            encodedName = encodedName.slice(0, -1);
            request("http://sg.media-imdb.com/suggests/"+encodedName.substr(0,1)+"/"+encodedName+".json", function(err, response, body) {
                if (err) return cb(err);
                if (response.statusCode != 200) return cb();
                
                //parse JSONP
                var startPos = body.indexOf('({');
                var endPos = body.lastIndexOf('})');
                var jsonString = body.substring(startPos+1, endPos+1);
                var imdbShows = JSON.parse(jsonString);
                if(imdbShows.d) {
                    for(var show in imdbShows.d) {
                        if(imdbShows.d[show].q == "TV series" && escapeShowName(imdbShows.d[show].l).startsWith(encodedNameOrg)) {
                            shows.push({
                                imdb_id: imdbShows.d[show].id,
                                name: imdbShows.d[show].l,
                                year: imdbShows.d[show].y,
                                img: imdbShows.d[show].i ? imdbShows.d[show].i[0] : ""
                            });
                        }
                    }
                }
                cb();
            });
        }, () => {
            return callback(null, shows);
        });
    };
};

function escapeShowName(name) {
   return name.
    toLowerCase().
    replace(/ /g, "_").
    replace(/\(|\)|\-|\:|\.|\;|\,|\'\"\+|\#/g, "");
}