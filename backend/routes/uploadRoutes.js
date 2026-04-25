const path = require('path');
const express = require('express');
const multer = require('multer');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/'); // Stores files inside 'backend/uploads/' since node is run from backend dir
    },
    filename(req, file, cb) {
        cb(
            null,
            `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
        );
    },
});

function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Images only!'));
    }
}

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    },
});

router.post('/', protect, admin, upload.single('image'), (req, res) => {
    if (req.file) {
        res.json({
            status: 'success',
            message: 'Image uploaded successfully',
            data: `/${req.file.path.replace(/\\/g, '/')}`,
        });
    } else {
        res.status(400);
        throw new Error('No image uploaded');
    }
});

module.exports = router;
