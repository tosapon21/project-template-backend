'use strict';

const textRows = [
    ['COMMON', 'login', 'Login', 'เข้าสู่ระบบ'],
    ['COMMON', 'logout', 'Logout', 'ออกจากระบบ'],
    ['COMMON', 'admin', 'Admin', 'ผู้ดูแลระบบ'],
    ['COMMON', 'change_password', 'Change Password', 'เปลี่ยนรหัสผ่าน'],
    ['COMMON', 'user_info', 'User Info', 'ข้อมูลผู้ใช้'],
    ['COMMON', 'header_menu_home', 'Home', 'หน้าหลัก'],
    ['COMMON', 'header_language', 'EN', 'TH'],
    ['COMMON', 'password', 'Password', 'รหัสผ่าน'],
    ['COMMON', 'email', 'Email', 'อีเมล'],
    ['COMMON', 'sign_up', 'Sign Up', 'สมัครใช้งาน'],
    ['COMMON', 'forget_password', 'Forgot password', 'ลืมรหัสผ่าน'],
    ['COMMON', 'password_reset', 'Password Reset', 'รีเซ็ตรหัสผ่าน'],
    ['COMMON', 'password_reset_message', 'Enter your email to reset your password.', 'กรอกอีเมลเพื่อรีเซ็ตรหัสผ่าน'],
    ['COMMON', 'send_email', 'Send Email', 'ส่งอีเมล'],
    ['COMMON', 'login_name', 'Login Name', 'ชื่อผู้ใช้'],
    ['COMMON', 'confirm_password', 'Confirm Password', 'ยืนยันรหัสผ่าน'],
    ['COMMON', 'old_password', 'Old Password', 'รหัสผ่านเดิม'],
    ['COMMON', 'new_password', 'New Password', 'รหัสผ่านใหม่'],
    ['COMMON', 'success', 'Success', 'สำเร็จ'],
    ['COMMON', 'ok', 'OK', 'ตกลง'],
    ['PROFILE', 'select_file', 'Select File', 'เลือกไฟล์'],
    ['PROFILE', 'choose', 'Choose', 'เลือก'],
    ['PROFILE', 'back', 'Back', 'กลับ'],
    ['PROFILE', 'crop', 'Crop', 'ครอบตัด'],
    ['PROFILE', 'profile_img_update_success', 'Profile image updated.', 'อัปเดตรูปโปรไฟล์แล้ว'],
    ['PROFILE', 'profile_img_update_fail', 'Could not update profile image.', 'ไม่สามารถอัปเดตรูปโปรไฟล์ได้'],
    ['LOGIN', 'sign_up_complete', 'Sign up complete. Please check your email to approve your account before logging in.', 'สมัครใช้งานสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ'],
    ['LOGIN', 'login_page_description', 'Sign in to continue.', 'เข้าสู่ระบบเพื่อดำเนินการต่อ']
];

module.exports = {
    up: async (queryInterface) => {
        const now = new Date();
        const rows = textRows.flatMap(([type, tagName, enText, thText]) => ([
            {
                type,
                language_id: 1,
                tag_name: tagName,
                text: enText,
                createdAt: now,
                updatedAt: now
            },
            {
                type,
                language_id: 3,
                tag_name: tagName,
                text: thText,
                createdAt: now,
                updatedAt: now
            }
        ]));

        await queryInterface.bulkInsert('web_texts', rows, {});
    },

    down: async (queryInterface) => {
        await queryInterface.bulkDelete('web_texts', {
            tag_name: textRows.map(([, tagName]) => tagName)
        }, {});
    }
};
