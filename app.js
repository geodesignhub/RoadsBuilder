var express = require("express");
var req = require('request');
var async = require('async');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var ejs = require('ejs');
var csrf = require('csurf');
var app = express();
app.set('view engine', 'ejs');
// app.use(express.static(__dirname + '/views'));
app.use('/assets', express.static('static'));
app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(cookieParser());
app.use(csrf({ cookie: true }));

app.get('/', function(request, response) {
    var opts = {};
    if (request.query.apitoken && request.query.projectid) {
        // var baseurl = 'https://www.geodesignhub.com/api/v1/projects/';
        var baseurl = 'http://local.dev:8000/api/v1/projects/';
        var apikey = request.query.apitoken;
        var cred = "Token " + apikey;
        var projectid = request.query.projectid;
        var diagramid = request.query.diagramid;
        var boundsurl = baseurl + projectid + '/bounds/';
        var systemsurl = baseurl + projectid + '/systems/';

        var URLS = [boundsurl, systemsurl];

        async.map(URLS, function(url, done) {
            req({
                url: url,
                headers: {
                    "Authorization": cred,
                    "Content-Type": "application/json"
                }
            }, function(err, response, body) {
                if (err || response.statusCode !== 200) {
                    return done(err || new Error());
                }
                return done(null, JSON.parse(body));
            });
        }, function(err, results) {
            if (err) return response.sendStatus(500);
            opts = {
                "csrfToken": request.csrfToken(),
                "apitoken": request.query.apitoken,
                "projectid": request.query.projectid,
                "status": 1,
                "bounds": JSON.stringify(results[0]),
                "systems": JSON.stringify(results[1]),
            };
            response.render('diagrambuilder', opts);
        });

    } else {
        opts = { 'csrfToken': request.csrfToken(), 'systems': '0', 'apitoken': '0', 'projectid': '0', 'bounds': '0' };
        response.render('diagrambuilder', opts);
    }

});

app.post('/adddiagram/', function(request, response) {
    // post json back 
    // var baseurl = 'https://www.geodesignhub.com/api/v1/projects/';
    var baseurl = 'http://local.dev:8000/api/v1/projects/';
    var projectid = request.body.projectid;
    var apitoken = request.body.apitoken;
    var diagname = request.body.diagname;
    var targetsysid = request.body.targetsysid;
    var projectorpolicy = request.body.projorpol;
    var gj = JSON.parse(request.body.gj);

    var cred = "Token " + apitoken;
    var addurl;
    if (projectorpolicy == 'project') {
        addurl = baseurl + projectid + '/' + 'systems' + '/' + targetsysid + '/add/project/';
    } else if (projectorpolicy == 'policy') {
        addurl = baseurl + projectid + '/' + 'systems' + '/' + targetsysid + '/add/policy/';
    }
    var json = { "featuretype": "polygon", "description": diagname, "geometry": gj };


    var options = {
        url: addurl,
        method: "POST",
        headers: {
            "Authorization": cred,
            "content-type": "application/json"
        },
        json: json
    };

    function callback(error, resp, body) {

        if (error) return response.sendStatus(500);
        response.contentType('application/json');
        response.send({
            "status": 1,
            "body": body
        });

    }
    req(options, callback);


});

app.listen(process.env.PORT || 5001);