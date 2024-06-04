const express = require('express');
const { ipfsController } = require('../controllers');
const { multer } = require('../config');

const router = express.Router();

router.post(
  '/upload-ipfs',
  multer.upload.single('file'),
  ipfsController.uploadIpfs
);

router.post(
  '/bulk-upload-ipfs',
  multer.upload.array('files'),
  ipfsController.bulkUploadIpfs
);

router.post(
  '/bulk-upload-ipfs-from-excel',
  multer.upload.array('files'),
  ipfsController.bulkUploadIpfsFromExcel
);

module.exports = router;
