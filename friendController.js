const friendModel = require('../Models/friendModel');

exports.sendRequest = async (req, res) => {
  const { requesterId, addresseeId } = req.body;
  try {
    await friendModel.sendFriendRequest(requesterId, addresseeId);
    res.json({ success: true, message: 'Friend request sent' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.respondRequest = async (req, res) => {
  const { requesterId, addresseeId, status } = req.body;
  try {
    await friendModel.respondToRequest(requesterId, addresseeId, status);
    res.json({ success: true, message: 'Friend request updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getFriends = async (req, res) => {
  const userId = req.params.userId;
  try {
    const friends = await friendModel.getFriendsList(userId);
    res.json({ success: true, friends });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
