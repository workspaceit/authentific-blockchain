const express = require('express');
const { blockchainController } = require('../controllers');
const { multer } = require('../config');

const router = express.Router();

router.post('/save-database', blockchainController.saveToDatabase);

router.patch('/save-database', blockchainController.updateToDatabase);

router.post('/get-blockchain-file', blockchainController.getBlockchainFile);

router.post('/get-file-database', blockchainController.getFileDatabase);

router.post(
  '/download-file-blockchain',
  blockchainController.downloadBlockchainFile
);

router.post(
  '/download-from-blockchain',
  blockchainController.downloadFromBlockchain
);

router.post(
  '/get-sha-256Hash',
  multer.upload.single('file'),
  blockchainController.getSha256Hash
);

router.get('/get-blockchain-list', blockchainController.getBlockchainList);

router.post(
  '/get-dashboard-document-count',
  blockchainController.getDashboardDocumentCount
);

router.get(
  '/get-blockchain-file-details',
  blockchainController.getBlockchainFileDetails
);

router.post(
  '/verify-document',
  multer.upload.single('file'),
  blockchainController.verifyDocument
);

router.post('/app-screenshot', blockchainController.appScreenshot);

router.post(
  '/download-from-google-drive',
  blockchainController.downloadFromGoogleDrive
);

router.get('/issue-document', blockchainController.issueDocument);

module.exports = router;
