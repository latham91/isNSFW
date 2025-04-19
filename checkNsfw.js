const axios = require("axios");
const tf = require("@tensorflow/tfjs-node");
const nsfw = require("nsfwjs");

// Function to check a single image URL
async function checkSingleImage(imgURL) {
  try {
    const pic = await axios.get(imgURL, {
      responseType: "arraybuffer",
    });
    const model = await nsfw.load("InceptionV3");
    const image = await tf.node.decodeImage(pic.data, 3);
    const predictions = await model.classify(image);

    image.dispose();

    // Calculate probability for porn and hentai categories
    const pornPrediction = predictions.find(p => p.className === "Porn") || { probability: 0 };
    const hentaiPrediction = predictions.find(p => p.className === "Hentai") || { probability: 0 };

    return {
      url: imgURL,
      isNSFW: pornPrediction.probability > 0.5 || hentaiPrediction.probability > 0.5,
    };
  } catch (error) {
    return {
      url: imgURL,
      success: false,
      error: error.message
    };
  }
}

// Main function to check multiple URLs
module.exports = async function checkNSFW(imgURLs) {
  // If a single URL is provided, convert it to an array
  const urlArray = Array.isArray(imgURLs) ? imgURLs : [imgURLs];
  
  // Process all URLs in parallel
  const results = await Promise.all(
    urlArray.map(url => checkSingleImage(url))
  );
  
  return {
    totalProcessed: results.length,
    results: results
  };
}