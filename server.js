var express = require('express');
var app = express();
var fs = require("fs");
var mysql = require('mysql');
const http = require('http');
var request = require ('request');

var bodyParser = require('body-parser')
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use('/api/1.0', api);

var con = mysql.createConnection({
  host: "localhost", 
  user: "root", 
  password: "", 
  database: "FFXIV"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});




api.get('/player/:id', function (req, res) {
    var id = req.params.id;
    // TODO la requête n'a pas changée avec le modèle
    var sql = 'SELECT * FROM characters inner join characters_items on characters.id = characters_items.character_id inner join sets on characters_items.id = sets.character_item_id WHERE characters.id = ?;';
    con.query( sql, [id] , function (err, result) {
        if (err) throw err;
        res.send(result);
  });

});

//TODO il n'y a pas de set à tester
api.get('/set/:id', function (req, res) {
    var id = req.params.id;
    var sql = 'SELECT * FROM sets WHERE id = ? ;';
    con.query( sql, [id] , function (err, result) {
        if (err) throw err;
        res.send(result);
  });

});

api.get('/team/:id', function (req, res) {
    var id = req.params.id;
    var sql = 'SELECT * FROM characters_teams WHERE team_id = ? ;';
    con.query( sql, [id] , function (err, result) {
        if (err) throw err;
        res.send(result);
  });

});

api.get('/instance', function (req, res) {
  var sql = 'SELECT * FROM instance;';
    con.query( sql, function (err, result) {
        if (err) throw err;
        res.send(result);
  });
});

api.get('/class', function(req, res){
    con.query('select * from class;', function(err, result){
        if (err) throw err;
        res.send(result);
    })
});


api.post('/set', function (req, res1) {
    console.log(req.body);
    /*if(req.body == {}){
        res.status(400)
        res.send("put an ariyala link here please")
    }
    else{*/
        id='14PF6'
        http.get("http://ffxiv.ariyala.com/store.app?identifier="+id, function(res){
            res.on("data", function(data){
                truc = JSON.parse(data);
                items = Object.values(truc.datasets[truc.content].normal.items);
                request({
                    header:{
                        'Content-Type' :"application/x-www-form-urlencoded"
                    }, 
                    uri: "http://ffxiv.ariyala.com/items.app", 
                    body: '{"queries":[{"items":['+items+']}], "existing":[]}', 
                    method: 'POST'
                }, function(error, response, data){
                    data = JSON.parse(data);
                    if(data.length==11 || data.length==12){
                        console.log('blu')
                        con.query('select count(*) as nb from sets_list where id = ?;', [id] , function(err, result){
                            if (err) throw err;
                            if (result[0].nb == 0) {
                                con.query('insert into sets_list (id) values (?);', [id], function(err, result){
                                    if (err) throw err;
                                });
                                for (var i = data.length - 1; i >= 0; i--) {
                                    if(typeof data[i].source.crafting !== typeof undefined){
                                        stars = "";
                                        for (var j = data[i].source.crafting.stars.length - 1; j >= 0; j--) {
                                            stars += "★"
                                        }
                                        craft = data[i].source.crafting.class +" (" + stars+")";
                                        dataSQL = [data[i].name.en, 0, null, data[i].slot, craft]
                                    }
                                    else if(typeof data[i].source.purchase === typeof undefined){
                                        dataSQL = [data[i].name.en, 0, null, data[i].slot, data[i].source.drop.name]
                                    }else if (typeof data[i].source.drop === typeof undefined){
                                        dataSQL = [data[i].name.en, data[i].source.purchase[0].price[0][1].amount, data[i].source.purchase[0].price[0][1].item, data[i].slot, "purchase only"];
                                        con.query('insert ignore into currency (name) values (?);', [data[i].source.purchase[0].price[0][1].item], function(err, result){
                                            if (err) throw err;
                                        })
                                    }else{
                                        dataSQL = [data[i].name.en, data[i].source.purchase[0].price[0][0].amount, data[i].source.purchase[0].price[0][0].item, data[i].slot, data[i].source.drop.name];
                                        con.query('insert ignore into currency (name) values (?);', [data[i].source.purchase[0].price[0][0].item], function(err, result){
                                            if (err) throw err;
                                        })
                                    }
                                    if(typeof data[i].source.drop !== typeof undefined){
                                        con.query('insert ignore into instance (name) values (?);', [data[i].source.drop.name], function(err, result){
                                            if (err) throw err;
                                        })
                                    }

                                    con.query('insert ignore into items (name, amount, currency, type, instance) values (?, ?, ?, ?, ?);', dataSQL, function(err, result){
                                        if (err) throw err;
                                    })
                                    con.query('insert into sets (item_id, set_id) values (?, ?);', [data[i].itemID, id], function(err, result){
                                        if (err) throw err;
                                    })
                                }
                            }
                       })
                    }
                    else{
                        res1.status(400)
                        res1.send("set pas complet");
                    }
                })
            })          
        })
    //}
    
});

api.put('/set/:id', function (req, res) {
// ça fonctionne bien là

});

api.post('/team', function (req, res) {
    con.query('select count(*) as nb from teams where name = ?;', [req.body.name] , function(err, result){
        if (err) throw err;
        if (result[0].nb == 0) {
            con.query('insert into teams (name) values (?);', [req.body.name], function(err, result){
                if (err) throw err;
            });
            con.query('select id from teams where name = ?;', [req.body.name], function(err, result){
                if (err) throw err;
                id = result[0].id
                for (var j = req.body.player.length - 1; j >= 0; j--) {
                var i=j
                    con.query('insert into characters_teams (team_id, character_id, class) values (?, (select id from characters where name = ?), ?);', [id, req.body.player[i].name, req.body.player[i].class], function(err, result){
                        if(err) throw err;
                    });
                }
                res.status(200)
                res.send('ok')
            });
        }
        else{
            res.status(400)
            res.send("une team a déjà ce nom");
        }
    });  

});

api.put('/team/:id', function (req, res) {
  con.query('insert into characters_teams(team_id, character_id) values (?, (select id from characters where name = ?), ?)', [id, req.body.player[0], req.body.player[1]], function(err, result){
    if(err) throw err;
    });
});

api.post('/character', function (req, res) {
    if(typeof req.body.name === typeof undefined){
        res.status(400);
        res.send("name missing")
        return
    }
    con.query('select count(*) as nb from characters where name = ?;', [req.body.name] , function(err, result){
        if (err) throw err;
        if(result[0].nb == 0){
            con.query('insert into characters (name) values (?);', [req.body.name], function(err, result){
                if (err) throw err;
            });
            res.status(200)
            res.send("OK")
        }
        else{
            res.status(400)
            res.send("name already used");
        }
    }); 
});

api.put('/character', function (req, res) {
    con.query('select count(*) as nb from characters where name = ?;', [req.body.name] , function(err, result){
        if (err) throw err;
        if(result[0].nb == 0){
            con.query('update characters set name=? where id = ?', [req.body.name, parseInt(req.body.id)], function(err, result){
                if(err) throw err;
                res.status(200)
                res.send("ok")
            })
        }
        else{
            res.send("Name already taken");
        }
    });
});






var server = app.listen(3210, function () {

    var host = server.address().address
    var port = server.address().port
    console.log("Listening at http://%s:%s", host, port)

})
