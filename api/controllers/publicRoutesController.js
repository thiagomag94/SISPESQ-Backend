const path = require('path');

const getIndex = async (req, res) => {
    try {
      res.sendFile(path.join(__dirname, '/../public', '/index.html'));
    } catch (error) {
      res.status(500).send("Internal server error");
    }
  };
  
  const getUpload = async (req, res) => {
    try {
      res.sendFile(path.join(__dirname, '/../public', '/upload.html'));
    } catch (error) {
      res.status(500).send("Internal server error");
    }
  };
  
  module.exports = { getIndex, getUpload };