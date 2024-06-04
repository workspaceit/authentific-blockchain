const { create } = require('ipfs-http-client');
const Binance = require('../models/Binance');
const short = require('short-uuid');
const findRemoveSync = require('find-remove');
const crypto = require('crypto');
const { encrypt } = require('../helpers');
const fs = require('fs');
var PATH = 'uploads/';

exports.uploadIpfs = async (req, res, next) => {
  const PROJECTID = process.env.PROJECTID;
  const PROJECTSECRET = process.env.PROJECTSECRET;
  const auth =
    'Basic ' + Buffer.from(PROJECTID + ':' + PROJECTSECRET).toString('base64');

  const ipfs = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
      authorization: auth,
    },
  });
  if (req.body.id) {
    let file = await Binance.findOne({
      mainFileId: req.body.id,
    });

    if (file) {
      res.status(400).json('Something went wrong');
    }
  }
  try {
    findRemoveSync(PATH, {
      age: { seconds: 10 },
      files: '*.*',
    });
  } catch (error) {
    console.log(error);
  }

  if (!req.file) {
    return res.send({
      success: false,
    });
  } else {
    const sha256Hasher = crypto.createHmac('sha256', process.env.SECRETKEY);
    const preEncryption = encrypt.encrypt(
      Buffer.from(fs.readFileSync(req.file.path))
    );
    const finalEncryption = `${preEncryption.iv} ${preEncryption.content}`;
    const hash = sha256Hasher
      .update(fs.readFileSync(req.file.path))
      .digest('hex');
    try {
      const ipfsResult = await ipfs.add(
        `${finalEncryption}:${hash}:${req.file.size}`,
        function (err, file) {
          if (err) {
            console.log(err);
          }
        }
      );

      let blockchain = {};
      blockchain.mainFileId = req.body.id || short.generate();
      blockchain['fileName'] = req.file.originalname;

      res.status(200).json({
        mainFileId: blockchain.mainFileId,
        fileName: req.file.originalname,
        hash: hash,
        size: req.file.size,
        ipfsLink: ipfsResult.path,
        fileType: req.file.mimetype,
      });
    } catch (error) {
      console.log({ error });
      res.status(400).send('Something went wrong!');
    }
  }
};

exports.bulkUploadIpfs = async (req, res, next) => {
  const PROJECTID = process.env.PROJECTID;
  const PROJECTSECRET = process.env.PROJECTSECRET;
  const auth =
    'Basic ' + Buffer.from(PROJECTID + ':' + PROJECTSECRET).toString('base64');

  const ipfs = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
      authorization: auth,
    },
  });
  if (req.body.id) {
    let file = await Binance.findOne({
      mainFileId: req.body.id,
    });

    if (file) {
      res.status(400).json('Something went wrong');
    }
  }
  try {
    findRemoveSync(PATH, {
      age: { seconds: 10 },
      files: '*.*',
    });
  } catch (error) {
    console.log(error);
  }

  if (!req.files) {
    return res.send({
      success: false,
    });
  } else {
    let result = {};
    result.data = [];
    for (const file of req.files) {
      const sha256Hasher = crypto.createHmac('sha256', process.env.SECRETKEY);
      const preEncryption = encrypt.encrypt(
        Buffer.from(fs.readFileSync(file.path))
      );
      const finalEncryption = `${preEncryption.iv} ${preEncryption.content}`;
      const hash = sha256Hasher
        .update(fs.readFileSync(file.path))
        .digest('hex');
      try {
        let blockchain = {};
        const ipfsResult = await ipfs.add(
          `${finalEncryption}:${hash}:${file.size}`,
          function (err, file) {
            if (err) {
              console.log('err', err);
            }
          }
        );
        // console.log(req.files.mimetype);
        blockchain.mainFileId = req.body.id || short.generate();
        blockchain['fileName'] = file.originalname;
        result.data.push({
          mainFileId: req.body.id || short.generate(),
          fileName: file.originalname,
          hash: hash,
          size: file.size,
          ipfsLink: ipfsResult.path,
          fileType: file.mimetype,
        });
      } catch (error) {
        console.log({ error });
        res.status(400).send('Something went wrong!');
      }
    }
    res.status(200).json(result);
  }
};

exports.bulkUploadIpfsFromExcel = async (req, res, next) => {
  const PROJECTID = process.env.PROJECTID;
  const PROJECTSECRET = process.env.PROJECTSECRET;
  const buffers = req.body.buffers;
  const auth =
    'Basic ' + Buffer.from(PROJECTID + ':' + PROJECTSECRET).toString('base64');

  const ipfs = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
      authorization: auth,
    },
  });

  if (!req.body.buffers) {
    return res.send({
      success: false,
    });
  } else {
    let result = {};
    result.data = [];
    for (const file of buffers) {
      const bufferData = Buffer.from(file.buffer.data);
      const sha256Hasher = crypto.createHmac('sha256', process.env.SECRETKEY);
      console.log({ file });
      const preEncryption = encrypt.encrypt(bufferData);
      const finalEncryption = `${preEncryption.iv} ${preEncryption.content}`;
      const hash = sha256Hasher.update(bufferData).digest('hex');
      try {
        let blockchain = {};
        const ipfsResult = await ipfs.add(
          `${finalEncryption}:${hash}:${file.size}}`,
          function (err, file) {
            if (err) {
              console.log('err', err);
            }
          }
        );
        // console.log(req.files.mimetype);
        blockchain.mainFileId = req.body.id || short.generate();
        blockchain['fileName'] = file.originalname;
        result.data.push({
          mainFileId: req.body.id || short.generate(),
          fileName: file.originalname,
          hash: hash,
          size: file.size,
          ipfsLink: ipfsResult.path,
          fileType: file.fileType,
          fileInfo: file.fileInfo,
        });
      } catch (error) {
        console.log({ error });
        res.status(400).send('Something went wrong!');
      }
    }
    res.status(200).json(result);
  }
};
