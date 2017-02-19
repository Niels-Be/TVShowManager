const request = require('request');
const parseXML = require('xml2js').parseString;

module.exports = function(options) {
    this.name = "TheTVDB.com";
    
    this.fetch = function(id, idType, callback) {
        
        if(idType == "imdb") {
            request("http://thetvdb.com/api/GetSeriesByRemoteID.php?imdbid="+id, function(err, response, body) {
                if (err || response.statusCode != 200) return callback(err || new Error("IMDB Show not found"));
                parseXML(body, {explicitArray: false}, function(err, data) {
                    if (err) return callback(err);
                    if(!data.Data.Series)
                        console.error(data.Data);
                    else
                        doFetch(data.Data.Series.seriesid);
                });
            });
        } else
            doFetch(id);
            
        function doFetch(id) {
            request("http://thetvdb.com/api/"+options.apikey+"/series/"+id+"/all", function(err, response, body) {
                if (err || response.statusCode != 200) return callback(err || new Error("Show not found on TheTvDb"));
                parseXML(body, {explicitArray: false}, function(err, data) {
                    if (err) return callback(err);
                    data.Series = data.Data.Series;
                    var show = {
                        id: data.Series.id,
                        imdb_id: data.Series.IMDB_ID,
                        name: data.Series.SeriesName,
                        genre: data.Series.Genre,
                        started: data.Series.FirstAired,
                        ended: null,
                        air_day: data.Series.Airs_DayOfWeek,
                        air_time: data.Series.Airs_Time,
                        status: data.Series.Status,
                        image: data.Series.poster ? 'http://thetvdb.com/banners/_cache/'+data.Series.poster : null,
                        episodes: []
                    };
                    data.Episode = Array.isArray(data.Data.Episode) ? data.Data.Episode : [data.Data.Episode];
                    for(var i in data.Episode) {
                        var ep = data.Episode[i];
                        show.episodes.push({
                            id: ep.id,
                            season: ep.SeasonNumber, 
                            episode: ep.EpisodeNumber,
                            title: ep.EpisodeName ? ep.EpisodeName : 'TBA',
                            airdate: ep.FirstAired ? ep.FirstAired : '0000-00-00'
                        });
                    }
                    callback(null, show);
                });
            });
        }
    };
};
