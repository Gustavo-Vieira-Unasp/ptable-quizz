const express = require("express");
const app = express();

app.get("/", function(req, res){
    res.sendFile(__dirname + "/html/index.html");
});

app.get("/sobre", function(req, res){
    res.send("Minha página sobre");
});

app.get("/blog", function(req, res){
    res.send("Minha página blog");
});

app.get("/ola/:nome", function(req, res){
    res.send("Ola, "+req.params.nome);
});

app.listen(8081, function(){
    console.log("Servidor Rodando :D");
});