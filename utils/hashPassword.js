const bcrypt = require('bcrypt');

async function hashPassword(password) {
    try {
        const saltRounds = parseInt(process.env.SALT_ROUNDS);
        if (isNaN(saltRounds)) {
            throw new Error('SALT_ROUNDS must be a valid number.');
        }
        const salt = await bcrypt.genSalt(saltRounds);
        const hash = await bcrypt.hash(password, salt);
        return hash;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    hashPassword
}