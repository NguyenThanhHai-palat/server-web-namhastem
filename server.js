const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const iconv = require("iconv-lite");
const bodyParser = require("body-parser");
const app = express();
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const port = 3000;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const atob = (base64) => Buffer.from(base64, 'base64').toString('binary');
const smtpTransporter = nodemailer.createTransport({ // SERVICE OTP REST PASS
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});
const LOG_FILE_PATH = path.join(__dirname, 'logs-vc2.json');

// PALAT PAYMENT : 4A8CA9
// PALAT ACCOUNT : E419CD
// PALAT MUSIC   : AC892S
// PALAT EXAM    : 290A29
// TESTAPP -O NHA: 298SCA
// PALAT STORE   : EU8291


app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
  res.header(
  "Access-Control-Allow-Headers",
  "Origin, X-Requested-With, Content-Type, Accept, Authorization"
);
  next();
});

//function of PALAT ACCOUNT
function id_generator(){
  const datea = Date.now()
  const kyTu = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let ketQua = '';
  for (let i = 0; i < 5; i++) {
    const viTriNgauNhien = Math.floor(Math.random() * kyTu.length);
    ketQua += kyTu[viTriNgauNhien];
  }
  
  const resulta = (Date.now()) % 1000+ kyTu[Math.floor(Math.random() * kyTu.length)] + "-"+Math.floor(Math.random()*100)+"-"+(datea%100+Math.floor(Math.random()*10000))+"-"+ketQua;
  return resulta
}
const SECRET = "krlc4541ab469930"; // api key of palat exam
const KEY_VALUE_ACCOUNT = "cal425c1cb46903d"; // api key of palat account

//E419CD


app.post("/service/user/register", async (req, res) => {
  const {name,data1,data2,service, email, password } = req.body;
  if (!email || !password) {
  return res.status(400).json({ message: "Thiếu dữ liệu" });
  }
  const iduser =  id_generator();
  const filePathx = path.join(
    __dirname,
    "account-service",
    "user.json"
  );
  let users = [];
    if (fs.existsSync(filePathx)) {
      users = JSON.parse(fs.readFileSync(filePathx));
    }
  const exist = users.find(u => u.email === email);
  if (exist) {
    return res.status(400).json({ message: "Email đã tồn tại" });
  }
  const hashed = await bcrypt.hash(password, 10);

  const newUser = {
    id: iduser,
    name,
    data1,
    data2,
    email,
    service,
    password: hashed
  };
  users.push(newUser);
  fs.writeFileSync(filePathx, JSON.stringify(users, null, 2));
  res.json({ message: "OK" });
});

app.post("/service/user/login", async (req, res) => {
  const { email, password,service } = req.body;
  const filePathx = path.join(
    __dirname,
    "account-service",
    "user.json"
  );
  let users = JSON.parse(fs.readFileSync(filePathx));
  const user = users.find(u => u.email === email && u.service ===service);
  if (!user) {
    return res.status(400).json({ message: "Email có thể sai hoặc chưa đăng ký hoặc mật khẩu sai." });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Email có thể sai hoặc chưa đăng ký hoặc mật khẩu sai." });
  }

  const token = jwt.sign({ id: user.id }, KEY_VALUE_ACCOUNT , {
    expiresIn: "30d"
  });

  res.json({ token });
});
 // E419CD : PALATEXAM
app.get("/service/user/checking", (req, res) => {
 

  const filePathx = path.join(
    __dirname,
    "account-service",
    "user.json"
  );
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Chưa đăng nhập" });
  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, KEY_VALUE_ACCOUNT);
    const users = JSON.parse(fs.readFileSync(filePathx));
    const user = users.find(u => u.id === decoded.id);

    const apiKey = req.headers['x-api-key'];
    res.json({ name: user.name,id: user.id, email: user.email, data1: user.data1, data2: user.data2 });
  } catch (err) {
    res.status(401).json({ message: "Token has expired." });
  }
}); // E419CD : PALATSEVICE

app.post("/service/user/forgot-password", async (req, res) => {
    try {
        const { email, service } = req.body;

        if (!email || !service) {
            return res.status(400).json({
                message: "Thiếu email hoặc service"
            });
        }
        const userFile = path.join(
            __dirname,
            "account-service",
            "user.json"
        );
        const resetFile = userFile
        const userData = await fs.promises.readFile(
            userFile,
            "utf8"
        );
        const users = JSON.parse(userData);
        const user = users.find(
            u =>
                u.email.toLowerCase() === email.toLowerCase() &&
                u.service === service
        );
        if (!user) {
            return res.json({
                message: "Nếu tài khoản tồn tại, mã xác nhận đã được gửi"
            });
        }
        let resetData = [];
        try {
            const resetRaw = await fs.promises.readFile(
                resetFile,
                "utf8");
            resetData = JSON.parse(resetRaw);
        } catch {
            resetData = [];
        }
        resetData = resetData.filter(
            r =>
                !(
                    String(r.userId) === String(user.id) &&
                    r.service === service
                )
        );
        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = crypto
            .createHash("sha256")
            .update(otp)
            .digest("hex");
        const expiresAt = Date.now() + 5 * 60 * 1000;

        resetData.push({
            userId: user.id,
            service: service,
            otpHash: otpHash,
            expiresAt: expiresAt,
            attempts: 0,
            used: false
        });

        await fs.promises.writeFile(
            resetFile,
            JSON.stringify(resetData, null, 2),
            "utf8"
        );
        await smtpTransporter.sendMail({
            from: process.env.SMTP_USER,
            to: user.email,
            subject: "Mã xác nhận đặt lại mật khẩu",
            text:
                `Mã xác nhận của bạn là: ${otp}\n\n` +
                `Mã có hiệu lực trong 5 phút.\n` +
                `Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.`
        });
        return res.json({
            message: "Nếu tài khoản tồn tại, mã xác nhận đã được gửi"
        });

    } catch (err) {
        console.error("Forgot password error:", err);

        return res.status(500).json({
            message: "Lỗi máy chủ"
        });
    }
});

app.post("/service/user/verify-reset", async (req, res) => {
    try {
        const { email, service, otp } = req.body;

        if (!email || !service || !otp) {
            return res.status(400).json({
                message: "Thiếu dữ liệu"
            });
        }

        const userFile = path.join(
            __dirname,
            "account-service",
            "user.json"
        );

        const resetFile = path.join(
            __dirname,
            "account-service",
            "reset.json"
        );

        const userData = await fs.promises.readFile(
            userFile,
            "utf8"
        );

        const users = JSON.parse(userData);

        const user = users.find(
            u =>
                u.email.toLowerCase() === email.toLowerCase() &&
                u.service === service
        );

        if (!user) {
            return res.status(400).json({
                message: "Mã xác nhận không hợp lệ"
            });
        }

        const resetRaw = await fs.promises.readFile(
            resetFile,
            "utf8"
        );

        let resetData = JSON.parse(resetRaw);

        const resetRequest = resetData.find(
            r =>
                String(r.userId) === String(user.id) &&
                r.service === service &&
                !r.used
        );

        if (!resetRequest) {
            return res.status(400).json({
                message: "Mã xác nhận không hợp lệ hoặc đã được sử dụng"
            });
        }

        // Kiểm tra hết hạn
        if (Date.now() > resetRequest.expiresAt) {
            resetData = resetData.filter(
                r => r !== resetRequest
            );

            await fs.promises.writeFile(
                resetFile,
                JSON.stringify(resetData, null, 2),
                "utf8"
            );

            return res.status(400).json({
                message: "Mã xác nhận đã hết hạn"
            });
        }

        // Giới hạn thử OTP
        if (resetRequest.attempts >= 5) {
            resetData = resetData.filter(
                r => r !== resetRequest
            );

            await fs.promises.writeFile(
                resetFile,
                JSON.stringify(resetData, null, 2),
                "utf8"
            );

            return res.status(429).json({
                message: "Bạn đã nhập sai quá nhiều lần"
            });
        }

        const otpHash = crypto
            .createHash("sha256")
            .update(String(otp))
            .digest("hex");

        if (otpHash !== resetRequest.otpHash) {

            resetRequest.attempts++;

            await fs.promises.writeFile(
                resetFile,
                JSON.stringify(resetData, null, 2),
                "utf8"
            );

            return res.status(400).json({
                message: "Mã xác nhận không đúng"
            });
        }

        /*OTP đúng.*/

        const resetToken = crypto.randomBytes(32).toString("hex");

        resetRequest.resetTokenHash = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        resetRequest.verified = true;

        // Token reset chỉ sống 10 phút
        resetRequest.resetTokenExpiresAt =
            Date.now() + 10 * 60 * 1000;

        /*
         * OTP dùng một lần:
         * đánh dấu used ngay sau khi xác nhận.
         */
        resetRequest.used = true;

        await fs.promises.writeFile(
            resetFile,
            JSON.stringify(resetData, null, 2),
            "utf8"
        );

        return res.json({
            message: "Xác nhận thành công",
            resetToken: resetToken
        });

    } catch (err) {
        console.error("Verify reset error:", err);

        return res.status(500).json({
            message: "Lỗi máy chủ"
        });
    }
});
app.post("/service/user/reset-password", async (req, res) => {
    try {
        const {
            email,
            service,
            resetToken,
            newPassword
        } = req.body;

        if (
            !email ||
            !service ||
            !resetToken ||
            !newPassword
        ) {
            return res.status(400).json({
                message: "Thiếu dữ liệu"
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                message: "Mật khẩu mới phải có ít nhất 8 ký tự"
            });
        }

        const userFile = path.join(
            __dirname,
            "account-service",
            "user.json"
        );

        const resetFile = path.join(
            __dirname,
            "account-service",
            "reset.json"
        );

        const userData = await fs.promises.readFile(
            userFile,
            "utf8"
        );

        const users = JSON.parse(userData);

        const user = users.find(
            u =>
                u.email.toLowerCase() === email.toLowerCase() &&
                u.service === service
        );

        if (!user) {
            return res.status(400).json({
                message: "Yêu cầu không hợp lệ"
            });
        }

        const resetRaw = await fs.promises.readFile(
            resetFile,
            "utf8"
        );

        let resetData = JSON.parse(resetRaw);

        const resetRequest = resetData.find(
            r =>
                String(r.userId) === String(user.id) &&
                r.service === service &&
                r.verified === true &&
                r.used === true
        );

        if (!resetRequest) {
            return res.status(401).json({
                message: "Token đặt lại mật khẩu không hợp lệ"
            });
        }
        if (
            !resetRequest.resetTokenExpiresAt ||
            Date.now() > resetRequest.resetTokenExpiresAt
        ) {
            return res.status(401).json({
                message: "Token đặt lại mật khẩu đã hết hạn"
            });
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        if (tokenHash !== resetRequest.resetTokenHash) {
            return res.status(401).json({
                message: "Token đặt lại mật khẩu không hợp lệ"
            });
        }

        // Hash password mới
        const hashedPassword = await bcrypt.hash(
            newPassword,
            12
        );

        user.password = hashedPassword;

        await fs.promises.writeFile(
            userFile,
            JSON.stringify(users, null, 2),
            "utf8"
        );
        resetData = resetData.filter(
            r => r !== resetRequest
        );

        await fs.promises.writeFile(
            resetFile,
            JSON.stringify(resetData, null, 2),
            "utf8"
        );

        return res.json({
            message: "Đặt lại mật khẩu thành công"
        });

    } catch (err) {
        console.error("Reset password error:", err);

        return res.status(500).json({
            message: "Lỗi máy chủ"
        });
    }
});
app.get("/api/data/register", async (req, res) => {
  res.sendFile(path.join(__dirname, "Web","service.js"));
});
//290A29
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Web","dang-ky-clb.html"));
} )
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});