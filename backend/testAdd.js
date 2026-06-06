const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    try {
        const User = require("./src/models/User").default;
        const { createInstallmentsForUser } = require("./src/controllers/installmentController");
        
        const user = await User.create({
            name: "Test User " + Date.now(),
            email: "test" + Date.now() + "@gmail.com",
            phone: "1234567890",
            password: "password",
            role: "member",
            joinedAt: new Date("2026-01-01")
        });
        console.log("User created:", user._id);
        
        await createInstallmentsForUser(user._id.toString());
        console.log("Installments created");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});
