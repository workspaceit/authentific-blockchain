const multer = require("multer");
var PATH = "uploads/";
let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PATH);
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now());
  },
});
exports.upload = multer({
  storage: storage,
});
