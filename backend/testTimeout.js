const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const token = jwt.sign({ userId: "dummy", role: "admin" }, process.env.JWT_SECRET || "fallback", { expiresIn: "1d" });

const start = Date.now();
fetch("http://localhost:5000/api/users", {
    method: "POST",
    headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
        name: "Timeout Test User",
        email: "timeout" + Date.now() + "@gmail.com",
        phone: "1111111111",
        password: "password",
        role: "member",
        joinedAt: "2026-01-01"
    })
}).then(res => res.json()).then(data => {
    console.log("RESPONSE in", Date.now() - start, "ms:", data);
}).catch(err => {
    console.error("ERROR in", Date.now() - start, "ms:", err);
});
