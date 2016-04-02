const express = require("express");
const cookieParser = require('cookie-parser')
const session = require("express-session")
const bodyParser = require('body-parser');

const show = require("./show");
const user = require("./user");
const config = require("./config");
const models = require("./models")

var app = express();
var api = express.Router();

api.use(cookieParser());
api.use(session(config.session));
api.use(bodyParser.json());
api.use(bodyParser.urlencoded({ extended: true }));


/*

POST    /user/login         //Login -> returns fail or user settings
POST    /user/token         //Login with Token
POST    /user/register      //Register new user -> auto login
POST    /user/logout        //Logout on all sessions
POST    /user/settings      //Update user settings

GET     /show               //Get all shows for user
GET     /show/:id           //Get show info
PUT     /show/:id           //Add show for user
POST    /show/:id           //Update show for user
DELETE  /show/:id           //Remove show for user

PUT     /show/:id/refresh   //Refresh show async -> Get show info should be called later
POST    /show/:id/refresh   //Refresh show sync -> Same response as Get show info

GET     /show/episode/:id   //Get status of episode

GET     /show/search/:name  //Search for show

*/

api.use('/user/', user(config.user));
api.use('/show/', show(config.show));

app.use('/', express.static('public'));
app.use('/api/v1/', api);

models.sequelize.query('SET FOREIGN_KEY_CHECKS = 0')
.then(function(){
    return models.sequelize.sync({ force: false });
})
.then(function(){
    return models.sequelize.query('SET FOREIGN_KEY_CHECKS = 1')
})
.then(function () { 
    app.listen(process.env.PORT || 3000, process.env.IP || '0.0.0.0', function () {
      console.log('Server listen on '+process.env.IP+':'+process.env.PORT);
    });
});