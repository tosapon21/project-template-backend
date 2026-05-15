import express from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();

router.post('/user_image', async (req, res) => {
    if (!req.isAuth) return res.status(401).json({ message: 'Not authenticated' });

    const { img_code } = req.body;
    if (!img_code) return res.status(400).json({ message: 'Missing img_code' });

    const sanitized = path.basename(img_code);
    const imagePath = path.join(process.cwd(), 'images', 'user', sanitized);

    if (!fs.existsSync(imagePath)) return res.status(404).json({ message: 'Image not found' });

    res.sendFile(imagePath);
});

export default router;
