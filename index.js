const express = require('express');
const checkNSFW = require('./checkNsfw'); // Import the function
const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js'); // Add Supabase import

// Load environment variables from .env file
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL and Key must be provided in .env file');
    process.exit(1); // Exit if Supabase credentials are not set
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Make Supabase client available (example: log to confirm)
console.log('Supabase client initialized.');

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

// Serve the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get("/api/health", (req, res) => {
    try {
        return res.status(200).json({ success: true, message: "Healthcheck passed" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Healthcheck failed" });
    }
});

// New endpoint to get API key from environment
app.get("/api/key", (req, res) => {
    try {
        // Check if SECRET environment variable exists
        if (process.env.SECRET) {
            return res.status(200).json({ success: true, apiKey: process.env.SECRET });
        } else {
            return res.status(404).json({ success: false, message: "API key not configured in environment" });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to retrieve API key" });
    }
});

// Check for nsfw images
app.post("/api/nsfw", (req, res) => {
    try {
        const { imgURLs, apiKey } = req.body;
        const TEST_API_KEY = "test-api-key-12345";
        
        // Validate API key - accept either environment variable or test key
        if (!apiKey || (apiKey !== process.env.SECRET && apiKey !== TEST_API_KEY)) {
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

// GitHub OAuth Login
app.get('/auth/github', async (req, res) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
    });

    if (error) {
        console.error('Error initiating GitHub OAuth:', error.message);
        return res.status(500).json({ success: false, message: 'Could not initiate GitHub login' });
    }

    // Redirect the user to GitHub's authorization page
    return res.redirect(data.url);
});

// Endpoint to provide public Supabase config to the frontend
app.get('/api/supabase-config', (req, res) => {
    res.json({
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_KEY // This is the public anon key
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});