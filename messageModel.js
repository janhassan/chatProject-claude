const db = require('../db'); 

// إعداد الاتصال بقاعدة البيانات
require("dotenv").config();
const pool = require('../db'); // will now use TLS





// استرجاع آخر 50 رسالة من غرفة معينة
async function getMessagesByRoom(room) {
    const [rows] = await db.query(
        "SELECT * FROM messages WHERE room = ? ORDER BY timestamp ASC LIMIT 50",
        [room]
    );
    return rows;
}

const getMessageById = async (id) => {
    const [rows] = await db.query('SELECT * FROM messages WHERE id = ?', [id]);
    return rows[0]; // إذا كانت الرسالة موجودة، ستُرجع أول صف
};

// حفظ الرسالة في قاعدة البيانات
const saveMessage = async (messageData) => {
    try {
        const [result] = await db.execute(
            `INSERT INTO messages 
            (username, room, text, mediaUrl, mediaType, replyToUsername, replyToText, timestamp) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                messageData.username,
                messageData.room,
                messageData.text || null,
                messageData.mediaUrl || null,
                messageData.mediaType || null,
                messageData.replyToUsername || null,
                messageData.replyToText || null,
                messageData.timestamp || new Date().toISOString()
            ]
        );
        return {
            id: result.insertId,
            ...messageData
        };
    } catch (err) {
        console.error('Error saving message:', err);
        throw err;
    }
};


module.exports = {
    getMessagesByRoom,
    getMessageById,
    saveMessage,
    pool // يمكن أيضًا تصدير الاتصال هنا إذا احتجت إليه في أماكن أخرى
};
