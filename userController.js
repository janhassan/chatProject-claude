const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
require("dotenv").config();

// الاتصال بقاعدة البيانات
const db = require("../config/db"); // تأكد من إعداد الاتصال بشكل صحيح في config/db.js

// إنشاء Token
const createToken = (_id) => {
    const jwtkey = process.env.JWT_SECRET_KEY;
    return jwt.sign({ _id }, jwtkey);
}

// دالة التسجيل (Register)
const registerUser = async (req, res) => {
    try {
        // التأكد من وجود البيانات في body
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required..." });
        }

        // التحقق من وجود المستخدم في قاعدة البيانات
        const [existingUser] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: "User already exists..." });
        }

        // التحقق من صحة البيانات المدخلة
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: "Email must be a valid email..." });
        }
        if (!validator.isStrongPassword(password)) {
            return res.status(400).json({ message: "Password must be a strong password..." });
        }

        // تجزئة كلمة المرور
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // إدخال المستخدم في قاعدة البيانات
        const [result] = await db.execute('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);

        const token = createToken(result.insertId);

        // إرسال الاستجابة مع التوكن
        res.status(200).json({
            _id: result.insertId,
            name,
            email,
            token
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error during registration", error });
    }
}

// دالة تسجيل الدخول (Login)
const loginUser = async (req, res) => {
    try {
        // التأكد من وجود البيانات في body
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required!" });
        }

        // التحقق من وجود المستخدم في قاعدة البيانات
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];

        if (!user) return res.status(401).json({ message: "Invalid email or password!" });

        // مقارنة كلمة المرور
        const passwordMatched = await bcrypt.compare(password, user.password);
        if (!passwordMatched) return res.status(401).json({ message: "Invalid email or password!" });

        const token = createToken(user.id);

        // إرسال الاستجابة مع التوكن
        res.status(200).json({
            _id: user.id,
            name: user.name,
            email,
            token
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error during login", error });
    }
}

// دالة العثور على مستخدم باستخدام ID
const findUser = async (req, res) => {
    const userId = req.params.userId;
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
        const user = rows[0];

        if (!user) return res.status(400).json("This user doesn't exist!");

        res.status(200).json({ user });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error fetching user", error });
    }
}

// دالة جلب جميع المستخدمين
const getAllUsers = async (req, res) => {
    try {
        const [users] = await db.execute('SELECT * FROM users');
        res.status(200).json(users);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error fetching users", error });
    }
}

module.exports = { registerUser, loginUser, findUser, getAllUsers };
