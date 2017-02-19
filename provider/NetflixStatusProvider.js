'use strict()';

const request = require("request");
const StatusProvider = require("./StatusProvider").StatusProvider;

const SESSION_TIMEOUT = 1 * 60 * 60 * 1000;

module.exports = class NetflixStatusProvider extends StatusProvider {
    constructor(config) {
        super(config);
        this.name = "netflix";
        this.cache = {};
        this.sessionJar = null;
    }

    aquireSession() {
        var me = this;
        return new Promise((resolve, reject) => {
            if (me.sessionJar) return resolve(me.sessionJar);
            var j = request.jar();
            reqeust({
                url: "http://unogs.com/",
                jar: j
            }, (err) => {
                if (err) {
                    console.error(err);
                    return;
                }
                me.sessionJar = j;
                setTimeout(() => {
                    me.sessionJar = null;
                }, SESSION_TIMEOUT);
                resolve(j);
            });
        });
    }

    doRequest(show, urlQuery) {
        return this.aquireSession().then((jar) => {
            var session = jar.getCookies("http://unogs.com/").filter((e) => {
                return e.key == 'cooksess';
            })[0];
            jar.setCookie(request.cookie("sstring=" + encodeURI(show.name) + "-!and"), "http://unogs.com/");
            return new Promise((resolve, reject) => {
                request({
                    url: "http://unogs.com/cgi-bin/nf.cgi?u=" + session + urlQuery,
                    jar: jar,
                    json: true,
                    //headers: {
                    //    'Referer': "http://unogs.com/?q=" + encodeURI(show.name) + "&st=bs"
                    //}
                }, (err, response, body) => {
                    if (err) return reject(err);
                    resolve(body, response);
                });
            });
        });
    }


    //Arg: show: Show model
    //Returns: Promise<String> url of that show
    getShowUrl(show) {
        var me = this;
        if (me.cache[show.id])
            return Promise.resolve("https://www.netflix.com/title/" + me.cache[show.id].id);
        
        return this.doRequest(show, "&q=" + encodeURI(show.name) + "&t=ns&cl=&st=bs&ob=&p=1&l=100&inc=&ao=and").then((body) => {
            var res = body.ITEMS.filter((e) => {
                return e[6] == "series";
            })[0];
            return {
                id: res[0],
                name: res[1],
                img: res[2],
                id2: res[4],
                relevance: res[5],
                year: res[7]
            };
        }).then((resShow) => {
            me.cache[show.id] = resShow;
            return "https://www.netflix.com/title/" + resShow.id;
        });
    }
        //Arg: show: Show model
        //     season: Season number
        //     episode: Episode number
        //Returns: Promise<String> or Promise<false> url of that episode or false for not availabe
    getEpisodeUrl(show, season, episode) {
        var me = this;
        if (!me.cache[show.id]) {
            return me.getShowUrl(show).then((url) => {
                return me.getEpisodeUrl(show, season, episode);
            });
        }
        return this.doRequest(show, "&t=episodes&q="+me.cache[show.id].id).then((body) => {
            var seas = body.RESULTS.filter((e)=>{return e.seasnum==season;})[0];
            if(!seas) return false;
            var eps = seas.episodes.filter((e)=>{return e[2]==episode;})[0];
            if(!eps) return false;
            return "https://www.netflix.com/watch/" + eps[0];
        });
    }

};