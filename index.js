const express = require('express');
const checkNSFW = require('./checkNsfw'); // Import the function
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const ApiKey = require('./models/ApiKey'); // Import the ApiKey model

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected successfully.');
        // Seeding code removed
    })
    .catch(err => console.error('MongoDB connection error:', err));

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
app.post("/api/nsfw", async (req, res) => {
    try {
        console.log("Received /api/nsfw request");
        const { imgURLs, apiKey: providedKey } = req.body;
        // const TEST_API_KEY = "test-api-key-12345"; // Keep or remove test key as needed

        if (!providedKey) {
            console.log("API key missing");
            return res.status(401).json({ success: false, message: "Unauthorized: API key required" });
        }

        // Find the API key in the database
        const apiKeyDocument = await ApiKey.findOne({ key: providedKey });

        // --- Rate Limiting and Validation Logic ---
        if (!apiKeyDocument) {
            console.log(`API key not found: ${providedKey}`);
            return res.status(401).json({ success: false, message: "Unauthorized: Invalid API key" });
        }

        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const limits = { FREE: 1000, PRO: 50000 }; // ARONIX has no limit defined here
        let needsReset = false;
        let usageCountForCheck = apiKeyDocument.usageCount;
        let usagePeriodStartsAt = apiKeyDocument.usagePeriodStartsAt;

        // Check if the usage period needs resetting (first use or new month)
        if (!usagePeriodStartsAt || usagePeriodStartsAt < currentMonthStart) {
            needsReset = true;
            usageCountForCheck = 0; // Usage for the *new* period starts at 0
            usagePeriodStartsAt = currentMonthStart; // Tentatively set new start date
        }

        // Check validity (isActive, expiresAt) - Exclude ARONIX from expiration check
        if (!apiKeyDocument.isActive || 
            (apiKeyDocument.tier !== 'ARONIX' && apiKeyDocument.expiresAt && apiKeyDocument.expiresAt <= now)) {
             console.log(`Inactive or expired API key attempt: ${providedKey}`);
             return res.status(401).json({ success: false, message: "Unauthorized: Inactive or expired API key" });
        }

        // Check usage limit - Skip for ARONIX tier
        if (apiKeyDocument.tier !== 'ARONIX') {
            const limit = limits[apiKeyDocument.tier];
            if (limit === undefined) {
                // This handles FREE/PRO tiers explicitly defined in `limits`
                console.error(`Unknown limited tier '${apiKeyDocument.tier}' for key ${providedKey}`);
                return res.status(500).json({ success: false, message: "Internal server error: Invalid API key configuration" });
            }

            if (usageCountForCheck >= limit) {
                console.log(`Rate limit exceeded for key ${providedKey} (Tier: ${apiKeyDocument.tier}, Limit: ${limit}, Usage: ${usageCountForCheck})`);
                // Optionally, send rate limit headers
                // res.setHeader('Retry-After', /* calculate seconds until next month start */);
                // res.setHeader('X-RateLimit-Limit', limit);
                // res.setHeader('X-RateLimit-Remaining', 0);
                return res.status(429).json({ success: false, message: `Rate limit exceeded (${limit} requests per month for ${apiKeyDocument.tier} tier)` });
            }
        }
        // --- End Rate Limiting and Validation ---

        // If we passed all checks, proceed and update usage data asynchronously
        console.log(`Authorized with API key: ${providedKey} (Tier: ${apiKeyDocument.tier}, Usage this period: ${apiKeyDocument.tier === 'ARONIX' ? 'Unlimited' : usageCountForCheck + 1})`);

        // Update usage count and period only for limited tiers
        if (apiKeyDocument.tier !== 'ARONIX') {
            const updateOps = needsReset
                ? { $set: { usagePeriodStartsAt: currentMonthStart, usageCount: 1 } } // Reset count to 1
                : { $inc: { usageCount: 1 } }; // Increment count

            ApiKey.updateOne({ _id: apiKeyDocument._id }, updateOps)
                .exec() // Fire and forget
                .catch(err => console.error(`Failed to update usage data for key ${providedKey}:`, err));
        } else {
            // Optionally, still increment usageCount for ARONIX tier if you want to track total usage
            // ApiKey.updateOne({ _id: apiKeyDocument._id }, { $inc: { usageCount: 1 } }).exec().catch(...);
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
        // Use Promise.allSettled to handle individual image check failures gracefully
        const results = await Promise.allSettled(urlArray.map(url => checkNSFW([url]))); 

        const successfulResults = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);

        const failedResults = results
            .filter(result => result.status === 'rejected')
            .map((result, index) => ({ url: urlArray[index], error: result.reason.message }));

        // Consolidate results - decide how you want to structure the final response
        // Example: return combined results, or only successful ones, etc.
        // Here, we'll return a summary including any errors.
        const responsePayload = {
            success: true, // Overall success depends on your criteria, maybe if at least one succeeded?
            results: successfulResults, // Array of results for successful checks
            errors: failedResults       // Array of errors for failed checks
        };

        console.log("checkNSFW completed:", responsePayload);
        return res.status(200).json(responsePayload); // Send the consolidated results

    }
    catch (error) { // Catch errors from async operations like DB lookup
        console.error("General /api/nsfw error:", error);
        return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`isNSFW api running on http://localhost:${port}`)
})