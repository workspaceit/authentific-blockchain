const ObjectId = require('mongodb').ObjectId;
const axios = require('axios');
const findRemoveSync = require('find-remove');
const gs = require('ghostscript-node');
const moment = require('moment');
const crypto = require('crypto');
const Binance = require('../models/Binance');
const { decrypt } = require('../helpers');
const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');
const dirname = path.resolve();
const web3 = require('../config/blockchain/web3');
const verify = require('../config/blockchain/verify');
const FileType = require('file-type');
const puppeteer = require('puppeteer');
const request = require('request');
var DPATH = 'public/temp';
var PATH = 'uploads/';

exports.saveToDatabase = async (req, res, next) => {
  const { uploadIpfsRes } = req.body;
  if (uploadIpfsRes?.length > 0) {
    try {
      const saveToDB = await Binance.insertMany(uploadIpfsRes);
      res.status(200).json(saveToDB);
    } catch (error) {
      res.status(400).json('Something went wrong');
    }
  } else {
    try {
      if (uploadIpfsRes.parent) {
        const parent = await Binance.findOne({ _id: uploadIpfsRes.parent });
        if (!parent)
          return res.status(400).json({ message: 'Main document not found' });
      }
      let updatedCandidate = await Binance.create({
        mainFileId: uploadIpfsRes.mainFileId || '',
        transaction: uploadIpfsRes.transactionHistory,
        hash: uploadIpfsRes?.hash?.toString(),
        fileSize: uploadIpfsRes.size,
        userId: uploadIpfsRes.userId,
        fileType: uploadIpfsRes.fileType,
        fileInfo: uploadIpfsRes.fileInfo,
        parent: uploadIpfsRes.parent,
      });

      res.status(200).json(updatedCandidate);
    } catch (error) {
      console.log(error);
      res.status(400).json('Something went wrong');
    }
  }
};

exports.updateToDatabase = async (req, res) => {
  try {
    const { updateIpfsRes } = req.body;
    const file = await Binance.findById(updateIpfsRes._id);
    file.fileInfo = updateIpfsRes.fileInfo;
    const response = await file.save();
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json('Something went wrong');
  }
};

exports.getBlockchainFile = async (req, res, next) => {
  try {
    const { id } = req.body;
    let regexp = new RegExp(`${id}`);
    let update = await Binance.find({
      // where: { mainFileId: regexp },
      mainFileId: id,
    });

    res.status(200).send(update);
  } catch (error) {
    res.status(400).json('Something went wrong');
  }
};
exports.getFileDatabase = async (req, res, next) => {
  try {
    const { id } = req.body;
    let file = await Binance.findOne({
      _id: mongoose.Types.ObjectId(id),
    });
    res.status(200).send(file);
  } catch (error) {
    res.status(400).json('Something went wrong');
  }
};

exports.downloadBlockchainFile = async (req, res, next) => {
  const { ipfsFileHash } = req.body;
  const PROJECTID = process.env.PROJECTID;
  const PROJECTSECRET = process.env.PROJECTSECRET;
  const auth =
    'Basic ' + Buffer.from(PROJECTID + ':' + PROJECTSECRET).toString('base64');

  const config = {
    headers: {
      Authorization: auth,
    },
  };
  const url = `https://ipfs.infura.io:5001/api/v0/cat?arg=${ipfsFileHash}`;
  //for decrypt
  let ipfsData;
  try {
    ipfsData = await axios.post(url, {}, config);
  } catch (err) {
    console.log(err);
    res.status(400).json('Something went wrong');
  }

  try {
    findRemoveSync(DPATH, {
      age: { seconds: 10800 },
      files: '*.*',
    });
  } catch (error) {
    console.log(error);
  }
  const myStr = ipfsData.data.split(':');
  let pdfSha256Hash = myStr[0];
  let pdfSize = myStr[2];
  let pdfEncryptedString = myStr[1];
  const hashIvContent = pdfSha256Hash.split(' ');
  const hash = {};
  hash.iv = hashIvContent[0];
  hash.content = hashIvContent[1];
  var dir = `${dirname}/public`;
  var dir2 = `${dirname}/public/temp`;
  var verifyDir = `${dirname}/public/verify`;
  // console.log({ dir2 });
  try {
    fs.mkdirSync(dir);
    fs.mkdirSync(dir2);
  } catch (e) {
    if (e.code != 'EEXIST') throw e;
  }
  const decryptbuffer = decrypt.decrypt(hash);
  const { mime: fileType } = await FileType.fromBuffer(decryptbuffer);
  //converting buffer to image
  const imagePdf = decryptbuffer;
  if (fileType === 'application/pdf') {
    try {
      const renderedPages = await gs.renderPDFPagesToPNG(imagePdf);
      fs.writeFile(
        `${dir2}/${ipfsFileHash}.jpg`,
        renderedPages[0],
        function (err, written) {
          if (err) console.log(err);
          else {
            console.log('Successfully written');
          }
        }
      );
    } catch (error) {
      res.status(400).json('Something went wrong');
    }

    //done converting
    //res.json(response);
    fs.writeFile(`${dir2}/${ipfsFileHash}.pdf`, decryptbuffer, (err) => {
      if (!err) console.log('Data written');
    });
    res.status(200).json({
      pdf: `temp/${ipfsFileHash}.pdf`,
      image: `temp/${ipfsFileHash}.jpg`,
      size: pdfSize,
      hash: pdfEncryptedString,
      bufferToString: decryptbuffer.toString('base64'),
      fileType: 'pdf',
    });
  } else {
    fs.writeFile(`${dir2}/${ipfsFileHash}.jpg`, decryptbuffer, (err) => {
      if (!err) console.log('Data written');
    });
    res.status(200).json({
      image: `temp/${ipfsFileHash}.jpg`,
      size: pdfSize,
      hash: pdfEncryptedString,
      bufferToString: decryptbuffer.toString('base64'),
      fileType: 'image',
    });
  }
};

exports.getSha256Hash = async (req, res, next) => {
  const sha256Hasher = crypto.createHmac('sha256', process.env.SECRETKEY);
  const hash = sha256Hasher
    .update(fs.readFileSync(req.file.path))
    .digest('hex');
  try {
    findRemoveSync(PATH, {
      age: { seconds: 10 },
      files: '*.*',
    });
  } catch (error) {
    console.log(error);
  }

  const result = await Binance.findOne({ hash });
  if (result) {
    await Binance.findByIdAndUpdate(
      { _id: result._id },
      { totalVerificationCount: result.totalVerificationCount + 1 }
    );
    res.status(200).send({ hash });
  } else {
    res.status(200).json({ hash });
  }
};

exports.getDashboardDocumentCount = async (req, res, next) => {
  const { userId } = req.body;
  // console.log(userId);
  const FIRST_MONTH = 1;
  const LAST_MONTH = 12;
  const MONTHS_ARRAY = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  let TODAY = new Date().toISOString();
  let MONTH_BEFORE = moment(Date.now()).subtract(5, 'months').format();
  Binance.aggregate([
    {
      $match: {
        userId: String(userId),
        createdAtLocalTime: { $gte: MONTH_BEFORE, $lte: TODAY },
      },
    },
    {
      $group: {
        _id: { year_month: { $substrCP: ['$createdAtLocalTime', 0, 7] } },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.year_month': 1 },
    },
    {
      $project: {
        _id: 0,
        count: 1,
        month_year: {
          $concat: [
            {
              $arrayElemAt: [
                MONTHS_ARRAY,
                {
                  $subtract: [
                    { $toInt: { $substrCP: ['$_id.year_month', 5, 2] } },
                    1,
                  ],
                },
              ],
            },
            '-',
            { $substrCP: ['$_id.year_month', 0, 4] },
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        data: { $push: { k: '$month_year', v: '$count' } },
      },
    },
    {
      $addFields: {
        start_year: { $substrCP: [MONTH_BEFORE, 0, 4] },
        end_year: { $substrCP: [TODAY, 0, 4] },
        months1: {
          $range: [
            { $toInt: { $substrCP: [MONTH_BEFORE, 5, 2] } },
            { $add: [LAST_MONTH, 1] },
          ],
        },
        months2: {
          $range: [
            FIRST_MONTH,
            { $add: [{ $toInt: { $substrCP: [TODAY, 5, 2] } }, 1] },
          ],
        },
      },
    },
    {
      $addFields: {
        template_data: {
          $concatArrays: [
            {
              $map: {
                input: '$months1',
                as: 'm1',
                in: {
                  count: 0,
                  month_year: {
                    $concat: [
                      {
                        $arrayElemAt: [
                          MONTHS_ARRAY,
                          { $subtract: ['$$m1', 1] },
                        ],
                      },
                      '-',
                      '$start_year',
                    ],
                  },
                },
              },
            },
            {
              $map: {
                input: '$months2',
                as: 'm2',
                in: {
                  count: 0,
                  month_year: {
                    $concat: [
                      {
                        $arrayElemAt: [
                          MONTHS_ARRAY,
                          { $subtract: ['$$m2', 1] },
                        ],
                      },
                      '-',
                      '$end_year',
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    },
    {
      $addFields: {
        data: {
          $map: {
            input: '$template_data',
            as: 't',
            in: {
              k: '$$t.month_year',
              v: {
                $reduce: {
                  input: '$data',
                  initialValue: 0,
                  in: {
                    $cond: [
                      { $eq: ['$$t.month_year', '$$this.k'] },
                      { $add: ['$$this.v', '$$value'] },
                      { $add: [0, '$$value'] },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $project: {
        data: { $arrayToObject: '$data' },
        _id: 0,
      },
    },
  ])
    .exec()
    .then(async (data) => {
      const obj = {};
      obj.data = data;
      Binance.aggregate([
        {
          $match: {
            userId: String(userId),
            createdAtLocalTime: { $gte: MONTH_BEFORE, $lte: TODAY },
            totalVerificationCount: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: { year_month: { $substrCP: ['$createdAtLocalTime', 0, 7] } },
            count: { $sum: '$totalVerificationCount' },
          },
        },
        {
          $sort: { '_id.year_month': 1 },
        },
        {
          $project: {
            _id: 0,
            count: 1,
            month_year: {
              $concat: [
                {
                  $arrayElemAt: [
                    MONTHS_ARRAY,
                    {
                      $subtract: [
                        { $toInt: { $substrCP: ['$_id.year_month', 5, 2] } },
                        1,
                      ],
                    },
                  ],
                },
                '-',
                { $substrCP: ['$_id.year_month', 0, 4] },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            data: { $push: { k: '$month_year', v: '$count' } },
          },
        },
        {
          $addFields: {
            start_year: { $substrCP: [MONTH_BEFORE, 0, 4] },
            end_year: { $substrCP: [TODAY, 0, 4] },
            months1: {
              $range: [
                { $toInt: { $substrCP: [MONTH_BEFORE, 5, 2] } },
                { $add: [LAST_MONTH, 1] },
              ],
            },
            months2: {
              $range: [
                FIRST_MONTH,
                { $add: [{ $toInt: { $substrCP: [TODAY, 5, 2] } }, 1] },
              ],
            },
          },
        },
        {
          $addFields: {
            template_data: {
              $concatArrays: [
                {
                  $map: {
                    input: '$months1',
                    as: 'm1',
                    in: {
                      count: 0,
                      month_year: {
                        $concat: [
                          {
                            $arrayElemAt: [
                              MONTHS_ARRAY,
                              { $subtract: ['$$m1', 1] },
                            ],
                          },
                          '-',
                          '$start_year',
                        ],
                      },
                    },
                  },
                },
                {
                  $map: {
                    input: '$months2',
                    as: 'm2',
                    in: {
                      count: 0,
                      month_year: {
                        $concat: [
                          {
                            $arrayElemAt: [
                              MONTHS_ARRAY,
                              { $subtract: ['$$m2', 1] },
                            ],
                          },
                          '-',
                          '$end_year',
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        {
          $addFields: {
            data: {
              $map: {
                input: '$template_data',
                as: 't',
                in: {
                  k: '$$t.month_year',
                  v: {
                    $reduce: {
                      input: '$data',
                      initialValue: 0,
                      in: {
                        $cond: [
                          { $eq: ['$$t.month_year', '$$this.k'] },
                          { $add: ['$$this.v', '$$value'] },
                          { $add: [0, '$$value'] },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            data: { $arrayToObject: '$data' },
            _id: 0,
          },
        },
      ])
        .exec()
        .then(async (result) => {
          try {
            obj.verifyCount = result[0];
            const documentCount = await Binance.count({ userId });
            obj.documentCount = documentCount;
            res.status(200).json(obj);
          } catch (error) {
            console.log(error);
          }
        })
        .catch((err) => res.status(400).json('Something went wrong'));
    })
    .catch((err) => res.status(400).json('Something went wrong'));
};

exports.getBlockchainList = async (req, res, next) => {
  const page = parseInt(req.query.page);
  const limit = parseInt(req.query.limit);
  const skipIndex = (page - 1) * limit;
  let results = {};
  try {
    Binance.aggregate([
      {
        $match: {
          parent: null,
          userId: req.query.userId,
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
      { $skip: skipIndex },
      { $limit: limit },
      {
        $graphLookup: {
          from: 'binances',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parent',
          depthField: 'level',
          as: 'children',
        },
      },
      {
        $unwind: {
          path: '$children',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: {
          'children.level': 1,
        },
      },
      {
        $group: {
          _id: '$_id',
          transaction: { $first: '$transaction' },
          fileType: { $first: '$fileType' },
          userId: { $first: '$userId' },
          fileSize: { $first: '$fileSize' },
          mainFileId: { $first: '$mainFileId' },
          hash: { $first: '$hash' },
          totalVerificationCount: { $first: '$totalVerificationCount' },
          createdAtLocalTime: { $first: '$createdAtLocalTime' },
          isDocumentIssued: { $first: '$isDocumentIssued' },
          fileInfo: { $first: '$fileInfo' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
          parent: { $first: '$parent' },
          children: {
            $push: '$children',
          },
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
      // {
      //   $addFields: {
      //     children: {
      //       $reduce: {
      //         input: '$children',
      //         initialValue: {
      //           level: -1,
      //           presentChild: [],
      //           prevChild: [],
      //         },
      //         in: {
      //           $let: {
      //             vars: {
      //               prev: {
      //                 $cond: [
      //                   {
      //                     $eq: ['$$value.level', '$$this.level'],
      //                   },
      //                   '$$value.prevChild',
      //                   '$$value.presentChild',
      //                 ],
      //               },
      //               current: {
      //                 $cond: [
      //                   {
      //                     $eq: ['$$value.level', '$$this.level'],
      //                   },
      //                   '$$value.presentChild',
      //                   [],
      //                 ],
      //               },
      //             },
      //             in: {
      //               level: '$$this.level',
      //               prevChild: '$$prev',
      //               presentChild: {
      //                 $concatArrays: [
      //                   '$$current',
      //                   [
      //                     {
      //                       $mergeObjects: [
      //                         '$$this',
      //                         {
      //                           children: {
      //                             $filter: {
      //                               input: '$$prev',
      //                               as: 'e',
      //                               cond: {
      //                                 $eq: ['$$e.parent', '$$this._id'],
      //                               },
      //                             },
      //                           },
      //                         },
      //                       ],
      //                     },
      //                   ],
      //                 ],
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      // },
      // {
      //   $addFields: {
      //     children: '$children.presentChild',
      //   },
      // },
    ])
      .exec()
      .then(async (result) => {
        results.data = result;
        results.page = page;
        results.limit = limit;
        results.total = await Binance.count({
          userId: req.query.userId,
          parent: null,
        });
        res.status(200).json(results);
      });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Error Occured' });
  }
};

exports.getBlockchainFileDetails = async (req, res, next) => {
  try {
    const result = await Binance.findById(req.query.id);
    if (!result) res.status(400).json({ message: 'File not found' });
    res.status(200).json(result);
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: 'Something went wrong!' });
  }
};
exports.verifyDocument = async (req, res, next) => {
  const sha256Hasher = crypto.createHmac('sha256', process.env.SECRETKEY);
  let hash;
  try {
    hash = sha256Hasher.update(fs.readFileSync(req.file.path)).digest('hex');
    findRemoveSync(PATH, {
      age: { seconds: 10 },
      files: '*.*',
    });
  } catch (error) {
    console.log(error);
  }

  let result = await Binance.findOne({ hash });
  if (result) {
    await Binance.findByIdAndUpdate(
      { _id: result._id },
      { totalVerificationCount: result.totalVerificationCount + 1 }
    );
    try {
      // (async () => {
      //   try {
      //     findRemoveSync(verifyDir, {
      //       age: { seconds: 1800 },
      //       files: '*.*',
      //     });
      //   } catch (error) {
      //     console.log(error);
      //   }
      //   var verifyDir = `${dirname}/public/verify`;
      //   // console.log({ dir2 });
      //   try {
      //     fs.mkdirSync(verifyDir);
      //   } catch (e) {
      //     if (e.code != 'EEXIST') throw e;
      //   }

      //   const browser = await puppeteer.launch({
      //     args: ["--no-sandbox", "--disabled-setupid-sandbox"],
      //   });
      //   const page = await browser.newPage();
      //   await page.setViewport({
      //     width: 405,
      //     height: 800,
      //     deviceScaleFactor: 1,
      //   });
      //   await page.goto(`http://app.authentific.com.au.s3-website-us-west-2.amazonaws.com/mobile-verify-certificate?hash=${result.hash}&createdAt=${result.createdAt}&fileName=${result.fileName}&documentHolderName=${result.documentHolderName}&issueDate=${result.issueDate}&expireDate=${result.expireDate}&refNo=${result.refNo}`);
      //   await page.screenshot({path: `${verifyDir}/${result.fileName}.png`, format: 'a4'});
      //   await browser.close();
      //   const mobileScreenShot = 'verify/'+ result.fileName+'.png'
      //   console.log({result})

      // })();
      res.status(200).json({ success: true, hash: result.hash, info: result });
    } catch (error) {
      res.status(200).json({ success: false, hash: hash });
    }
  } else {
    res.status(200).json({ success: false, hash: hash });
  }
};

exports.appScreenshot = async (req, res, next) => {
  const hash = req.body.hash;
  try {
    const result = await Binance.findOne({ hash });
    if (result) {
      try {
        (async () => {
          try {
            findRemoveSync(verifyDir, {
              age: { seconds: 1800 },
              files: '*.*',
            });
          } catch (error) {
            console.log(error);
          }
          var verifyDir = `${dirname}/public/verify`;
          try {
            fs.mkdirSync(verifyDir);
          } catch (e) {
            if (e.code != 'EEXIST') throw e;
          }

          const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disabled-setupid-sandbox'],
          });
          const page = await browser.newPage();
          await page.setViewport({
            width: 405,
            height: 800,
            deviceScaleFactor: 1,
          });
          const link = `http://app.authentific.com.au.s3-website-us-west-2.amazonaws.com/mobile-verify-certificate?hash=${
            result.hash
          }&createdAt=${result.createdAt}&fileInfo=${JSON.stringify(
            result.fileInfo
          )}`;
          await page.goto(link);
          await page.screenshot({
            path: `${verifyDir}/authentific-${result._id}.png`,
            format: 'a4',
          });
          await browser.close();
          const mobileScreenShot =
            'verify/' + `authentific-${result._id}` + '.png';
          res
            .status(200)
            .json({ success: true, info: result, mobileScreenShot });
        })();
      } catch (error) {
        res.status(200).json({ success: false, hash: hash });
      }
    }
  } catch (error) {
    res.status(200).json({ success: false, msg: 'Something went wrong!' });
  }
};
exports.issueDocument = async (req, res, next) => {
  try {
    const result = await Binance.findByIdAndUpdate(ObjectId(req.query.id), {
      isDocumentIssued: true,
    });
    res.status(200).json(result);
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: 'Something went wrong!' });
  }
};

exports.downloadFromBlockchain = async (req, res, next) => {
  try {
    let accounts = await web3.eth.getAccounts();
    let defaultAccount = accounts[0];
    let ipfsFileHash = await verify.methods
      .getPdfLink(req.body.mainFileId)
      .call();
    res.status(200).json({ ipfsFileHash });
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: 'Something went wrong!' });
  }
};

exports.downloadFromGoogleDrive = async (req, res, next) => {
  const download = ({ name, url, fileInfo }) =>
    new Promise((resolve, reject) => {
      request({ url: url, encoding: null }, (err, res, buf) => {
        if (err) {
          reject(err);
          return;
        }
        if (res.headers['content-type'].includes('text/html')) {
          console.log(`This file (${url}) is not publicly shared.`);
          resolve(null);
          return;
        }
        const downloadedObj = {
          buffer: res.body,
          fileType: res.headers['content-type'],
          fileName: name,
          size: res.headers['content-length'],
          fileInfo,
        };
        // When you use the following script, you can save the downloaded image data as the file.
        // fs.writeFile(
        //   name,
        //   buf,
        //   {
        //     flag: 'a',
        //   },
        //   (err) => {
        //     if (err) reject(err);
        //   }
        // );

        resolve(downloadedObj);
      });
    });
  function getIdFromUrl(url) {
    return url.match(/[-\w]{25,}/);
  }
  try {
    const rows = req?.body?.rows;
    const driveObj = rows.slice(1).map((row) => {
      return {
        name: `${row[1]}`,
        url: `https://drive.google.com/uc?export=download&id=${getIdFromUrl(
          row[5]
        )}`,
        fileInfo: [
          { inputLabel: 'Document Name', inputValue: `${row[1]}` },
          { inputLabel: 'Document Holder Name', inputValue: `${row[2]}` },
          { inputLabel: 'Document Holder Email', inputValue: `${row[3]}` },
          { inputLabel: 'Document Number', inputValue: `${row[4]}` },
          { inputLabel: 'Issue Date', inputValue: `${row[0]}` },
        ],
      };
    });
    const buffers = await Promise.all(driveObj.map((obj) => download(obj)));
    const hasNull = buffers.some(function (v) {
      return v === null;
    });
    if (hasNull) {
      res.status(200).json({
        buffers: null,
        message: 'Some files are not publicly shared.',
      });
      return;
    }
    res.status(200).json({ buffers });
  } catch (error) {}
};
