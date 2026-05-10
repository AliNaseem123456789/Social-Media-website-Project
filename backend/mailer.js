import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    // user: process.env.GMAIL_USER,      // Your Gmail address
    // pass: process.env.GMAIL_PASSWORD   // App password
  }
});


export default transporter;
