const express = require('express');
const checkNSFW = require('./checkNsfw'); // Import the function
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3010;

app.use(express.json());

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
        const { imgURLs, apiKey } = req.body;
        // Validate API key
        if (!apiKey || apiKey !== process.env.SECRET) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        
        // Check if imgURLs is provided
        if (!imgURLs) {
            return res.status(400).json({ success: false, message: "Image URLs are required" });
        }
        
        // Convert to array if single string is provided
        const urlArray = Array.isArray(imgURLs) ? imgURLs : [imgURLs];
        
        // Validate that we have at least one URL
        if (urlArray.length === 0) {
            return res.status(400).json({ success: false, message: "At least one image URL is required" });
        }
        
        // Validate URL formats
        const invalidUrls = urlArray.filter(url => !isValidUrl(url));
        if (invalidUrls.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid URL format", 
                invalidUrls 
            });
        }
        
        checkNSFW(urlArray)
            .then((result) => {
                return res.status(200).json({ success: true, ...result });
            })
            .catch((error) => {
                return res.status(500).json({ success: false, message: error.message });
            });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});