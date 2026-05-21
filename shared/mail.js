const getVerifyUrl = (token) => {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/$/, '');
    return `${frontendUrl}/verify-email?key=${encodeURIComponent(token)}`;
};

const getPasswordResetUrl = (token) => {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/$/, '');
    return `${frontendUrl}/reset-password?key=${encodeURIComponent(token)}`;
};

const sendMail = async ({ to, subject, text, html, logLabel, fallbackUrl }) => {
    if (!process.env.SMTP_HOST) {
        console.log(`[${logLabel}] Send to ${to}: ${fallbackUrl}`);
        return { sent: false, url: fallbackUrl };
    }

    try {
        const nodemailerModule = await import('nodemailer');
        const nodemailer = nodemailerModule.default || nodemailerModule;
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER
                ? {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD
                }
                : undefined
        });

        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject,
            text,
            html
        });

        return { sent: true, url: fallbackUrl };
    } catch (err) {
        console.error(`[${logLabel}] Failed to send to ${to}:`, err);
        console.log(`[${logLabel}] Fallback link for ${to}: ${fallbackUrl}`);
        return { sent: false, url: fallbackUrl };
    }
};

const sendVerificationEmail = async (email, token) => {
    const verifyUrl = getVerifyUrl(token);

    return sendMail({
        to: email,
        subject: 'Confirm your account',
        text: `Confirm your account by opening this link: ${verifyUrl}`,
        html: `<p>Confirm your account by opening this link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
        logLabel: 'email-verification',
        fallbackUrl: verifyUrl
    });
};

const sendPasswordResetEmail = async (email, token) => {
    const resetUrl = getPasswordResetUrl(token);

    return sendMail({
        to: email,
        subject: 'Reset your password',
        text: `Reset your password by opening this link: ${resetUrl}`,
        html: `<p>Reset your password by opening this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
        logLabel: 'password-reset',
        fallbackUrl: resetUrl
    });
};

export default { sendVerificationEmail, sendPasswordResetEmail, getVerifyUrl, getPasswordResetUrl };
