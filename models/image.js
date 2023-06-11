const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  imageData: {
    type: Buffer,
    required: true
  },
  filetype: {
    type: String,
    required: true
  }
});

const Image = mongoose.model('Image', imageSchema);

module.exports = Image;
