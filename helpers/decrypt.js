const crypto = require("crypto");
const algorithm = "aes-256-ctr";
const secretKey = process.env.SECRETKEY;
const iv = crypto.randomBytes(16);

exports.decrypt = (hash) => {
  const decipher = crypto.createDecipheriv(
    algorithm,
    secretKey,
    Buffer.from(hash.iv, "hex")
  );

  const decrpyted = Buffer.concat([
    decipher.update(Buffer.from(hash.content, "hex")),
    decipher.final(),
  ]);

  return decrpyted;
};
