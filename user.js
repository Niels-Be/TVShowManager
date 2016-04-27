const express = require("express");
const crypto = require("crypto");

const models = require("./models")


module.exports = function(config) {
    var user = express.Router();
    
    function hashPassword(pw) {
        var hash = crypto.createHmac("sha256", config.secret);
        hash.update(pw);
        return hash.digest("hex");
    }
    
    function errorHandler(res, err) {
        console.warn(err.stack ? err.stack : err);
        res.json({ status: 'ERR', err: err, msg: err.message });
    }

    //login
    user.post('/login', function(req, res) {
        if (req.session.user) {
            return res.json({
                status: 'OK',
                username: req.session.user.name
            });
        }
        
        models.User.findOne({
            attributes: { exclude: ['password'] },
            where: {
                name: req.body.username,
                password: hashPassword(req.body.password)
            }
        }).then(function(user) {
            if (!user) return res.json({
                status: 'ERR',
                msg: "Username or Password not found"
            });

            req.session.user = {
                id: user.id,
                name: user.name
            }

            if (req.body.stay) {
                var hash2 = crypto.createHash('sha256');
                hash2.update("Token:" + user.id + user.name + Math.random() + "@" + new Date().getTime());
                var token = hash2.digest("hex");
                models.UserToken.create({
                    user_id: user.id,
                    token: token
                }).then(function() {
                    res.cookie('token', token, {
                        maxAge: 2592000000
                    });
                    res.json({
                        status: 'OK',
                        username: user.name
                    });
                }, errorHandler.bind(this, res));
            }
            else {
                res.json({
                    status: 'OK',
                    username: req.session.user.name
                });
            }
        }, errorHandler.bind(this, res));
    });

    //login with token
    user.post('/token', function(req, res) {
        if (req.session.user) {
            return res.json({
                status: 'OK',
                username: req.session.user.name
            });
        }
        if(!req.cookies.token) {
            return res.json({
                status: 'ERR',
                msg: "Token not set"
            });
        }
        
        models.User.findOne({
            attributes: { exclude: ['password'] },
            include: [{
                model: models.UserToken,
                where: { token: req.cookies.token }
            }]
        }).then(function(user) {
            if (!user) {
                res.clearCookie('token');
                return res.json({
                    status: 'ERR',
                    msg: "Session expired"
                });
            }

            req.session.user = {
                id: user.id,
                name: user.name
            };
            res.cookie('token', req.cookies.token, {
                maxAge: 2592000000
            });
            res.json({
                status: 'OK',
                username: user.name
            });

        }, errorHandler.bind(this, res));
    });

    //register new acc and login
    user.post('/register', function(req, res) {

        models.User.create({
            name: req.body.username,
            password: hashPassword(req.body.password)
        }).then(function(user) {
            req.session.user = {
                id: user.id,
                name: user.name
            };
            res.json({
                status: 'OK',
                username: user.name
            });
        }, function(err) {
            if (err.name == 'SequelizeUniqueConstraintError')
                return res.json({
                    status: 'ERR',
                    msg: "Username already exists"
                });
            errorHandler(res,err);
        });
    });

    //logout
    user.post('/logout', function(req, res) {
        if (req.session.user) {
            models.UserToken.destroy({
                where: {
                    user_id: req.session.user.id
                }
            }).then(function() {
                req.session.destroy(function() {
                    res.clearCookie('token');
                    res.json({
                        status: 'OK'
                    });
                });
            }, errorHandler.bind(this, res));
        }
        else {
            req.session.destroy(function() {
                res.clearCookie('token');
                res.json({
                    status: 'OK'
                });
            });
        }
    });

    //update settings
    user.post('/settings', function(req, res) {
        res.json({
            status: 'ERR',
            msg: "Not yet implemented"
        });
    });

    return user;
};