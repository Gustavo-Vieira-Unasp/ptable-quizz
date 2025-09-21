const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api_routes'); 

const app = express();

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

app.use('/api', apiRoutes);

module.exports = app;