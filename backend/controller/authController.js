const User = require("../model/User");
const bcrypt = require("bcryptjs");
const crypto = require('crypto');
const generateTokenAndSetCookie = require('../utils/tokenAndCookie');
const {verificationEmail, verificationSuccessEmail, passwordResetEmail, passwordResetSuccessEmail} = require("../mail/mail");

const signup = async (req, res) => {
    const { email, password, name } = req.body;
    try {

        if (!name || !email || !password) {
            throw new Error("Please fill in all fields");
        } else {

            const existingUser = await User.findOne({ email });
            if (existingUser && existingUser.isVerified) {
                throw new Error("Email already exists and is verified");
            }

            if (existingUser && !existingUser.isVerified) {
                // User exists but is unverified, re-send verification email
                const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
                existingUser.verificationToken = verificationToken;
                existingUser.verificationTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
                await existingUser.save();

                await verificationEmail(existingUser.email, existingUser.verificationToken);
                return res.status(200).json({
                    success: true,
                    message: "Verification email re-sent. Please check your inbox."
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const verificationToken = Math. floor(100000 + Math. random()*900000).toString();

            const user =  new User({
                name,
                email,
                password: hashedPassword,
                verificationToken,
                verificationTokenExpiresAt : Date.now() + 24 * 60 * 60 * 1000
            })

            await user.save();

            generateTokenAndSetCookie(res,user._id);

            await verificationEmail(user.email,user.verificationToken);

            res.status(201).json({
                success: true,
                message: "User created successfully",
                user: {...user._doc, password: undefined}
            })
        }
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};

const verifyEmail = async(req,res) => {
    const { verificationToken } = req.body;
    const user = await User.findOne({
        verificationToken,
        verificationTokenExpiresAt: { $gt: Date.now() }
    })

    if(!user){
        return res.status(400).json({ success: false, message: "Invalid or expired verification"})
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;

    await user.save();
    await verificationSuccessEmail(user.name,user.email)

    res.status(200).json({success:true,message:"Account verification successfull"})
}

const login = async(req, res) => {
    try{
        const {email, password} = req.body;

        if (!email || !password) {
            throw new Error("Please fill in all fields");
        }

        const user = await User.findOne({email})
        if(!user){
          return res.status(400).json({success: false, message: "Email is not yet registered"});
        }
        if(!user.isVerified){
          return res.status(400).json({success: false, message: "Email is not yet verified. Please again signup!"});
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if(!isPasswordValid){
          return res.status(400).json({success: false, message: "Invalid password"});
        }

        generateTokenAndSetCookie(res,user._id);

        user.lastLogin = new Date();
        await user.save();

        res.status(200).json({success: true, message: "Login successful", user: {
            ...user._doc,
            password: undefined,
        }})
    } catch(e){
        res.status(400).json({success: false, message: e.message})
    }

};

const forgotPassword = async(req,res)=>{
    try{
        const {email} = req.body;

        const user = await User.findOne({email});
        if(!user){
            return res.status(400).json({success: false, message: "Email is not yet registered"});
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        const resetTokenExpiresAt = Date.now() + 15 * 60 * 1000; //

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiresAt = resetTokenExpiresAt;

        await user.save();

        await passwordResetEmail(user.email, user.resetPasswordToken);

        res.status(200).json({success: true, message: "Email sent to your mail id"})
    } catch(e){
        res.status(400).json({success: false, message: e.message})
    }
}

const resetPassword = async(req,res)=>{
    try{
        const {password, confirmPassword} = req.body;
        const {resetToken} = req.params;

        const user = await User.findOne({
            resetPasswordToken:resetToken,
            resetPasswordExpiresAt:{$gt:Date.now()}
        });

        if(!user){
            return res.status(400).json({success: false, message: "Invalid token or expired"});
        }
        if(password !== confirmPassword){
            return res.status(400).json({success: false, message: "Password does not match with confirm password"});
        }

        const hashedPassword = await bcrypt.hash(password,10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiresAt = undefined;
        await user.save();

        await passwordResetSuccessEmail(user.email, user.name);

        res.status(200).json({success: true, message: "Password reset successfully", data: user})
    } catch(e){
        res.status(400).json({success: false, message: e.message})
    }
}

const logout = (req, res) => {
  res.clearCookie("token");
  res.status(200).json({success: true, message: "Logged out successfully"});
};

const checkAuth = async(req,res)=>{
    const userId = req.userId;

    try{
        const user = await User.findById(userId).select("-password");
        if(!user){
            return res.status(401).json({success: false, message: "Unauthorized"});
        }
        res.status(200).json({success: true, user})
    } catch(e){
        res.status(400).json({success: false, message: e.message})
    }

}

module.exports = { signup, login, logout, verifyEmail, forgotPassword, resetPassword, checkAuth };
