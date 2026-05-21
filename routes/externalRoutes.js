import express from 'express';
import path from 'path';
import fs from 'fs';
import db from '../server/models/index.js';

const router = express.Router();
const { User } = db.database1;

const sendUserImage = async (req, res, userId) => {
    if (!req.isAuth) return res.status(401).json({ message: 'Not authenticated' });

    let imgCode = req.body?.img_code;

    if (!imgCode) {
        const user = await User.findByPk(userId, { attributes: ['profile_img_code'] });
        imgCode = user?.profile_img_code;
    }

    if (!imgCode) return res.status(404).json({ message: 'Image not found' });

    const sanitized = path.basename(imgCode);
    const imagePath = path.join(process.cwd(), 'images', 'user', sanitized);

    if (!fs.existsSync(imagePath)) return res.status(404).json({ message: 'Image not found' });

    res.sendFile(imagePath);
};

router.post('/user_image', async (req, res) => {
    return sendUserImage(req, res, req.user_id);
});

router.post('/user_image/:id', async (req, res) => {
    return sendUserImage(req, res, req.params.id);
});

export default router;
