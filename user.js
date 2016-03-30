const express = require("express");
const crypto = require("crypto");

module.exports = function(config) {
    var user = express.Router();

    //login
    user.post('/login', function(req, res) {
        if (req.session.user) {
            return res.json({
                status: 'OK',
                username: req.session.user.name
            });
        }
        var hash = crypto.createHash('sha256');
        hash.update(req.body.password);
        req.models.user.one({
            name: req.body.username,
            password: hash.digest("hex")
        }, function(err, result) {
            if (err) return res.json({
                status: 'ERR',
                err: err,
                msg: err.message
            });
            if (!result) return res.json({
                status: 'ERR',
                msg: "Username or Password not found"
            });

            req.session.user = result;

            if (req.body.stay) {
                var hash2 = crypto.createHash('sha256');
                hash2.update("Token:" + result.user_id + result.name + Math.random() + "@" + new Date().getTime());
                var token = hash2.digest("hex");
                req.models.userToken.create({
                    user_id: result.user_id,
                    token: token
                }, function(err) {
                    if (err) return res.json({
                        status: 'ERR',
                        err: err,
                        msg: err.message
                    });
                    res.cookie('token', token, {
                        maxAge: 2592000000
                    });
                    res.json({
                        status: 'OK',
                        username: result.name
                    });
                });
            }
            else {
                res.json({
                    status: 'OK',
                    username: req.session.user.name
                });
            }
        });
    });

    //login with token
    user.post('/token', function(req, res) {
        if (req.session.user) {
            return res.json({
                status: 'OK',
                username: req.session.user.name
            });
        }
        //return res.json({status: 'ERR', msg: 'Not logged in'});
        req.models.userToken.one({
            token: req.cookies.token
        }, function(err, result) {
            if (err) return res.json({
                status: 'ERR',
                err: err,
                msg: err.message
            });
            if (!result) return res.json({
                status: 'ERR',
                msg: "Token not found"
            });

            req.models.user.get(result.user_id, function(err, user) {
                if (err) return res.json({
                    status: 'ERR',
                    err: err,
                    msg: err.message
                });
                if (user) {
                    req.session.user = user;
                    res.cookie('token', req.cookies.token, {
                        maxAge: 2592000000
                    });
                    res.json({
                        status: 'OK',
                        username: user.name
                    });
                }
            });
        });
    });

    //register new acc and login
    user.post('/register', function(req, res) {
        var hash = crypto.createHash('sha256');
        hash.update(req.body.password);
        req.models.user.create({
            user_id: 0,
            name: req.body.username,
            password: hash.digest("hex")
        }, function(err, result) {
            if (err) {
                if (err.code == 'ER_DUP_ENTRY')
                    return res.json({
                        status: 'ERR',
                        msg: "Username already exists"
                    });
                return res.json({
                    status: 'ERR',
                    err: err,
                    msg: err.message
                });
            }
            req.session.user = result;
            res.json({
                status: 'OK',
                username: result.name
            });
        });
    });

    //logout
    user.post('/logout', function(req, res) {
        if (req.session.user) {
            req.models.userToken.find({
                user_id: req.session.user.user_id
            }).remove(function(err) {
                if (err) return res.json({
                    status: 'ERR',
                    err: err,
                    msg: err.message
                });
                req.session.destroy(function() {
                    res.clearCookie('token');
                    res.json({
                        status: 'OK'
                    });
                });
            });
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