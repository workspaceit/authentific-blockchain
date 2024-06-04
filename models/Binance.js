const mongoose = require('mongoose');
const binanceSchema = mongoose.Schema(
  {
    transaction: {
      blockHash: { type: 'string' },
      blockNumber: { type: 'number' },
      contractAddress: { type: 'string' },
      cumulativeGasUsed: { type: 'number' },
      from: { type: 'string' },
      gasUsed: { type: 'number' },
      status: { type: 'string' },
      to: { type: 'string' },
      transactionHash: { type: 'string' },
      transactionIndex: { type: 'number' },
      type: { type: 'string' },
    },
    fileType: {
      type: 'string',
      required: true,
    },
    userId: {
      type: 'string',
      required: true,
    },
    fileSize: {
      type: 'number',
    },

    mainFileId: {
      type: 'string',
      required: false,
      unique: true,
    },
    hash: {
      type: 'string',
    },
    totalVerificationCount: {
      type: 'number',
      default: 0,
    },
    createdAtLocalTime: {
      type: String,
      default: new Date().toISOString(),
    },
    isDocumentIssued: {
      type: Boolean,
      default: false,
    },
    fileInfo: [{}],
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Binance',
    },
  },

  {
    timestamps: true,
  }
);

module.exports = Binance = mongoose.model('binance', binanceSchema);
