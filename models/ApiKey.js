const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true, // Index for faster lookups
    },
    tier: {
        type: String,
        required: true,
        enum: ['FREE', 'PRO', 'ARONIX'], // Add ARONIX to allowed values
        default: 'FREE'
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    expiresAt: {
        type: Date,
        default: null, // null means never expires
    },
    usageCount: {
        type: Number,
        default: 0,
        required: true
    },
    usagePeriodStartsAt: { // Add field to track the start of the monthly period
        type: Date,
        default: null // Will be set on first use in a period
    }
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

// Method to check if the key is currently valid (active and not expired)
apiKeySchema.methods.isValid = function() {
    const now = new Date();
    return this.isActive && (!this.expiresAt || this.expiresAt > now);
};

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKey; 