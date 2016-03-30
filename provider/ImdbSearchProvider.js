const request = require('request');

module.exports = function(config) {
    this.name = "IMDB";
    
    this.search = function(name, callback) {
        name = escapeShowName(name);
        if(name.length <= 2)
            return callback(null, []);
    
        var encodedName = encodeURI(name);
        request("http://sg.media-imdb.com/suggests/"+encodedName.substr(0,1)+"/"+encodedName+".json", function(err, response, body) {
            if (err || response.statusCode != 200) return callback(err || new Error("Show not found"));
            
            //parse JSONP
            var startPos = body.indexOf('({');
            var endPos = body.lastIndexOf('})');
            var jsonString = body.substring(startPos+1, endPos+1);
            var imdbShows = JSON.parse(jsonString);
            var shows = [];
            if(imdbShows.d) {
                for(var show in imdbShows.d) {
                    if(imdbShows.d[show].q == "TV series")
                        shows.push({
                            imdb_id: imdbShows.d[show].id,
                            name: imdbShows.d[show].l,
                            year: imdbShows.d[show].y,
                            img: imdbShows.d[show].i ? imdbShows.d[show].i[0] : ""
                        });
                }
            }
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