import express from 'express';
import path from 'path';
import fs from 'fs';
import db from '../server/models/index.js';

const router = express.Router();
const { User } = db.database1;
const defaultUserImage = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="80" fill="#e5e7eb"/>
  <circle cx="80" cy="58" r="34" fill="#6b7280"/>
  <path d="M28 142c7-31 27-48 52-48s45 17 52 48" fill="#6b7280"/>
  <circle cx="80" cy="80" r="77" fill="none" stroke="#cbd5e1" stroke-width="6"/>
</svg>`.trim());

const sendDefaultUserImage = (res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(defaultUserImage);
};

const sendUserImage = async (req, res, userId) => {
    if (!req.isAuth) return res.status(401).json({ message: 'Not authenticated' });

    let imgCode = req.body?.img_code;

    if (!imgCode) {
        const user = await User.findByPk(userId, { attributes: ['profile_img_code'] });
        imgCode = user?.profile_img_code;
    }

    if (!imgCode) return sendDefaultUserImage(res);

    const sanitized = path.basename(imgCode);
    const imagePath = path.join(process.cwd(), 'images', 'user', sanitized);

    if (!fs.existsSync(imagePath)) return sendDefaultUserImage(res);

    res.sendFile(imagePath);
};

router.post('/user_image', async (req, res) => {
    return sendUserImage(req, res, req.user_id);
});

router.post('/user_image/:id', async (req, res) => {
    return sendUserImage(req, res, req.params.id);
});

export default router;
