/**
 * Models Index
 * Export all models from a single file
 */

const User = require('./User');
const UserProfile = require('./UserProfile');
const Conversation = require('./Conversation');
const Message = require('./Message');

module.exports = {
    User,
    UserProfile,
    Conversation,
    Message
};
