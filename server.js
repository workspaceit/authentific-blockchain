const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config();
var PATH = 'uploads/';
const { dbConfig } = require('./config');
const { blockchainRoutes, ipfsRoutes } = require('./routes');

dbConfig.connectDB();
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
app.use(cors({ credentials: true, origin: '*' }));

try {
  fs.mkdirSync(PATH);
} catch (e) {
  if (e.code != 'EEXIST') throw e;
}
app.use('/api', blockchainRoutes);
app.use('/api', ipfsRoutes);
var dir = `${__dirname}/public`;
app.use(express.static(dir));
const port = process.env.PORT || 5000;
app.listen(port, console.log(`Server running on port ${port} `));
