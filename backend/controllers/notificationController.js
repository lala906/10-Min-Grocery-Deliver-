const Notification = require('../models/Notification');

const getNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        next(error);
    }
};

const markAsRead = async (req, res, next) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ message: 'Marked as read' });
    } catch (error) {
        next(error);
    }
};

module.exports = { getNotifications, markAsRead };
