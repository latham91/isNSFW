const express = require('express');
const checkNSFW = require('./checkNsfw'); // Import the function
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3010;

app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Function to validate URL format
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

app.get("/api/health", (req, res) => {
    try {
        return res.status(200).json({ success: true, message: "Healthcheck passed" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Healthcheck failed" });
    }
});

// Check for nsfw images
app.post("/api/nsfw", (req, res) => {
    try {
        console.log("Received /api/nsfw request");
        const { imgURLs, apiKey } = req.body;
        const TEST_API_KEY = "test-api-key-12345";
        
        // Validate API key - accept either environment variable or test key
        if (!apiKey || (apiKey !== process.env.SECRET && apiKey !== TEST_API_KEY)) {
            console.log("Unauthorized API key attempt");
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        
        // Check if imgURLs is provided
        if (!imgURLs) {
            console.log("Missing imgURLs");
            return res.status(400).json({ success: false, message: "Image URLs are required" });
        }
        
        // Convert to array if single string is provided
        const urlArray = Array.isArray(imgURLs) ? imgURLs : [imgURLs];
        
        // Validate that we have at least one URL
        if (urlArray.length === 0) {
            console.log("Empty urlArray");
            return res.status(400).json({ success: false, message: "At least one image URL is required" });
        }
        
        // Validate URL formats
        const invalidUrls = urlArray.filter(url => !isValidUrl(url));
        if (invalidUrls.length > 0) {
            console.log("Invalid URLs found:", invalidUrls);
            return res.status(400).json({ 
                success: false, 
                message: "Invalid URL format", 
                invalidUrls 
            });
        }
        
        console.log(`Checking ${urlArray.length} images:`, urlArray);
        checkNSFW(urlArray)
            .then((result) => {
                console.log("checkNSFW successful:", result);
                return res.status(200).json({ success: true, ...result });
            })
            .catch((error) => {
                console.error("checkNSFW error:", error.message);
                return res.status(500).json({ success: false, message: error.message });
            });
    }
    catch (error) {
        console.error("General /api/nsfw error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(port, () => {
    console.log(`isNSFW api running on http://localhost:${port}`)
})